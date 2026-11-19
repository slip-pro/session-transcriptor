# C-17 build log
- Slice 1: tests/c13-schedule.test.ts fixture `person()` got `terms: null, programDone: null` (type-only; new required CabinetClient fields, no assertion changed). Cost if wrong: none.
- Slice 1: `POST` client with `programDone` in the body is rejected 400 INVALID_DATA (design only forbade it with `terms` on PATCH). Cost: a client that sent it would fail; none do.
- Slice 1: a `terms` of `{kind:null, slot:null}` is stored as NULL (no terms, no slot). Cost if wrong: none visible.
- Slice 1: `PATCH {terms}` goes through one transaction with the `{programDone}` path; adjust resets when kind or startDate changes (also kind program->once->program).
- Slice 1: only parseTerms, programDone, programLine, slotLine are in lib/cabinet/terms.ts; seriesPlan and slotConflicts come in later slices.
