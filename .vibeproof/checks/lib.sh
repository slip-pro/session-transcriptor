# Vibeproof check scripts: shared helpers. Sourced, never run directly.
#
# Portability: POSIX sh plus what Git ships on every OS (sed, awk, grep). No jq, Python or Node,
# no pipefail. A check that can't run refuses with VP-CANT-CHECK; it never passes silently.
#
# Formats read from the person's project (BD-42):
#   product/changes/<id>/brief.md   "Status: draft|agreed", "Agreed: ...", "Size: small change|feature",
#                                   scenario lines "- add|change|remove S-<area>-<k>: ... — test: <path> › <name>"
#   product/changes/<id>/design.md  a "## Review" heading once the design is reviewed
#   product/capabilities/<area>.md  scenario lines "- S-<area>-<k>: ... — test: <path> › <name>"
#   product/settings.md             "secret-ok: <path> <blob> — <reason>", "guard-ok: <path> — <effect> — ..."
#   product/operations.md           "Live branch: <name>" (default main)
#   .vibeproof/installed-files      harness files, one path per line

VP_REFUSED=0

# Advisory only: discovery failures never change the caller's result.
vp_learning_hint() {
  learning_result=$(sh .vibeproof/checks/learning pending 2>/dev/null)
  learning_rc=$?
  learning_mode=$(printf '%s\n' "$learning_result" | sed -n 's/^Mode: //p')
  if [ "$learning_rc" -ne 0 ]; then
    printf 'VIBEPROOF LEARNING: history review state unknown; continue product work and inspect checks/learning pending.\n'
  elif [ "$learning_mode" = due ]; then
    printf 'VIBEPROOF LEARNING: history review due; finish requested delivery first, then at most one bounded batch this session.\n'
    printf '%s\n' "$learning_result"
  fi
  return 0
}

vp_git() {
  git -c core.quotepath=off "$@"
}

# Print a refusal in plain words. The agent reports these lines as they are.
vp_refuse() {
  printf 'VIBEPROOF REFUSED %s: %s\n' "$1" "$2" >&2
  VP_REFUSED=1
}

vp_cant_check() {
  printf 'VIBEPROOF REFUSED VP-CANT-CHECK: %s\n' "$1" >&2
  exit 3
}

vp_check_paths() {
  case "$1" in
    \"*) vp_cant_check "a file name git had to quote: $1" ;;
  esac
}

# Fingerprint of a path as staged in the index; empty if not staged.
vp_index_hash() {
  vp_git ls-files -s -- "$1" | awk 'NR==1 { print $2 }'
}

# Open changes in the index: product/changes/<id>/..., except closed/.
vp_open_changes() {
  vp_git ls-files -- product/changes/ |
    awk -F/ 'NF >= 4 && $3 != "closed" { print $3 }' | sort -u
}

# Value of the first "<key>: <value>" line on stdin, keys compared case-insensitively.
vp_field() {
  awk -v key="$1" '
    { sub(/\r$/, "") }
    tolower(substr($0, 1, length(key) + 1)) == tolower(key) ":" {
      v = substr($0, length(key) + 2); sub(/^[[:space:]]+/, "", v); sub(/[[:space:]]+$/, "", v); print v; exit
    }'
}

# A brief's status from its text on stdin: agreed, draft, or empty.
vp_status() {
  vp_field Status | awk '{ print tolower($1) }'
}

# Scenario lines on stdin, from a capability file or a brief, as "<id> <test path>".
# A scenario without a test prints its id and "-".
vp_scenario_tests() {
  awk '
    { sub(/\r$/, "") }
    /^- (add |change |remove )?S-[A-Za-z0-9-]+-[0-9]+:/ {
      line = $0; sub(/^- (add |change |remove )?/, "", line)
      id = substr(line, 1, index(line, ":") - 1)
      path = "-"
      t = index(line, "test: ")
      if (t) { path = substr(line, t + 6); s = index(path, " \342\200\272"); if (s) path = substr(path, 1, s - 1); sub(/[[:space:]]+$/, "", path) }
      print id " " path
    }'
}

# Scenario ids a brief on stdin changes or removes.
vp_brief_reopens() {
  awk '{ sub(/\r$/, "") } /^- (change|remove) S-[A-Za-z0-9-]+-[0-9]+:/ { id = $3; sub(/:$/, "", id); print id }'
}

# Lines "<key>: <path> — ..." in settings text on stdin, printing the path.
vp_setting_paths() {
  awk -v key="$1" '
    { sub(/\r$/, "") }
    index($0, key ": ") == 1 { p = substr($0, length(key) + 3); s = index(p, " \342\200\224"); if (s) p = substr(p, 1, s - 1); sub(/[[:space:]]+$/, "", p); print p }'
}

# Vibeproof's own installed paths outside .vibeproof/: skills, agents, the push workflow and an
# in-project commit-msg hook. Used wherever a new path may count as harness rather than code.
vp_harness_path() {
  case "$1" in
    \"*) return 1 ;;
    .agents/skills/vibeproof-*/*|.claude/skills/vibeproof-*/*|.claude/agents/vibeproof-*|.codex/agents/vibeproof-*) return 0 ;;
    .github/workflows/vibeproof.yml|.husky/commit-msg|.githooks/commit-msg) return 0 ;;
  esac
  return 1
}

# Settings, agent and MCP configuration, lockfiles: changed only with guard-ok (BD-42).
vp_project_guarded() {
  case "$1" in
    .claude/settings*.json|.codex/config.toml|.mcp.json|mcp.json|.vscode/mcp.json) return 0 ;;
    package-lock.json|npm-shrinkwrap.json|yarn.lock|pnpm-lock.yaml|bun.lock|bun.lockb|Cargo.lock|Gemfile.lock|poetry.lock|uv.lock|Pipfile.lock|composer.lock|go.sum|*/package-lock.json|*/npm-shrinkwrap.json|*/yarn.lock|*/pnpm-lock.yaml|*/bun.lock|*/bun.lockb|*/Cargo.lock|*/Gemfile.lock|*/poetry.lock|*/uv.lock|*/Pipfile.lock|*/composer.lock|*/go.sum) return 0 ;;
  esac
  return 1
}

vp_secret_content() {
  LC_ALL=C grep -a -E -q -- '-----BEGIN (RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----|(^|[^A-Za-z0-9_])(gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}|[sr]k_(live|test)_[A-Za-z0-9]{24,}|sk_org_[A-Za-z0-9]{24,})([^A-Za-z0-9_]|$)' "$1"
}

# Prints the value of a "<key>: <value>" line in a file, or nothing.
vp_line_value() {
  [ -f "$2" ] || return 0
  vp_field "$1" < "$2"
}

# Explicit project deployment branch; main is the default.
vp_live_branch() (
  count=$(grep -c '^Live branch:' product/operations.md 2>/dev/null) || count=0
  [ "$count" -le 1 ] || vp_cant_check 'multiple Live branch entries in product/operations.md'
  branch=$(vp_line_value 'Live branch' product/operations.md)
  if [ "$count" = 0 ]; then branch=main; fi
  case "$branch" in ''|work|vibeproof-check|refs/*|-*) vp_cant_check 'invalid Live branch in product/operations.md' ;; esac
  git check-ref-format "refs/heads/$branch" >/dev/null 2>&1 || vp_cant_check 'invalid Live branch in product/operations.md'
  printf '%s\n' "$branch"
)

vp_fetch() {
  heads=$(git ls-remote -q --heads origin 2>/dev/null) || return 1
  fetch_live=$(vp_live_branch) || return 1
  for b in "$fetch_live" work; do
    if printf '%s\n' "$heads" | cut -f2 | grep -Fxq "refs/heads/$b"; then
      git fetch -q origin "+refs/heads/$b:refs/remotes/origin/$b" 2>/dev/null || return 1
    fi
  done
  return 0
}
