# C-12 design

## Approach
- Files: `.local/web/lib/mail.ts` (`smtpSettings()`: add `requireTLS: !secure`), `.local/web/tests/c11-accounts.test.ts`.
- Example to copy: the in-test `fakeSmtp()` already in `c11-accounts.test.ts`; extend it with optional STARTTLS (temporary self-signed cert made with `openssl req -x509` into a temp dir; `tls.TLSSocket(socket, { isServer: true, key, cert })` after `220`), the client trusts it via `NODE_TLS_REJECT_UNAUTHORIZED=0` set and restored inside the test only.
- Tests: (1) existing «smtp sends from MAIL_FROM…» runs against the STARTTLS server and also asserts AUTH arrived over TLS; (2) new «smtp requires TLS»: server without STARTTLS, `SMTP_SECURE=false` → `sendMail` rejects and the server saw no AUTH and no DATA. Both fail on today's code for the right reason: (2) today sends AUTH in clear.
- Must stay true: production start check, outbox, background sending, other c11 tests.
- Check: `node --import tsx --test tests/c11-accounts.test.ts`, typecheck, lint.
