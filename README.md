# Penny — web prototype

A responsive, device-local spending tracker for South Korea and Vietnam. Open the hosted prototype or run `node server.mjs` and visit http://127.0.0.1:5173. No build or installation is needed. Run parser checks with `node --test tests/domain.test.mjs`.

## Try it

- Starts with clearly labeled synthetic KRW and VND demo transactions. The currency selector keeps totals separate; no exchange conversion is applied.
- Import SMS by pasting messages separated by blank lines, or selecting TXT, JSON, or SMS Backup & Restore XML. JSON accepts an array of `{ "body": "...", "sender": "...", "date": "2026-09-17" }`; Android millisecond timestamps are accepted too.
- Preview and correct the merchant, amount, bank, date, type, category, and currency before saving. Saving the first real import or receipt replaces demo transactions.
- Read a JPG/PNG/WebP receipt with Korean + English or Vietnamese + English OCR. Review the suggested merchant, total, date, and category before saving. Manual entry and pasted receipt text also work.
- Filter monthly results by bank and currency. Edit transaction details, mark transfers between your accounts as Transfer, and export the filtered transactions to CSV.
- Add custom bank sender/name rules for future imports.
- Open **Incoming payments** (or `#incoming`) to list bank credits from other people, identify payers/accounts/references, and label Facebook or direct transfers. Filter by day, month, time of day, exact time range, bank, currency, and channel. Click an hourly bar or day-period chip to filter.
- The **Simulation** inbox contains fictional Korean and Vietnamese payments, including two payments in the same second, minute/second precision, and missing times. **Simulate incoming SMS** lets you choose payer, amount, bank time, milliseconds, memo, reference, and SMS delay. Simulation data is temporary and never enters personal totals. **My messages** uses saved imports.

## Incoming payment timestamps

Bank transaction time and SMS arrival time are distinct. Pasted SMS can supply bank time; JSON/XML metadata can supply SMS arrival time. JSON supports `receivedAt` (epoch milliseconds or ISO timestamp), `transactionAt` (optional explicit bank timestamp), and `timeZone` (`Asia/Seoul` or `Asia/Ho_Chi_Minh`). The existing Android `date` epoch-millisecond field is treated as SMS arrival time. `sender` is the SMS sender/bank, while the payer is extracted from the message body.

Source precision is preserved: `14:32`, `14:32:18`, and `14:32:18.123` remain visibly different. Missing bank time is not replaced with SMS arrival time. Time-zone defaults come from currency (Korea +09, Vietnam +07) when the message lacks a zone; the details view discloses that assumption. Filters and day-period charts use the selected time zone and timestamp basis. Time-only ranges crossing midnight are supported. Low-precision timestamps overlap ranges within their known minute/second; their exact order inside that interval remains unknown.

References identify duplicate notifications. Without a reference, available event timestamps participate in duplicate detection so otherwise identical messages received at different milliseconds survive. A reference is scoped by bank, account, currency, direction, and amount. Older date-only imports remain readable. Data that was discarded by the original prototype cannot be recovered retroactively.

Facebook labels are suggested only from an explicit message keyword, or set by the user. Bank messages are not independently verified against a Facebook order or a bank. Incoming credits count as money in; marking a record as between your own accounts excludes it from income. Its kind can be changed back through Transactions. Payment-list CSV exports include both timestamp values, precision, selected zone, and simulation status.

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
