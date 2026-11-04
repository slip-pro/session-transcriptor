---
name: vibeproof-finish
description: Finish a shown and accepted change in a Vibeproof project — update product memory, run final checks, review features, report and save to work. Use after acceptance or to resume accepted work. Also handle an enabled project's due or explicitly requested bounded history review.
---

# Vibeproof: check, report, save

Enter after the person accepted the shown result. Exit with the change saved to `work` and a short
report. Saving is not publishing.
For a due or requested history review, use [history learning](references/history-learning.md)
directly; it never resumes other product work or enables the mode by itself.

## 1. Bring product memory up to date

Before the final run, so the checks cover what will be saved:

- Write the agreed scenarios into `product/capabilities/<area>.md` as `- S-<area>-<k>: <behaviour> —
  test: <path> › <name>`. Remove or replace scenarios as the brief says.
- Put the design's "Decisions to keep" into `product/decisions/` as numbered files, naming any
  decision they replace. Update glossary, operations or architecture notes only where their meaning
  changed. A task's "won't do" is not a permanent ban unless it was agreed as one.
- Update the README, setup commands and config examples the change affects.
- Queue anything observed but not done in `product/queue.md`, with its reason and next step.
- Read only the task's relevant operations recipe and its adopted/observing learning links. Record
  applicability, actual use, outcome/recurrence and evidence in this report, or unknown. See
  [history learning](references/history-learning.md#observe-use) for the next three applicable tasks.
- Commit all of this with the code. Never edit closed changes or earlier decisions.

## 2. Final checks

Choose the smallest set of checks that settles each promised result and catches plausible regressions
in what you touched. Run them on the committed work. For a feature, hand the list to a working-tier
agent (as in [subagents](../vibeproof-build/references/subagents.md)), which runs them and returns
counts, failure excerpts and log paths. Long runs such as a full suite or a build stay out of this
conversation either way.

- No automatic full suite. Run a clean install only if dependencies changed. A real observation of
  the page can be enough for a text change.
- Act out each scenario as the person would. For visible work, check phone and desktop widths,
  states and keyboard use. Browser checks fail on console errors and stop their own server.
- For a public site meant to be found, follow [public pages](../vibeproof-build/references/public-pages.md).
- For a browser product, scan the fresh build output for secrets with `sh .vibeproof/checks/secrets bundle`.
- Use non-secret inputs: commands can read ignored local files and credentials. Keep raw output and
  screenshots local.
- A failed relevant check blocks success: fix it and rerun only what changed, at most three rounds.
  A failure outside the task is kept with its evidence and queued. Call it "pre-existing" only if you
  saw it before the change. It doesn't block.
- Compare the files you touched with their state before the change, using the project's own
  linters or analysers if it has them. Fix accidental worsening. Worsening the agreed problem
  inherently needs is a decision for the person.
- Run every test this change added or changed together, once, on the final commit, even if each
  already passed in its own slice. Shared fixtures and state break in combination: one change's
  245 new browser cases passed only piece by piece. This is not the project's whole old suite.
- Stop when the checks have answered. Note what you couldn't run, and why.

## 3. Implementation review (features only)

Give one fresh read-only agent on the strong tier (`vibeproof-reviewer`) the brief, design, the full
diff with base and reviewed commit, the tests, every warning and the real check results, including what was unavailable. Add the unchanged
code it needs to judge, plus the [reviewer checklist](../vibeproof-build/references/reviewer-checklist.md).
Give it no conversation, no reasoning, no credentials. It reads; it doesn't run anything live.

Start it as in [subagents](../vibeproof-build/references/subagents.md).

Judge findings against the checklist's proportionality rule before changing code. Reject incorrect
findings and unnecessary hardening with a short reason; reviewer severity alone does not justify
extra work. Turn confirmed blockers into fixes, each starting with a failing test. Re-review only
the fix diffs. Stop and tell the person if blockers aren't decreasing.
If no fresh agent is available, say so in the report. Your
own review doesn't count as one. Small changes get no review stage. A code change after the review
needs a follow-up review of that change.

## 4. Report

In chat, short, in their language:

```
I couldn't check: <what and why — or "Everything below was checked.">
What changed: <one or two sentences>
Try it: <link or exact place>
- <scenario in their words> — you should see <…> — checked by <test, or "I tried it">
changelog: <one line in their words>
```

Every claim points to something that ran. For a repair, add the cause, the before/after evidence
and, if an earlier change let it through, which one. Save the same text as
`product/changes/C-<n>/report.md`.
Below that short report, add `## Learning signals`: observed avoidable rework, review-caught defects,
owner rescue or missing context, what resolved it, and source sections/commits with paths valid after
close. Use `none observed` or `unknown: <missing evidence>` honestly; expected red tests, planned
decisions and changed wishes are not process failures. Add `Learning urgency: normal|urgent|unknown`;
urgent schedules observed severe control/privacy failures and does not prove severity. Keep raw
private transcripts out. Include the applicable proposal observations from §1.

If the result is unchanged since they accepted it, passing checks need no new "yes". Compare the
actual content, not file names. If something they would notice changed, or a new limitation
appeared, show it and settle it first. "Looks good, except…" is feedback for `vibeproof-build`.

## 5. Save

```
sh .vibeproof/checks/close C-<n>
```

It moves the change to `product/changes/closed/`, adds the changelog line, commits only its own
paths and pushes to `work`.

- On `VIBEPROOF REFUSED`, read which step failed and fix that cause. Nothing else was touched, so
  rerun the same command.
- If only the push failed, the work is safe locally. Say so and run `git push origin HEAD:work` before the
  next change.

Then say where the work actually is: saved on `work`, not live. If they asked for delivery
earlier, continue with `vibeproof-publish`; otherwise don't offer it.
After saving, push recovery and any requested delivery, consume a due hint through
[history learning](references/history-learning.md). At most one automatic batch per session; advice,
status, urgent product work and the person's stop/pause take precedence. Routine hints stay internal.
