# Money Keeper review and proposed Penny roadmap

Reviewed 17 September 2026. This is a review of MISA's public website, official Google Play listing, and documentation; it is not a hands-on test of the installed Android app. These are proposals, not implemented Penny features.

## Verified reference features

MISA's website advertises spending limits, reports, debt tracking, savings plans, sharing, synchronization, and Excel/PDF exports. [MISA website](https://moneykeeper.misa.vn/)

Its current developer-authored Android listing also describes voice entry, invoice scanning, automatic bank synchronization, multiple asset/account types, payment reminders, recurring transactions, and bill splitting. The listing was updated September 10, 2026. Supported banks, regional coverage, subscription requirements, and recognition accuracy were not established by this review. [Official Google Play listing](https://play.google.com/store/apps/details?id=vn.com.misa.sothuchi&hl=en)

An older MISA guide describes saved entry templates alongside scanning and recurring entries. This is historical documentation, not proof of its present UI. [MISA entry guide, October 2020](https://moneykeeper.misa.vn/huong-dan-ghi-chep-thu-chi-bang-ung-dung-tren-dien-thoai/)

## Recommended next prototype

### 1. Wallets and accounts

Add named accounts such as Cash KRW, Cash VND, Shinhan checking, Vietcombank checking, and a manually tracked e-wallet. Each transaction belongs to an account, while bank detection supplies a suggested account. Let the user enter an opening balance and its date. Current Penny bank labels and net cash flow are not reliable account balances.

Keep KRW and VND totals separate. Record transfers as linked movements; credit-card repayments must not repeat already-recorded purchases as spending. Cross-currency transfers should preserve the actual amounts on both sides and any separate fee.

### 2. Monthly category budgets

Add a monthly budget for each category and currency, showing spent, remaining, and percentage used. Example: Food & drinks has a KRW 300,000 limit. Use in-app indicators first; phone notifications can follow the Android implementation. Define treatment of refunds explicitly.

### 3. A stronger capture-and-review flow

Keep one review inbox for SMS, OCR, and direct manual entry. Suggest a matching existing transaction using amount, currency, date, account, and merchant similarity. Show the two source records and let the user confirm a merge; similar purchases must not be merged silently.

Offer an explicit 'Remember this merchant category' action after a correction. For example, normalize both 스타벅스 and STARBUCKS to the user's chosen category. Highlight uncertain OCR digits and preserve the original message or optional local receipt attachment for comparison.

This is a Penny-specific recommendation. The sources reviewed do not establish that MISA implements this exact matching behavior.

### 4. Local backup and restore

Before treating the prototype as a daily record, add a restorable backup including transactions, accounts, categories, rules, and budgets. Show a preview before restoring and prevent duplicates. Current CSV export is a report, not a complete backup. For Android, use durable local database storage; optional encrypted backups can follow.

## Subsequent features

- Recurring rent, utilities, subscriptions, and salary: distinguish scheduled expectations from posted payments; match incoming SMS to an existing scheduled item rather than double counting.
- Faster entry: a dedicated manual Add expense form, favorites/templates, and text such as 'coffee 6500 won'. Add Vietnamese/Korean voice entry after choosing an approach compatible with local processing.
- Month comparisons and merchant trends, preserving currency separation and comparing equivalent periods for an unfinished month.
- Savings goals, lending/borrowing records, and shared-expense tracking if needed.
- Vietnamese/Korean interface language settings.

Family synchronization and direct bank connections should follow validation of the local capture workflow. MISA's advertised bank synchronization does not establish that Korean banks are supported or that our app can reuse those connections.

## Suggested implementation order

Restorable backup → wallets/accounts → import matching and remembered categories → monthly budgets → recurring expenses → faster text/voice entry.

Keep the main mobile actions easy to reach: Add expense, Scan receipt, Import SMS. The home screen should prioritize this month's spending, remaining budget, and entries needing review.
