# C-18 log

- Slice 1: zoned() moved to lib/cabinet/zoned.ts (booking.ts ↔ calendar.ts would import each other). Cost if wrong: one file to merge.
- Slice 1 was written code-first; strength checked by two mutations (stale read accepted; own id not ignored) — both made c18-booking.test.ts fail.
- Security review after slice 1 (to do after slice 2 lands): (a) a public booking no longer edits an existing client card, and the request is never put into the invitation Google mails (second security review: phishing through her invitations). New client: request on the card; known client: request not kept. Replaces review ruling Q3; the agreed attach to the existing client stays. Cost if wrong: a returning person's new request is lost. (b) name limited to letters, spaces, hyphen, dot, apostrophe, ≤60 — no links in the title Google mails out. (c) per-coach cap 20 bookings a day. Email confirmation before the invitation is not done (changes the agreed flow); queue item.
