---
name: vibeproof-design
description: Decide how to build an agreed change in a Vibeproof project — investigate the real system deeply, choose the solution, and write a specification good enough for another agent to build from without the conversation. Use right after agreement, and to resume a change whose design isn't written or reviewed. A feature gets a full design and a fresh review; a small change gets a short approach.
---

# Vibeproof: investigate and design

The person decided *what*; you decide *how*, so the result is well built and not just passing tests.
This is the most important stage: the build follows the design, and for a feature another agent
builds it without seeing this conversation. Run it on the strong model tier (BD-43).

Enter with an agreed brief. Exit with `design.md` committed (`design C-<n>`), reviewed for a feature,
then continue to `vibeproof-build` without asking again. Ask the person only about consequences they
would feel (cost, speed, where data lives, lock-in, legal), in their words. Settle the technical rest
yourself.

## 1. Investigate

Start from what you learned while agreeing; go deeper where the solution depends on it.

- **Read the contract and memory:** the brief, the capabilities it touches, `product/architecture.md`,
  recent decisions, queue items and weak spots in the area. Read the relevant operations recipe and
  its adopted/observing learning links; carry applicable advice and its limits into the slice handoff.
- **Follow the real path** with actual file paths: entry point → source of truth → processing →
  output, and how preview and the live site get it. Trace callers, imports, consumers and the tests
  that cover them. A list of files is not a dependency graph; mark links you couldn't confirm.
- **Find every writer.** For data, configuration or state the change touches, find who else writes
  or resets it: jobs, imports, CMS syncs, hooks, migrations, schedules, outside registrations.
  Classify each overlap as none, safe or conflicting, with evidence. A search with no matches means
  nothing was declared there, not that nothing exists. Example: a nightly `TRUNCATE … CASCADE` reload
  wiped the records a new foreign key pointed to. Only a synthetic lifecycle test catches that, not a
  page render.
- **Check where a pattern came from** before copying it: a standard, legacy debt or a deliberate
  exception. Example: an old page used its own mail client, but a later decision moved everything
  to the shared mailer. Keep deliberate exceptions; don't spread debt.
- **Look for what would prove you wrong:** the real consumer, an applicable decision, another
  writer. Check it before choosing.
- **Learn the build facts** the builder will need: the nearby working example to copy, real helper
  and fixture signatures, required fields, the project's test API and runner command, how to start
  the product safely, and what "ready" looks like on the page under test (the data shown, not a
  spinner gone).
- **Broad searches** ("every caller of X", "where is this text") can go to a fast-tier search
  subagent (`vibeproof-scout`, started as in [subagents](../vibeproof-build/references/subagents.md)).
  Read the files that decide the design yourself. For a significant uncertainty about
  missing a source, you may run a separate source pass that is not told the request or your
  preferred answer, then compare. Call it independent only if it was.

Keep "read in code", "seen running" and "inferred" apart in your notes. If the investigation shows the
agreement can't hold, or reaches money, personal data, sign-in or something irreversible the brief
didn't foresee, stop and go back to `vibeproof-change`.

## 2. Small change: the approach

Add `product/changes/C-<n>/design.md` with 5–10 lines under `## Approach`:
- the files to change;
- the example to copy;
- the test for each scenario;
- what must stay true;
- how to check it.

No review. Commit `design C-<n>`.

## 3. Feature: the design

Write `product/changes/C-<n>/design.md`, about 200 lines at most. Write it for a builder who has only
this file and the brief:

- **Map:** what exists and shapes the design, with paths. Note the patterns to copy and their source,
  the writers and resets found, the weak spots and the build facts from §1.
- **Options:** at least two. The first is "leave as is" or the smallest change to what exists, or an
  existing setting or content tool. Compare fit, how much is new, how easy it is to undo, running cost.
- **Decision:** which option, and why the others lost.
- **Program design:** new or changed types and data, function signatures, the owning module, the
  call path of the main scenarios. Write it like a header file, not code.
- **Slices:** in order. For each slice:
  - what it makes true;
  - its scenarios;
  - its test, with path and what it asserts, including the failure it must reject;
  - the files it touches;
  - where to look: the files, functions and examples found during investigation, so the builder
    reads them instead of searching the repository again;
  - when it's done.

  At most three slices. If the design needs more, stop and go back to `vibeproof-change` to split
  the change with the person: one five-hour, six-slice change taught that a bigger one costs far
  more than its parts.
  When the slices share test setup, the first slice builds that shared path in the project's own
  test helpers and proves it on its scenario: fixtures, sign-in, the ready state, and selecting
  exactly the record under test. Later slices reuse it rather than rediscovering it.
  Every added or changed scenario sits in a slice; slices name nothing outside the brief. Removed
  behaviour gets an absence or replacement test. Each new expectation must fail on today's code for
  the right reason.
- **Visible work:** design-language fit, components reused, states that apply, phone and desktop
  behaviour, accessibility. Follow [visible changes](../vibeproof-change/references/visible-changes.md).
- **Risks:** what could go wrong, including the brief's "Would fail if". For anything irreversible,
  the rollback.
- **Decisions to keep:** lasting choices, one bullet each with the reason and what it replaces.

Settle choices the brief leaves open by its "Why". Reuse before adding: a new abstraction needs two
current users. Explain in the design any change touching more than about 8 files or adding 2
abstractions. Extra robustness needs a reachable failure under the project's actual conditions,
its harm and recovery cost, and a benefit worth the added code, tests and maintenance. Possibility
alone is insufficient. Use known users, scale and operation frequency; don't invent probabilities
or enterprise requirements. For a rare, harmless interruption where retry is enough, keep existing
handling. A security concern needs a concrete forbidden action and reachable path; deliberate abuse
is assessed by exploitability, not ordinary operation frequency. Preserve agreed behaviour and
existing safeguards. Settle routine trade-offs yourself, without a new risk form or approval stop.
Don't shrink or postpone anything agreed. Don't add anything the brief excludes.

## 4. Feature: the review

1. **Builder check.** Reread brief and design as the builder: where would a wrong guess matter?
   Close those gaps yourself.
2. **Fresh review.** Give a fresh read-only agent on the strong tier (`vibeproof-reviewer` where
   the host has it) these materials:
   - the brief and the design;
   - the touched scenarios and decisions;
   - the relevant code;
   - the [reviewer checklist](../vibeproof-build/references/reviewer-checklist.md), design part.

   Don't give it your reasoning or the conversation. Start it as in
   [subagents](../vibeproof-build/references/subagents.md). A different model family is optional.
3. **Settle findings.** Check each finding against its evidence and the proportionality rule above.
   Reject unnecessary hardening as well as incorrect findings, with a short reason; a review's
   severity label is no authority to expand scope. Fix confirmed blockers and majors.
   Sort open questions: if the brief, project or conversation answers
   one, write the answer in; a technical one is yours, decide and record it; one only the person can
   answer that changes what they get goes to them. Ask those in one message, most consequential
   first, each with your recommendation; if an answer changes the agreement, revise it in
   `vibeproof-change`. A compiler or test result can close a bounded technical fix
   without another review. Review again only if the contract, architecture, data or access changed,
   at most 3 rounds.
4. **Record.** Add `## Review` to design.md: who reviewed, findings, what was done. If no fresh agent
   was available, write that and tell the person the review was lighter. Commit `design C-<n>`.

A later change to the agreement needs the design checked, and for a feature reviewed, against the
new brief.
