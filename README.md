# Pocket Expense — Android widget prototype

Offline personal expense tracker in BDT, with an Android home-screen widget.

## Version 0.2.1 - PDF export
Choose a month in Monthly overview, then tap Export PDF. The Android app loads a dedicated report into an off-screen WebView and opens Android PrintManager. Choose Save as PDF and select a destination. The report includes all expenses for that month regardless of the search filter, totals, savings allocation, category limits and payment summaries. It follows the selected app language. In the browser preview, a report tab opens; use the browser Print or Share > Print action to save a PDF. Pop-ups must be allowed.

PDF rendering, pagination and Android print lifecycle remain unverified without an Android SDK/device or browser renderer. Report content and export dispatch tests pass. Android WebView printing guidance: https://developer.android.com/training/printing/html-docs

## Version 0.2 improvements
- Two native widget providers: compact 4 × 2 and detailed 4 × 3. Actual cell size varies by launcher.
- English/বাংলা interface and widget labels.
- Remember last category/payment; Food, Transport, Groceries shortcuts.
- Edit, repeat, confirmed delete and 15-second undo.
- Cash, bKash, Nagad, Bank, Card; regular/occasional expense types.
- Month selector and per-month category breakdown; optional category limits.
- Savings reserve is subtracted from the total allocation, not recorded as an expense.
- Available/day = max(0, allocation − reserve − month expenses) / remaining days including today.
- Pace compares spending-budget fraction with calendar-month fraction; amber ahead, muted red over budget.
- Monthly recurring bills require review and confirmation; day 29–31 clamps to the month’s last day.
- Weekly comparisons cover two completed seven-day windows and only appear if both contain records.
- JSON backup/restore with legacy data migration; CSV export with formula escaping.
- In-app backup reminder after seven days with unbacked changes. Android marks backup complete only after a successful file write; browser download completion cannot be verified.
- No background reminder notifications. The reminders appear when the app is opened.
- Recorded monthly budget snapshots are retained when settings change. Defaults repeat for future months; months without a recorded snapshot use the current default.

## Features
- Emerald and lime 4 × 3 home-screen widget; tap + for expense entry.
- Today and current-month spending; remaining monthly budget.
- Integer paisa storage, eight categories, notes and historical dates.
- Monthly category breakdown and searchable history; confirmed deletion.
- Available per day uses the spending allocation after the savings reserve.
- JSON backup and replacement restore via Android file picker.
- No internet permission, account, ads, bank linking or analytics.

## Validation
`node tests/core.test.cjs` and `node tests/ui.test.cjs` pass. These verify core calculations, date boundaries, migration, restore validation, editing/undo, bill confirmation and export dispatch. UI tests use DOM stubs; no browser screenshot or Android build/device validation was possible. XML is well formed.

## Status
Source prototype. Android SDK was unavailable in the creation workspace. No APK has been compiled or tested. Browser checks do not validate Android compilation, widget rendering, WebView file picking or launcher behavior. Widget refresh is requested after expense/budget changes and every 30 minutes; actual periodic updates can be delayed by Android. Layout depends on launcher size and font scaling.

## Build with a PC
Install Android Studio with SDK 35 and use JDK 17. Open this folder, allow Gradle sync, then Build > Build APKs. Or install Gradle 8.9 and run `gradle assembleDebug`. A Gradle wrapper is not included.

## Build from a phone with GitHub
Use a private GitHub repository. Extract the ZIP and upload the *contents* of pocket-expense at repository root, including .github/workflows/build.yml. Creating the workflow through GitHub's web editor may be easier because phone file pickers hide .github. Open Actions > Build Android APK > Run workflow. Download Pocket-Expense-APK from the completed run, extract app-debug.apk, and install it. GitHub runner availability and usage limits apply. A debug APK is for personal testing, not a Play Store release.

## Add widget after installation
Open Pocket Expense and enter a monthly budget. Tap Add widget, or long-press your home screen > Widgets > Pocket Expense. Add an expense and check widget totals. The app starts empty, without sample transactions.

## Device validation before relying on it
Check add/delete persistence after force-close, current-month totals, rollover at midnight/month-end, budget overrun, decimal amounts, widget + action, resizing, and backup/restore. Verify restored totals before uninstalling or changing devices. This app records expenses only; it does not track income, refunds, debt or multiple currencies.

## Files
app/src/main/assets/index.html is also an independent browser preview using browser local storage. Browser records and Android records are separate. Do not rely on browser preview storage without a backup.

Implementation follows Android AppWidgetProvider and RemoteViews guidance:
https://developer.android.com/develop/ui/views/appwidgets
