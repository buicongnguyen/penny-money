# Penny — web prototype

A responsive, device-local spending tracker for South Korea and Vietnam. Run `node server.mjs` and visit http://127.0.0.1:5173. No build or installation is needed. Run all checks with `node --test tests/*.test.mjs`.

## Try it

- Use **Add transaction** for a purchase, income, refund or transfer without needing an SMS or receipt. The latest transaction deletion can be undone in the current session.
- Set a monthly budget for each currency. Budgets cover all accounts; the comparison card follows the selected bank and compares matching days for the current month. Use **Review entries** to find flagged records.
- Use **Backup & restore** to download a complete JSON backup, preview a restore and merge records without overwriting existing edits. Keep backup files private: they include original SMS text.
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

When bank time has only minute, second, or partial-millisecond precision, distinct SMS arrival timestamps are retained as separate review candidates. Matching coarse bank times and message bodies receive a warning rather than silently discarding one payment. Exact repeated notifications and matching bank references are still skipped. Legacy fingerprints are handled without merging distinct arrival timestamps during backup restore.

Korean month/day and Vietnamese day/month dates use the selected or supplied year and remain flagged when inferred. Date-only JSON metadata supplies the date when a message includes only a clock; SMS arrival remains separate. Explicit bank debits stay money out even when a buyer refund is mentioned. Memo/name fields do not establish debit/credit direction.

Facebook labels are suggested only from an explicit message keyword, or set by the user. Bank messages are not independently verified against a Facebook order or a bank. Incoming credits count as money in; marking a record as between your own accounts excludes it from income. Its kind can be changed back through Transactions. Payment-list CSV exports include both timestamp values, precision, selected zone, and simulation status.

## Appearance and mobile use

Choose **Language → Tiếng Việt** in the top bar for Vietnamese, or **English** to switch back. On a first visit, Penny follows Vietnamese if it is the browser's primary language, otherwise English. An explicit choice is saved separately as `penny.language.v1`; switching language never saves or modifies the financial workspace. Labels, validation messages, categories, summaries and transaction dates/currency formatting follow the selected language. Native date/time picker controls follow the browser or operating system locale.

Original SMS, receipt text, payer/merchant names, bank names and notes remain as entered. Category/type/channel identifiers and JSON/CSV exports remain stable across languages, so existing records, filters and backups remain compatible. The interface language is independent of the receipt OCR language, currency and payment time zone.

Use the sun/moon button beside the Penny logo to switch between light and dark mode. The first visit follows the device color scheme; an explicit choice is saved separately as `penny.theme.v1` in this browser. If storage is unavailable, switching still works for the current session. The theme initializes before the styles load and also updates native date/time controls.

Phones use labeled bottom navigation, stacked transaction cards, larger touch controls, single-column forms, and safe-area spacing. Incoming time/channel/search filters can be expanded when needed; the hourly chart scrolls horizontally on phones. All web features remain available in a mobile browser. These changes do not add native Android SMS access or produce an APK.

The local server uses port 5173 by default. Set `PENNY_PORT` to use a different available port.

## Data and limitations

Transactions, budgets and bank rules live in browser localStorage for this origin and browser profile. They are not uploaded, synced, or encrypted by this prototype. Clearing browser/site data removes them. JSON backups are restorable; CSV is a filtered report only. Backups retain original message text and bank/SMS timestamps. Restore merges personal records, skips matching IDs/SMS fingerprints, preserves existing edits and budget limits, and replaces example records when starting from demo mode. Invalid stored data is protected from automatic overwrites and can be downloaded for recovery. Receipt images are transient and are not stored. Third-party requests download Google Fonts and Tesseract OCR code/models, not your SMS or images. OCR first use needs internet. The app is not currently a fully offline PWA.

Moving from the previous Sites address to GitHub Pages creates a new browser storage origin. Existing records do not move automatically: restore a Penny JSON backup where available, or reimport original SMS files. CSV does not preserve every field. GitHub Pages project paths on one account share an origin; only host trusted apps alongside a local-data application.

Month/currency preferences use a separate storage key and never rewrite the ledger. Ledger and restore writes use Web Locks plus a saved-snapshot check to prevent an older tab from overwriting newer records. A stale tab shows a warning and keeps its edits temporary: download a JSON backup if needed, reload the latest records, and review any restore. Deletions are not automatically merged or resurrected. Browsers without Web Locks cannot persist edits but can download temporary records as JSON. Refresh all open Penny tabs after updating the app so every tab uses the current save safeguards. These fixes do not automatically rewrite historical records or recover transactions discarded by older versions.

## GitHub Pages

The source remote uses SSH: `git@github.com:buicongnguyen/penny-money.git`. The workflow in `.github/workflows/pages.yml` runs the tests and syntax checks on pushes to `main`. It packages only `dist/`, with relative assets and hash routes that work under a project subpath. No backend, credentials, user records or build dependencies are needed at runtime.

In repository Settings → Pages, choose GitHub Actions. Set the repository Actions variable `PAGES_ENABLED` to `true` once Pages is available for the repository, then run the workflow or push to `main`. This gate lets tests run before publication is enabled. The deployment job requires the standard `pages: write` and `id-token: write` permissions. The old `.openai/hosting.json` is retained as historical project metadata and is not in the published directory.

GitHub Free requires a public repository for Pages; private repositories require a supported paid plan. Hosting configuration follows [GitHub's custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

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
