# Project history learning

Use for a due hint from close/session, an explicit history-review request, or enable/disable.
The main agent owns the review. No background service, telemetry or automatic shared-harness edit.
This route does not resume unrelated product tasks. Routine hints stay internal; tell the owner
only about a material finding, consequence, decision or obstacle affecting their work.

## Enable or disable

Default is off, including older installations. Explain the one-time choice when the owner asks:
bounded local analysis and factual project-memory upkeep; no outbound sharing, permission change
or paid eval campaign. A clear request to enable this scope is sufficient; never infer it from an
upgrade or a wish to finish the current task. No real installed project is enabled by this guide.

On that request, inspect HEAD, the working tree and existing settings. On first enablement obtain
the full baseline with `git rev-parse HEAD`, verify it is a commit on current ancestry, and save
exactly one of each field in `product/settings.md` in its own scoped documentation commit:

```text
History review: on
History review from: <full-baseline-commit>
```

Keep other settings and staged work. Record the baseline before this settings commit; do not use
the largest change number or silently import old history. An existing valid baseline is retained
on re-enable; ambiguous/missing/diverged history needs an explicit owner decision about the scope,
never a silent reset. To disable, set only `History review: off`; keep the baseline, records and drafts.
Close commits must carry that same unique baseline in their committed settings. Old sibling closes
without it are excluded even if merged later. Keep `from` through off/on: disabling stops reviews;
re-enabling the same scope can include closes made while off.
An explicit bounded request to examine older history is separate from this automatic post-baseline
queue: preserve its scope and sources without changing the baseline or pretending the helper selected it.

## Discover and schedule

After a successful local close, finish any failed-push recovery and already requested delivery
first. On resume use the session hint. Advice/status, urgent product work, immediate containment
of a severe failure and stop/pause instructions take precedence. Do not offer publication because
learning is due. Run at most one automatic batch per session, including across close/session hints;
keep that session fact in working context. No catch-up loop or timer. If interrupted, the next
session rediscovers committed state; drafts acknowledge nothing.

Run the read-only helper and retain its exact snapshot and input pairs:

```sh
sh .vibeproof/checks/learning pending
# Only on an explicit smaller-batch request or a justified explicit deferred retry:
sh .vibeproof/checks/learning pending --force
```

Its fields are `Mode: off|idle|due|unknown`, `Snapshot: <full-HEAD>`, `Pending: <count>`,
`Deferred: <count>`, and repeated `Input: C-<n> <full-close-commit>` lines when due. Unknown counts
can be `unknown`. Exit 0 means valid discovery, including off/idle; exit 3 means unreadable or
ambiguous state. `off` stops this route; `idle` has no automatic work. `unknown` never means clean:
inspect the stated cause and preserve it without blocking product work or inventing inputs.
No model, edit, transport or semantic verdict happens in the helper.

Five eligible closes trigger a batch; an uncovered report marked urgent can trigger earlier.
Raw urgency only schedules examination, never proves severity. At most five inputs are selected,
urgent first, then stable Git order; the rest stay pending. `--force` also makes deferred inputs
eligible and allows fewer than five. It never enables off, imports pre-baseline history or repeats
completed analysis. Missing settings do not opt in. A manual folder move is not a genuine close.

## Examine one bounded batch

Read from the selected committed snapshot, first at most five closed report sections, up to 2,000
characters each. Do not silently truncate a source and call it examined. Then read only the cited
log/review excerpts needed: at most two source expansions, up to 4,000 characters each. Characters
are not tokens. Missing local logs, unavailable sources and insufficient limits remain unknown;
record partial analysis and a bounded investigation/retry condition instead of inventing evidence.
Do not copy raw private transcripts. Keep environment, model and harness-version differences.

Give one fresh existing strong-tier `vibeproof-reviewer` the selected source material and review
question, without the author's proposed verdict, reasoning or conversation. Start it using
[subagents](../../vibeproof-build/references/subagents.md). Request evidence-based findings and
unknowns; the main agent checks them and owns routing. No fresh reviewer available: record
main-context analysis and that limitation. A read-only role instruction does not establish host
isolation. This is one reviewer for the batch, not another reviewer for every close.

Check existing rules, applied fixes and rejected proposals before assigning a cause. Distinguish
an existing recipe being skipped from missing knowledge. Count distinct tasks, not repeated commands
within one task. Two similar cases justify investigation; one severe counterexample can justify a
correction. Expected first red tests, planned product decisions, outages and changed wishes are
not automatically process failures. `none observed` requires available evidence; unknown is not zero.

Prepare at most three candidates and validate at most one by expected impact. No mandatory new rule.
For each, retain observations and sources; proposed cause and alternatives; scope; existing rule
checked; proposed change; validation and possible harm; disposition and later observations.
Use plain dispositions: proposed, validated, adopted / observing, observed useful, rejected or
withdrawn. Rejection keeps its reason so the next batch does not recreate it without new evidence.

Route findings within existing authority:

- Proven missing project facts or a safe recipe: update the existing operations/architecture/decision
  source with evidence, within enabled factual-upkeep consent and existing permissions. Supersede
  prior decisions explicitly; never rewrite historical assent.
- New procedural advice: keep a scoped candidate in this record until validated with a case where
  it changes the next action and a counterexample where it must not apply. Adopt in relevant
  operations only after that validation, with its limits and expected observable outcome.
- Code, tests, helpers, dependencies or guarded settings: queue an ordinary change linked to this
  finding; follow change/design/build/finish and existing agreement. Product behavior, cost, data
  flows, access or outside commitments remain owner decisions. Learning does not grant guard-ok.
- Shared harness/skill/install/host defect: prepare the local maintainer draft below. Leave installed
  harness files unchanged; use only a valid local workaround within existing authority.

Project knowledge cannot override agreement, harness guards, permissions or publishing rights.
Never weaken a check or agreed test. A material claim about better agent behavior needs isolated
old/candidate runs, including an unseen case and repeated trials where variation matters, under a
separately agreed cost/access ceiling. No automatic full suite, live repair or paid campaign here.
Without that evidence keep the proposal unvalidated; reviewer agreement is not an eval.

## Record and save

Use one project record, `product/learning.md`, created with the first review. No per-task ledger,
receipt or duplicate decision log. Each review has a unique heading and these exact field forms:

```text
## Review <unique-id>
Snapshot: <full-commit-before-analysis>
Analysis: complete
Input: C-<n> <full-close-commit>
Input: C-<n> <full-close-commit>
```

Use one Input per distinct selected task, with its exact close commit, not the report's last edit.
For partial analysis replace `Analysis: complete` with `Analysis: partial` and add `Retry: manual`.
Include gaps, findings/disposition, source references, reviewer limitation if any, available
time/model usage (unknown otherwise), and follow-up/retry conditions below those fields.
Complete may conclude no actionable pattern or examined/unknown, with uncertainty retained.
Partial acknowledges no complete analysis and defers its inputs from automatic selection, letting
unrelated inputs proceed. Retry only explicitly with `--force` when justified by a request or new
evidence. A later complete review supersedes those inputs' deferral. Unselected tasks remain pending.

Only committed HEAD acknowledges a record. The helper validates schema, genuine closes, snapshot
and input ancestry. Malformed fields, missing/foreign inputs and conflicting state yield unknown;
do not rewrite history to manufacture a clean result. Before applying or saving, reread HEAD and
the current learning file. Deduplicate overlapping input sets, reuse already committed analysis,
preserve distinct concurrent observations and do not reapply a proposal another session applied.
If HEAD changed, reconcile sources against the new helper result before acting; ambiguity stops
learning, not product work.

Save only owned paths in a normal project documentation commit. Inspect the index and diff; never
sweep unrelated staged work (`git commit --only -- <owned-paths>` where appropriate). Keep actionable
deferred investigation in `product/queue.md` linked here. On commit refusal preserve the draft, fix
the stated cause and resume without duplicate entries; the draft acknowledges nothing. A successful
local commit is completion even if push fails. Recover normal sync, fetch and integrate concurrent
work, retry only the push before more learning; never force-push or run another analysis to fix sync.
After the local documentation commit, rerun `sh .vibeproof/checks/learning pending` to verify accepted
coverage/deferral and no unknown; this is a saved-result check, not another batch. If your fields
are malformed, fix only those fields without repeating analysis or changing other entries.

## Observe use

An adopted/observing operations recipe links its learning entry, applicability, limits and expected
observable outcome. Change/design/build read just the relevant recipe and link; do not load this
whole history at every task start. During each of the next three applicable tasks, finish records
in its ordinary report: applicability, whether actually used, outcome/recurrence and source evidence,
or unknown. No applicable task means still observing; missing signals do not prove successful use.
Do not start unrelated tasks to obtain evidence. The next bounded batch aggregates available
observations for up to those three eligible tasks. Retain, revise or withdraw on evidence; diagnose
recurrence before adding a second rule. Withdraw harmful advice without reverting unrelated work.

## Local maintainer draft

Write only `$(git rev-parse --git-path vibeproof-support)/<finding>.md`, outside tracked product
files. Keep private provenance links in the project learning entry, separate from the shareable
draft. Use a minimal synthetic reproduction with fake values and sanitized output, never whole
logs, credentials, private URLs, customer data or conversations. A scanner does not anonymize text.
If a synthetic reproduction cannot preserve the defect, mark not reproducible instead of exporting
more private evidence.

Draft fields: summary/impact; installed harness commit; host/model/OS; expected/observed behavior;
safe fixture/steps; minimal sanitized output; relevant existing instruction; reproduction status;
local workaround. Mark each unavailable field unknown. A rejected attribution does not erase the
observation. Draft preparation is not submission, a maintainer fix or an installed update.

There is no default recipient or transport. Before any send, show the exact outgoing content and
verify the destination, recipient and visibility, then obtain an explicit instruction to send that
content there. This mode authorizes no message, upload, issue creation or telemetry. Check whether
submission already succeeded before retrying; record a verified submission reference locally to
prevent duplicates. Changed content or destination needs new assent. If declined, retain the local
draft and that choice; do not nag or submit later automatically.
