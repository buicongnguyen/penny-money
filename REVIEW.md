# Code and logic review — 28 September 2026

Reviewed baseline: `625cf57`. This pass covered parsing, duplicate detection, timestamps, transaction corrections, storage/restore, asynchronous UI actions, OCR lifecycle, and English/Vietnamese presentation. All confirmed findings below are fixed in this update.

| Priority | Reproduction / impact | Fix |
| --- | --- | --- |
| P1 | `refund` was parsed as reference `und`, dropping separate equal-value refunds on different dates. | Require a complete reference label. Ignore obsolete false-reference identities during deduplication, including old saved records. |
| P1 | An invalid addition could enter the in-memory ledger before validation, leaving temporary data that could not be backed up. | Validate the complete candidate workspace before applying additions, edits or bank-rule changes; show validation errors in the open dialog. |
| P2 | `VCB` sender with `Shinhan` in a memo was assigned to Shinhan. | Prefer recognized sender metadata, then the first bank identifier in the bank-authored text. |
| P2 | Payer `Hoan Tien`, reference `refund`, or a pickup time in a memo could change classification or become a bank timestamp. | Keep labeled names, references and memos out of financial-signal/date/time extraction. Original text is retained. |
| P2 | USD 12.50 with a KRW balance was skipped or assigned the wrong currency; dong symbols could rely on the selected fallback. | Parse currency per amount and use the transaction/receipt total's currency. |
| P2 | A December 31 bank notification arriving January 1 was assigned to December of the new year. Invalid bank dates could lose their warning when metadata existed. | Resolve yearless dates against arrival/date metadata and retain review flags; keep an explicit fallback year when metadata is absent. |
| P2 | Changing an own-account transfer to income in import review left `ownAccount` true; types and categories could disagree. | Use one correction function for import review and editing. Synchronize type, category, incoming status and own-account status. |
| P2 | Date correction annotations disappeared during backup validation. | Preserve the correction annotation while keeping original SMS arrival evidence. Reject timestamps outside the supported storage range. |
| P2 | Repeated or competing submissions could mutate records while a Web Lock/save was pending. | Share a mutation guard across personal-data actions; prevent duplicate execution, explain a busy save and release the guard after failure. |
| P2 | A slow file read could overwrite a newer file or pasted text; failed selections could reuse prior content. | Invalidate outdated SMS/backup reads, clear obsolete sources, and disable preview until the current read finishes. |
| P2 | OCR timeout did not cancel a pending worker creation; late results could replace manual or newer receipt details. | Isolate each scan, cancel on dialog close/manual entry, ignore late progress/results and dispose workers even when creation finishes late. |
| P2 | Receipt parsing missed unmarked cents/short amounts, and the form's whole-unit step blocked valid USD expenses. Reparse could discard a currency correction. | Support decimal/short receipt totals; update amount constraints with currency and retain the selected receipt currency for reparse. |
| P2 | Old undo state survived workspace replacement; the currency selector lost USD after its last record was deleted; mixed imports could select an empty month/currency pair. | Reset undo after clear/restore, retain the active currency, and select the latest imported record's month and currency. Reset list filters after adding records. |

## Validation

- 85 automated tests pass. The 20 new tests cover reproductions, legacy identities, correction/backup consistency, failed additions, save guards, late file reads and OCR timeout/cancellation.
- Browser testing used only synthetic data on a separate localhost origin. Two VND 250,000 refunds were retained. A VND 100,000 own-account candidate corrected to income appeared in Incoming payments after reload; total money in was VND 600,000.
- A receipt containing `Total 12.50` was corrected to USD, reparsed, saved and reloaded as USD 12.50. Deleting the last USD record retained the USD filter. Restore reset the old undo entry, and later manual entry worked.
- All four routes fit a 320-pixel viewport. English/Vietnamese switching worked; no browser console errors or warnings were observed. Syntax and Git whitespace checks pass.

## Practical limits

Historical merchant/type/date corrections are not silently rewritten. Records previously discarded by the old parser need the original SMS to be reimported. Bank parsing remains a reviewable rules-based prototype, and ambiguous yearless dates remain flagged. OCR lifecycle tests use controlled workers; a fresh OCR model download and physical Android/software-keyboard testing were not part of this pass. Native date/time widgets still use the browser/system locale.
