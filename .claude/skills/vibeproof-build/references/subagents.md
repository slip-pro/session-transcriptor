# Starting a Vibeproof subagent

The tiers come from BD-43: builder on the working tier, reviewer on the strong tier, scout on the fast
tier. Each agent starts fresh, without this conversation.

- **Claude Code:** start the agent by name (`vibeproof-builder`, `vibeproof-reviewer`,
  `vibeproof-scout`); its file in `.claude/agents/` sets the model.
- **Codex:** select the custom agent in the spawn tool. If the tool has no custom-agent selector, read
  `.codex/agents/<name>.toml` and pass its model, effort and instructions explicitly to a fresh agent
  without conversation inheritance (`fork_turns="none"` where supported). A task name alone doesn't
  load the file.
- Keep the capability limits the host supports; say which it can't apply. Read-only instructions
  are not a sandbox.
- If the model can't be selected, say so instead of silently using the main model.

**What the agent returns** is a summary, not raw material:
- what it changed or found;
- each command with its pass/fail counts;
- failure excerpts of at most about 40 lines;
- paths of the full logs, saved under `$(git rev-parse --git-path vibeproof-logs)/`.

Ask it for that shape in the handoff. Read its full logs only for the part you need.
