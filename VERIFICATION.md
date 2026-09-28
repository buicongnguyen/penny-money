# Prototype verification

## Code and logic fixes — 28 September 2026

- See [REVIEW.md](REVIEW.md) for the confirmed findings, fixes and reproduction details.
- 85 automated tests pass, including 20 new parser, correction, validation and asynchronous-action regressions. All runtime JavaScript passes syntax checks.
- Browser: separate VND 250,000 refunds are retained; correcting a VND 100,000 own transfer to income makes it visible in incoming payments after reload. Total money in is VND 600,000.
- Browser: USD 12.50 receipt text reparses with the corrected currency, saves and survives reload. The USD selection remains after deleting its last transaction. Restoring a synthetic backup hides the prior undo entry; subsequent manual entry saves correctly.
- Four routes fit a 320-pixel viewport without horizontal document overflow; English/Vietnamese switching works. Browser console has no errors/warnings. Only synthetic records were used.

## Vietnamese language — 28 September 2026

- 65 automated tests pass, including language preference persistence, blocked-storage fallback, template parameters and category translation coverage. All browser JavaScript passes syntax checks.
- Browser: switched English → Vietnamese → English and reloaded in both languages. Saved a synthetic VND 125,000 expense with merchant `Income`, bank `Morning` and a mixed-language note; these values and the canonical `Food & drinks` category survived unchanged. Displayed totals and category labels followed the selected language.
- Browser: the incoming afternoon/Facebook filter retained its canonical values and three matching payments when switching languages. Payment details retained separate bank/arrival milliseconds and original SMS text. Checked the translated simulator, receipt scanner, SMS import preview and review warnings.
- Browser: invalid backup JSON showed a Vietnamese error. A VND 200,000 budget displayed VND 75,000 remaining after the synthetic expense.
- All four Vietnamese routes fit a 320-pixel viewport without document horizontal overflow. The backup dialog also fits without internal horizontal overflow. Checked light and dark themes and the language selector on mobile; no browser console errors/warnings. Native date/time controls retain the browser/system locale. Physical phones and software keyboards were not tested.
- Only synthetic records were used in a separate localhost origin; no personal records were added to the repository.

## Initial prototype

- 12 domain regression tests pass (`node --test tests/domain.test.mjs`).
- Browser SMS preview: a Korean approval for ₩12,500 and a Vietnamese debit for ₫185,000 parsed to the correct bank, amount, merchant, date, and category. A synthetic OTP was skipped.
- Saved the two synthetic imports, reloaded, and confirmed persistence and separate currency totals.
- Real browser OCR execution on a synthetic Korean PNG receipt recognized `STARBUCKS` and suggested ₩12,500, preferring the total over ₩6,500 and ₩6,000 line items. Saved the reviewed receipt successfully.
- Vietnamese receipt total extraction is covered by a text regression test; Vietnamese image OCR and real-world receipt accuracy still need representative user samples.
- Mobile viewport at 390 × 844: no document horizontal overflow. Transaction details dialog and review controls opened successfully.
- WebMCP tools registered. Read summary returned the displayed totals. Staging valid SMS updated the visible review and did not save. Empty SMS input was intentionally rejected.
- Browser console error/warning check after receipt OCR was empty.

The native Android SMS integration and local Android database have not been implemented or tested. The web prototype saves in browser localStorage. It is not an APK.

## Incoming payments update

- 33 domain tests pass: the original 12 checks plus 21 payment/timestamp regressions.
- Browser: the exact range 14:32:18.500–14:32:18.999 selects the sample at 14:32:18.987 and excludes the sample at 14:32:18.123.
- Browser simulator: a fictional ₫375,000 buyer payment at 23:59:59.950 with a 125 ms SMS delay shows arrival at 00:00:00.075 the next day.
- Marking that simulation as an own-account transfer removes it from incoming totals while leaving personal records unchanged.
- A synthetic imported Facebook bank credit displays payer, account, reference, 14:32:18.456 bank time, and unavailable SMS arrival. The incoming record persists after a reload.
- Mobile 390 × 844: the payment list uses stacked rows and document width no longer overflows. Payment details remain readable.
- This tests locally generated messages and simulated timing, not actual bank settlement or native Android SMS delivery.

## Dark theme and mobile update

- All 33 domain/payment tests still pass; updated JavaScript passes Node syntax checks.
- Browser initially followed the system dark scheme. Toggling to light and dark updated the surface colors, native control color scheme, and accessible pressed state. Both explicit choices survived reloads.
- Visually inspected dark desktop at 1440 pixels and dark phone at 390 pixels. Checked light phone at 320 pixels, including the longest demo VND totals without clipping.
- All four pages have no document horizontal overflow at 320 and 768 pixels. Phone navigation uses four labeled 56-pixel-high targets and route changes return to the top.
- At 320 pixels, SMS import, receipt scanner, and incoming simulator dialogs fit their available widths; the transaction editor also fits at 390 pixels. Form fields use 16-pixel text and modal content scrolls vertically.
- Incoming advanced filters expand; choosing Facebook changes the simulation from 9 to 7 matching KRW payments. Time inputs retain the 0.001-second step. The hourly chart has its own horizontal scroll region and 44-pixel-wide targets on phones.
- Browser console contained no errors or warnings. Responsive checks used browser viewport emulation, not a physical Android/iOS device or a software keyboard.

## Evaluation improvements — 26 September 2026

- 44 tests pass: 33 existing domain/payment regressions and 11 backup, restore, storage-safety and comparison tests. All runtime JavaScript passes syntax checks.
- Browser: added a synthetic KRW 6,500 manual expense, set a KRW 10,000 monthly budget, and reloaded. Spending stayed KRW 6,500 and remaining budget stayed KRW 3,500. The list identifies it as Manual entry.
- Browser: deleted and undid that synthetic transaction. The record, totals and remaining budget were restored.
- Browser: downloaded `penny-backup-2026-09-26.json` and validated the actual local file with the backup parser: one record and the KRW 10,000 budget were present.
- Browser: invalid pasted JSON was rejected. Restoring a synthetic KRW 2,500 flagged grocery entry preserved the existing budget and changed remaining budget to KRW 1,000. Repeating the preview reported zero additions and one duplicate. Review entries displayed only that flagged record.
- All four routes fit a 320-pixel browser viewport without document horizontal overflow. Manual-entry and backup dialogs have no internal horizontal overflow at that width. Physical mobile devices and software keyboards have not been tested.
- No genuine financial records were used in verification or placed in the repository. GitHub Pages deployment is verified separately from local test success.

## Review fixes — 26 September 2026

- All 60 automated tests pass, including 16 new review regressions. Coverage includes five formerly failing reproduction cases, competing/queued saves, stale restores after deletion, unsupported lock handling, legacy fingerprints, ambiguous arrivals, debit/refund direction and historical dates.
- Browser, separate localhost origin with synthetic records: two purchases totaling KRW 7,500 remain after an older tab changes currency. Attempting to add from the stale tab shows the temporary-changes warning; the latest persisted records remain intact after reload.
- Browser SMS import: four records are found, including both VND 250,000 payments at bank time 14:32 with different SMS arrival milliseconds. Both candidates show the ambiguity warning. An outgoing buyer refund is an expense, and the Korean 08/31 12:35 message retains August 31.
- Saving and reloading keeps VND spending at 250,000, money in at 500,000 and net cash flow at 250,000. No actual SMS, financial records or receipt photos were used.
- A pasted backup adds one synthetic VND 1,000 expense and survives reload. The incoming page still lists both bank payments. At a 390-pixel viewport, content and client widths are both 375 pixels; no horizontal overflow or browser console errors/warnings were observed.
