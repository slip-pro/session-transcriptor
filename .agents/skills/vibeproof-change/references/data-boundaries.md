# Data boundaries

Use when a change touches sign-in, money, personal data or sends data somewhere new.

**Map it from the code**, not from file names: who acts, which resources, which operations, who owns
each record, what happens on denial or error, and every recipient. Look at real routes, tables, logs,
background jobs and outbound calls. A file called "auth" is not authorization. Give this map to the
reviewer.

**Agree new flows.** A new recipient needs agreement naming the data, the destination and the purpose.
Never present an unnamed recipient as an existing one.

**Test with synthetic data only** — never customer data, live money, real messages or production
write credentials. Cover:
- the owner's allowed path, another user's denied path, and the anonymous path, for reads and writes;
- missing, invalid and someone else's IDs;
- that another person's data is absent from the response, not just that the status code is right;
- logs, error output and the actual outbound payload, which must not leak what they shouldn't;
- deletion across every place personal data is stored, and table policies where the database has them.

A security claim needs a real assertion run through the project's tools, never a word search in source.

**Keep raw output local.** Assertion output can contain sensitive data: don't commit or upload it;
quote a redacted excerpt after reading it.

**Before showing or publishing**, check the map against what actually changed and say which paths
were not tested. Passing tests don't establish general security or legal compliance. Legal or vendor
rules need current official sources, not old notes.
