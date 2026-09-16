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

## Incoming payments update

- 33 domain tests pass: the original 12 checks plus 21 payment/timestamp regressions.
- Browser: the exact range 14:32:18.500–14:32:18.999 selects the sample at 14:32:18.987 and excludes the sample at 14:32:18.123.
- Browser simulator: a fictional ₫375,000 buyer payment at 23:59:59.950 with a 125 ms SMS delay shows arrival at 00:00:00.075 the next day.
- Marking that simulation as an own-account transfer removes it from incoming totals while leaving personal records unchanged.
- A synthetic imported Facebook bank credit displays payer, account, reference, 14:32:18.456 bank time, and unavailable SMS arrival. The incoming record persists after a reload.
- Mobile 390 × 844: the payment list uses stacked rows and document width no longer overflows. Payment details remain readable.
- This tests locally generated messages and simulated timing, not actual bank settlement or native Android SMS delivery.
