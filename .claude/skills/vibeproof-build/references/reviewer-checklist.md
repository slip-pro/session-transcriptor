# Reviewer checklist

You are a fresh reviewer. You read; you don't run anything live or change files. Judge only from the
materials you were given and the code. Report each finding with its evidence (file and line, or a
test result), the agreement or rule it breaks, severity (blocker, major, minor) and confidence. Never
invent a finding. If nothing concrete is found, check once for missing consequential answers, then
report no findings if there are none. Report actual coverage limits separately; they are not defects.

**Proportionality, in both reviews.** A possible edge case is not automatically a defect worth
fixing. Use the project's actual users, scale and operation frequency. For extra robustness, show
the reachable failure, concrete harm, recovery cost and why a fix earns its complexity. Rare,
harmless interruptions where retry is enough need no new machinery and do not block completion.
Do not invent likelihood numbers or requirements. For security, show the forbidden action and
reachable path; deliberate abuse depends on exploitability, not ordinary operation frequency.
Preserve agreed behaviour and existing safeguards. A security label or severity alone proves nothing.

## Design review

- **Missing answers:** what would the builder have to guess where a wrong guess matters?
- **Contract:** every agreed scenario is covered by a slice. Nothing agreed is narrowed or put off.
  Nothing outside the brief, including its "won't do", creeps in.
- **Decisions:** the design respects recorded decisions, or names the one it replaces and why.
- **Data:** existing data survives. Other writers, jobs and resets of the same data are accounted for.
- **Access and privacy:** who can read and change what, and where personal data goes.
- **Tests:** each planned test can fail for the right reason and checks the outcome, not just "no
  error".
- **Simplicity:** "leave as is" or the smallest change was really considered. No abstraction with a
  single user, no robustness for a failure that can't happen here.
- **Words:** the domain terms match the brief and `product/`.

## Implementation review

- **Tests match the agreement.** Each test proves its scenario and would reject a plausible wrong
  result. Unchanged agreed tests are untouched.
- **Exists → substantive → wired.** The code exists, does real work and is reached from the real
  entry point, including empty and error paths. A legitimate empty result is not a stub.
- **The runner runs it.** The regression test is actually executed. Exit codes survive pipes: a
  formatter after a failed command doesn't make it pass. A file reference is not an executed path.
- **No shortcuts:** no placeholders on a scenario's path, no test-detection branches, no swallowed
  errors, no secrets.
- **Security:** a file named "auth" is not authorization. A security claim needs a real assertion,
  such as another user's data being absent. Data loss or exposure of someone else's data is always
  a blocker.
- **Repairs** fix the cause, not the symptom.
- **Scope and simplicity** match the design: reuse, file count, new abstractions.
- **Visible work:** no overflow at 320 px, long labels fit, keyboard reach, visible focus,
  accessible names, contrast and reduced motion where relevant. Loading finishes and errors can be
  recovered from. Comparison baselines come from the agreed history. Treat hierarchy and next action
  as prompts, not scores.
- **Warnings:** address every build or check warning you were given.
