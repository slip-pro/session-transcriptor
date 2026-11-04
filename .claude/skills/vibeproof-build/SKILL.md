---
name: vibeproof-build
description: Build an agreed, designed change in a Vibeproof project and show the working result. Use right after design, and to resume a change that is designed but not yet shown. Feature slices go to a builder subagent; small changes are built here. Work test-first, then show the real running result and wait for the person's review before the final checks.
---

# Vibeproof: build and show

Enter with an agreed brief and its committed `design.md` (reviewed, for a feature). Exit when the
person has seen the real result and said it fits, then go to `vibeproof-finish`.

## 1. The test environment first

Before the first slice, make the checks run once:
- the test database or fixtures;
- the dev server;
- the browser runner, if the change is visible.

Follow [startup](references/startup.md) and save the working recipe in `product/operations.md`,
including its readiness check. Every later slice and every builder starts with that readiness check
instead of rediscovering setup. A slice that fails because the environment broke is not an attempt:
fix the environment, update the recipe, then continue.
Read only that recipe's relevant adopted/observing learning links; include applicable advice and
its limits in the builder's handoff, and retain evidence of actual use or unknown for finish.

When the design names a shared test path (fixtures, sign-in, ready state, exact record), finish it
in the first slice and see it pass before handing out the next. A builder that has to change that
path reports it back instead of patching around it in its own slice.

## 2. Who builds

- **Small change:** build it here, following the approach in design.md.
- **Feature:** give each slice in order to a builder on the working tier (`vibeproof-builder`,
  started as in [subagents](references/subagents.md)). Hand it the brief, design.md, the slice's
  name and the environment recipe. It sees no conversation. If it reports that the design leaves a
  consequential question open, answer from the agreement or fix the design; ask the person only about
  real consequences. It leaves its work uncommitted and returns a short summary.
- **Stay the coordinator.** Read the summary, the diff and the places in it where the design's risks
  sit. Then commit the slice and hand over the next one. Don't rerun its tests or read its full logs
  unless the summary leaves a real doubt. Running and fixing in this conversation fills it: one
  feature reached 942 main-session requests that way. Without subagent support, build the slices
  here.
- **Wait with one call.** While a builder works, wait for its result with one blocking wait. Don't
  poll, sleep or message it in between: each check rereads this whole conversation. In one feature
  about 200 such requests cost a tenth of its tokens.
- **A slice that fails twice** comes back to you: diagnose it here, or return to `vibeproof-design`
  if the design is wrong.

## 3. Each slice

1. **Test first.** Write the expectation from the scenario, not from what the code outputs today.
   Run it and see it fail for the right reason, not a missing fixture or a broken runner. Make sure
   the real entry point reaches the code and the runner actually runs the test. In the browser,
   pick locators from the labels actually rendered, and wait for the ready state the design names
   (the data shown), never a fixed sleep or a spinner disappearing.
2. **Make the test strong.** Assert the useful outcome, the relevant failure and what must stay true.
   A wrong total with status 200 must fail. A refund fix must still refuse unauthorised callers. A
   "fix" that catches everything and returns an empty list must fail. When unsure, break a disposable
   copy on purpose and check the test catches it.
3. **Write the code** inside the slice's files. Copy the example the design names. Read the real
   helper's signature and the entity's required fields before calling it. Use the project's test API.
   Edit through an exact anchor after rereading the block, never by rewriting a whole file from
   memory. Then read your diff.
4. **Run** the affected tests and fast checks, not the whole suite. Commit; the commit check runs.

**Changing an agreed rule:** change only that rule's test, see it fail on the old code, and keep the
others. Never move assertions or add markers to get past the check. When a shared expectation
changes, search by behaviour or command name across code, scripts, tests, workflows and docs. The
first match is not all of them.

**Limits.** After two failed attempts at a slice, restart it from its starting commit, keeping other
people's edits. After a third, stop and tell the person what is blocked and what you need. A missing
tool or the expected first red run is not an attempt; rerunning unchanged code is not a new one. A
test that fails and then passes with no fix is flaky: keep both results and find out why.

**Decide, don't stall.** Settle small ambiguities yourself. Write each ruling, and what it costs if
wrong, in `product/changes/C-<n>/log.md`, together with any deviation from the design. One line
each: what, why, cost if wrong. The log is not a diary of commands and results. An agreed
scenario that is wrong or impossible is a revision in `vibeproof-change`.

An imagined edge case does not expand the slice. Before adding defensive code, judge the reachable
failure, harm and recovery against its complexity using the project's actual conditions. Keep
existing handling for rare, harmless failures where retry is enough. If a cheap, evidenced weak spot
sits in the area you touched and is worth fixing, you may fix one in a separate commit that keeps
behaviour, with tests passing. Keep agreed behaviour and existing safeguards.

**Never in product code:** placeholders on a scenario's path, code that detects tests, swallowed
errors, secrets.

**Prose:** draft from the agreed facts, then edit with [slop-check](references/slop-check/workflow.md).
Keep numbers, conditions and the project's terms; add no invented claims. For CMS content, prepare
the exact change to the real entry with a before/after: editing a fixture doesn't change the CMS.

## 4. Show the result

Before any expensive checks, show the real thing and wait.

- **Start it yourself** with safe test data, following [startup](references/startup.md). Give one
  working link to the complete page and keep it running. Never ask the person to start anything.
- **Show every promise.** Four promised changes need four places they can see, described in product
  terms, not file names. For copy, show the actual new text in chat. A screenshot, a cut-out block or a
  recreated page is not the running site.
- **Make each claim match what you observed.** "Updates automatically" needs the real trigger, not
  a manual refresh.
- If it can't start, say what blocks it and still show the text.
- Say it is ready to review and that the final checks are still to run. Ask whether it fits.

Read the reply.
- A clear yes moves on to `vibeproof-finish`.
- Collect all corrections. Fix defects under the same agreement, each with a failing test first.
- New wishes go to the queue; changed behaviour goes back to `vibeproof-change`.
- Show once more with all fixes. After two showings with items still open, decide with the person
  what each one is.

Approving the scope earlier is not accepting this result.
