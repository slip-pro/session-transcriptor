# Repair

Use when something that used to work, or was agreed, is broken.

**Authority.** A request to repair behaviour that was already agreed, together with that saved
scenario, is enough to restore it: write the brief with `Status: agreed` and
`Agreed: <date> — repair request: "<their words>"` and don't ask the same agreement again. Anything
that would change behaviour, or restore something that was only reconstructed and never agreed,
goes through normal agreement. Never reword an expectation so new behaviour looks like a restoration.
Calling something a bug authorizes no publishing, messages, payments, migrations or guarded-setting
changes.

**Live outage.** If the live site is broken by a recent release, offer to restore the previous
version through `vibeproof-publish` §5. Say what else it undoes and that it doesn't restore data.
Diagnose on a safe copy, never on live data.

**Open the change first.** A request to fix, reopen or retry something is a repair: write its brief
before any edit. A temporary probe is not a fix; revert it before the test is committed.

**Understand.** If the request doesn't say where and how the failure was seen (the command, the
environment, the error text), ask that first, before trying reproductions of your own. Separate
the symptom from the expected result. Read the affected scenarios, decisions
and recent changes, and trace the real path as in `vibeproof-change` §2 before choosing a fix. Keep the
request, symptom, exact expectation and blast radius in the brief.

**Reproduce first.** Write a test that exercises the person's actual symptom with safe synthetic
data and fails for that reason, not for a missing tool or setup. Commit it before the fix. If it
won't reproduce, stop guessing: say so and ask only for the missing input or environment, or add
scoped logging. Never ship a speculative fix as verified.

**Diagnose.** Note in the log what you observed, the plausible causes, what each would predict and
what ruled each out. An obvious cause with evidence needs no invented alternatives. Check that the
chosen cause explains every observation. A cosmetic edit that changes nothing real is not a repair.

**Fix.** Make the smallest fix that removes the cause. Keep the reproduction and existing assertions
unchanged; the reproduction stays in the suite as a permanent regression test, and the runner must
actually run it. If a fix suppresses an error, also assert the useful result and what must stay true.
After two failed fixes, restart from the eliminated causes. After three failed hypotheses, stop and
offer: a new approach, more observability and waiting, a larger agreed change, or handing it to a
developer with your notes.

**Report.** Show what was wrong, what changed, the before/after evidence and the limits. If an earlier
change let the defect through, name it and add a weak spot to `product/queue.md`; never edit the
closed change. If you don't know where it came from, say so.
