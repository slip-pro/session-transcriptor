---
name: vibeproof-change
description: Prepare and save tasks, tickets, specs or changes in a Vibeproof project, including drafts for later implementation. Use for new behaviour, a repair or revising agreement beyond advice or a tiny fix. Understand the system, write a brief and agree in ordinary conversation. No product code here.
---

# Vibeproof: understand and agree

Save the brief in the project. After agreement, continue to `vibeproof-design` unless the person
asked only to prepare tasks, defer implementation or do it in another chat. Then stop with saved
briefs and their paths; keep unapproved ones as drafts. Chat-only text stays in chat if requested.
For a repair read [repair](references/repair.md) first. To resume, pause or switch work read
[pause and resume](references/pause-resume.md). On first use in a project read
[onboarding](references/onboarding.md).

## 1. Place the request

- Follow the intended result, not the noun: "task", "ticket", "spec" and "change" can mean the
  same project work. Use their words. A request to prepare project tasks includes saving briefs,
  even at draft stage; a request for advice, brainstorming or text only does not.
- If a change is already open in `product/changes/`, a related request before agreement joins its
  brief. After agreement, a clarification or a defect continues the work; different behaviour is a
  revision (§5).
- Restate the result and what it is for in a sentence. Don't stop for confirmation of a clear request; fold any real
  question into the proposal.
- Several wishes can be one change. Split when a part is useful on its own; queue the rest in
  `product/queue.md`, reusing an existing item for the same outcome. If asked to prepare several
  tasks, save a brief for each requested task; a queue item or chat text alone does not deliver it.
- **Keep one change small enough to finish in a sitting:** about 10 scenarios and 3 slices at
  most. Scope defined by an inventory ("every editor", "all 74 block types") is a series, not a
  change. Propose the most useful first piece with your recommendation and queue the rest; the
  person decides. One whole-admin change once took five hours instead of one.
- **Size by consequence, not lines.** A *small change* reuses existing patterns, is reversible and
  adds no business rule. A *feature* adds a workflow or a rule, or touches money, personal data,
  sign-in or an outside service, however short the code. Acting on real customers, money or data
  is never part of building.

## 2. Understand before choosing

Read what the task needs from `product/`: the affected capability scenarios, decisions, open queue
items and known weak spots. Read the relevant `product/operations.md` recipe and its adopted/observing
learning links; follow their scope without loading the full learning history. Then follow the real path: entry point → source of truth → processing →
what the person sees, including how preview and the live site get it.

- Matching text is not the source. Seeds, fixtures, fallbacks and unused components can contain the
  words without controlling the page. Find whether it comes from a file, a CMS or database entry, a
  service or a generated file. Example: a page kept saying "Book now" from the CMS entry while the
  agent edited the code fallback.
- Names, imports and files on disk don't prove the code runs. Check real callers. Where safe, observe
  current behaviour with a read-only probe. Keep "described", "read in code" and "seen running"
  apart, and an inference apart from a fact.
- For changed data or configuration, find every writer and reset: jobs, imports, hooks.
- For sign-in, money, personal data or a new recipient, read [data boundaries](references/data-boundaries.md).
  For a new dependency, service or MCP, read [suppliers](references/suppliers.md). For a visible
  change, read [visible changes](references/visible-changes.md).
- Stop when you can choose the intervention and name what is still undecided. If it already
  works, show how. If an existing setting or content tool does the job, recommend that.
- For undocumented behaviour, separate what was agreed before, what you observed and what is still
  undecided. A passing old test shows what the code does, not what was intended.

## 3. Questions

Know why they want it before how: what it should achieve for them, and what would make it a failure
even if it works. If the request and the project don't show it, ask that first, openly and without
options: options steer. Their answer settles many choices nobody will ask about.

Ask only what the person alone can decide: how their business works and what people should see. The
project answers the rest, and technology is yours to decide. For each question, give your
recommendation and what it changes for them. Ask up to three at a time, the most consequential
first. Use a concrete case in their terms ("what happens to an unpaid booking at midnight?"), not
mechanism. If answers conflict, show one situation where both can't hold and resolve only that.
"You decide" means the safest option within their constraints, listed in the proposal; it never
covers spending, new data flows, providers or publishing. If a question touches a recorded decision,
say what was decided, when and why. Overturning it creates a new decision that replaces the old one.

## 4. The brief

Write `product/changes/C-<n>/brief.md` (`<n>` = highest number in `product/changes/` and
`closed/`, plus one). Use their words. A small change is under a screen with at most 3 scenarios;
a feature is at most two screens and about 10 scenarios, otherwise split it.

```
# C-<n>: <short name>
Status: draft
Request: <their words>
Why: <what it should achieve for them; how they'll know it worked>
Would fail if: <what would make it a failure even if it technically works>
Size: small change | feature — <why>
Today: <what happens now>
After: <what will be different>
Won't do: <deliberately left out>
Must stay true: <existing rules this must not break>
Decided for you: <technical choices, one line each>

Scenarios:
- add S-<area>-<k>: <a behaviour they would recognise> — test: <path> › <name>
- change S-<area>-<k>: <was> → <now>
- remove S-<area>-<k>: <why>; replaced by S-<area>-<k>
```

`<area>` is a file in `product/capabilities/`; a new `<k>` is one above that file's highest. Write a
scenario so it would survive a different implementation. Removing behaviour needs an observable
replacement or absence scenario. Copy that changes what an action promises is a scenario. Carry their
explicit quality limits (keyboard-only, a response time) into the scenarios.

Before proposing, reread the brief as the builder: who acts, what goes in and out, when it triggers,
limits, what happens on failure or a retry. Resolve what a wrong guess would make costly.

## 5. Agreement

Show the proposal in chat: why, today and after, the scenarios in plain words, what it won't do and
the choices that matter to them. Keep test paths and IDs in the file. If a screen or flow is hard to
judge from words, offer once to sketch it first ([visible changes](references/visible-changes.md)). Ask naturally, for example: "Does
this work for you, or should I change something?"

- **They agree:** set `Status: agreed`, add `Agreed: <date> — "<their words>"`, commit
  `agree C-<n>`. Continue to `vibeproof-design` unless implementation was deferred.
- **They correct:** revise and show again.
- **They want to wait:** leave it and mention it next session.
- **They drop it:** `git rm -r` the folder and commit with the reason.

Read their reply; don't present these as a menu. Fixing formatting doesn't cancel agreement.
When stopping at preparation, commit the drafts or agreed briefs through the project's normal
save process and link each file with its status. Say whether another chat can access those commits;
follow the project's sharing rules without treating preparation as permission to push or publish.

**Revising what was agreed:** set `Status: draft` and add `Revised: <what changes and why>` in one
commit. Then show only the difference and agree again the same way. Group related revisions. A
scenario that turns out impossible is a revision too.
