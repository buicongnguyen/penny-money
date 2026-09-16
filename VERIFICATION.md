# Prototype verification

- 12 domain regression tests pass (`node --test tests/domain.test.mjs`).
- Browser SMS preview: a Korean approval for ₩12,500 and a Vietnamese debit for ₫185,000 parsed to the correct bank, amount, merchant, date, and category. A synthetic OTP was skipped.
- Saved the two synthetic imports, reloaded, and confirmed persistence and separate currency totals.
- Real browser OCR execution on a synthetic Korean PNG receipt recognized `STARBUCKS` and suggested ₩12,500, preferring the total over ₩6,500 and ₩6,000 line items. Saved the reviewed receipt successfully.
- Vietnamese receipt total extraction is covered by a text regression test; Vietnamese image OCR and real-world receipt accuracy still need representative user samples.
- Mobile viewport at 390 × 844: no document horizontal overflow. Transaction details dialog and review controls opened successfully.
- WebMCP tools registered. Read summary returned the displayed totals. Staging valid SMS updated the visible review and did not save. Empty SMS input was intentionally rejected.
- Browser console error/warning check after receipt OCR was empty.

The native Android SMS integration and local Android database have not been implemented or tested. The web prototype saves in browser localStorage. It is not an APK.
