# Penny — web prototype

A responsive, device-local spending tracker for South Korea and Vietnam. Open the hosted prototype or run `node server.mjs` and visit http://127.0.0.1:5173. No build or installation is needed. Run parser checks with `node --test tests/domain.test.mjs`.

## Try it

- Starts with clearly labeled synthetic KRW and VND demo transactions. The currency selector keeps totals separate; no exchange conversion is applied.
- Import SMS by pasting messages separated by blank lines, or selecting TXT, JSON, or SMS Backup & Restore XML. JSON accepts an array of `{ "body": "...", "sender": "...", "date": "2026-09-17" }`; Android millisecond timestamps are accepted too.
- Preview and correct the merchant, amount, bank, date, type, category, and currency before saving. Saving the first real import or receipt replaces demo transactions.
- Read a JPG/PNG/WebP receipt with Korean + English or Vietnamese + English OCR. Review the suggested merchant, total, date, and category before saving. Manual entry and pasted receipt text also work.
- Filter monthly results by bank and currency. Edit transaction details, mark transfers between your accounts as Transfer, and export the filtered transactions to CSV.
- Add custom bank sender/name rules for future imports.

## Data and limitations

Transactions and bank rules live in browser localStorage for this origin and browser profile. They are not uploaded, synced, or encrypted by this prototype. Clearing browser/site data removes them. Export CSV for records; CSV is not currently a restorable backup. Receipt images are used transiently and are not stored. Third-party requests download Google Fonts and Tesseract OCR code/models, not your SMS or images. OCR first use needs internet. The app is not currently a fully offline PWA.

OCR uses Tesseract.js 6.0.1 in a web worker. It suggests values and does not silently book them. Blurry photos, complex layouts, OCR errors, and unknown bank templates need correction. Amount extraction is a rules-based prototype, not an exhaustive set of certified bank parsers. Unrecognized SMS are shown as skipped. SMS sender matching does not authenticate a bank. Date-only messages use a user-selected fallback date/year and are flagged. Card refunds count as money in, while spending is gross purchases. Transfers are excluded from both spending and income. Duplicate SMS body/date pairs are skipped. A receipt and an SMS for the same purchase are not automatically reconciled.

## Android next step

The reusable `dist/domain.mjs` contains pure parsing, categorization, receipt suggestions, and aggregation logic. It can be retained in an Android WebView/Capacitor shell, or ported to Kotlin. Build the native layer after validating real redacted SMS formats and receipt photos:

1. Store transactions in local SQLite/Room (or a suitable native database), with backup/export and deletion controls.
2. Use a native OCR adapter such as supported on-device ML Kit recognition, with Korean and Vietnamese script coverage verified on target devices. Keep the existing review-first flow.
3. Add opt-in SMS permissions and ingestion. Ordinary web pages cannot read a phone's SMS inbox. Google's Play policy lists SMS-based money management as a possible exception, subject to review and approval; permission access is not guaranteed.
4. Test on Android with the user's actual bank templates, locales, screenshots, receipts, timezone changes, refunds, installment charges, and transfers.

Sources: https://github.com/naptha/tesseract.js ; https://support.google.com/googleplay/android-developer/answer/10208820?hl=en ; https://developer.chrome.com/docs/identity/web-apis/web-otp

## Verification

Domain regression tests cover Korean/Vietnamese parsing, grouping separators, rejecting OTP/promotional/failed messages, distinguishing balances from payments, duplicate imports, date validity, currency-separated summaries, and receipt totals. Browser UI verification is recorded in `VERIFICATION.md`.
