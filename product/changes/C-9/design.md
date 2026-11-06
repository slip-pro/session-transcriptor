# C-9 design

## Approach
- **Files:** `.local/web/app/cabinet/ui/workspace.tsx` — «Мои клиенты» block (`cc-home-clients`); `.local/web/app/cabinet/room.css` — style for the bottom link.
- **Code:** `homeClients = [...activeClients].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)`; free-seat card only when `activeClients.length < 6`; heading keeps only «Мои клиенты»; below the grid `<button className="cc-text-button cc-home-all">Все клиенты · {activeClients.length}</button>` → `navigate("clients")`. Copy pattern: existing heading link (C-8).
- **Test:** `tests/cabinet-c8-home.cjs › my-clients` — create 7 fresh active clients (newest last), assert exactly 6 cards, the newest present and the 7th-newest absent, order newest first, no free seat, no archived, bottom link text `Все клиенты · N` equals server active count and opens «Клиенты»; no link in the heading.
- **Must stay true:** archived never on home; card opens the client page; c5/c3-visual pass.
- **Check:** sync preview copy, run c8-home my-clients, c3-visual; screenshot 1280/390.
