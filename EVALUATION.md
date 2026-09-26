# Penny evaluation and implemented plan — 26 September 2026

Reviewed the source, the existing regression suite, the desktop dashboard, and receipt/manual-entry flow. Penny already provides a useful KRW/VND prototype: local SMS parsing, review before import, OCR suggestions, separate incoming-bank-message analysis, honest timestamp precision, and dark/mobile layouts.

## Priorities completed

| Finding | Improvement | Acceptance check |
| --- | --- | --- |
| CSV is only a report; a lost browser profile loses the complete workspace. | Versioned JSON backups preserve all transactions, original SMS, timestamps, rules and budgets. Restore previews and merges; existing edits and limits win. | Downloaded backup validates; repeat restore skips duplicates; invalid content cannot alter records. |
| A saved-data load error falls back to demo data, but later filter changes could overwrite the unreadable original. | Storage adapter blocks ordinary writes after a load failure. Original data is downloadable; only an explicit valid restore unblocks it. | Regression tests cover malformed saved JSON and failed storage writes. |
| Manual entry is hidden inside the receipt scanner. | Dedicated Add transaction action for expenses, income, refunds and own-account transfers. | Browser save updates totals and survives reload; source label says Manual entry. |
| Deleting a transaction has no recovery action. | Undo banner restores the most recently deleted transaction during the current session. | Browser delete/undo restores the record and budget balance. |
| Monthly totals lack a spending target or useful comparison. | Currency-specific monthly budgets across all accounts, remaining/over-budget states, and comparison with the previous month. | Current month compares the same days in both months; future months and absent baselines have explicit messages. |
| A review badge is visible but there is no way to isolate flagged entries. | Overview review count opens a filtered Transactions list. Empty-filter messages explain why nothing matches. | A flagged synthetic backup entry appears alone in the review filter. |
| Publication depends on the former hosting platform. | Relative assets, hash routes, `.nojekyll`, and GitHub Actions for tests, syntax checks, and deployment of only `dist/`. Git transport uses SSH. | GitHub Pages availability is checked against the actual account; published URL must pass browser verification. |

## Further work, deliberately deferred

1. Test real, redacted Korean/Vietnamese bank templates and receipt photos; improve OCR and parser coverage from observed failures.
2. Add wallet/account identity and explicit reconciliation between receipt captures and bank messages for the same purchase. Do not silently deduplicate genuine repeated purchases.
3. Add installable/offline support, then native Android storage and opt-in SMS ingestion. A browser prototype cannot read the Android SMS inbox.
4. Add Korean and Vietnamese UI translations, recurring expenses and category budgets after the capture/review workflow is validated.

## Practical limits

Backups contain unencrypted personal records. They are downloaded locally, not uploaded to GitHub. Undo is limited to the last transaction deletion in the current session; bulk clearing still uses the existing confirmation flow. Budgets use gross recorded expenses, excluding refunds, income and own-account transfers. Comparison describes recorded activity, not a bank-verified account statement. No currency conversion is applied.

The GitHub Pages address is a different browser origin from the previous Sites address. Saved records do not migrate automatically. Reimport the original SMS files, or restore a Penny workspace JSON backup where available; CSV is not a restorable full backup. All GitHub project sites on the same `github.io` origin share browser storage scope, so host only trusted apps there.
