# EviFinance revamp: working checklist

Source of truth for progress across sessions. The full visual plan (mocks, flows, rationale) is `.lavish/ui-consistency.html`.
IDs match the plan: **B** = bugs, **BE** = backend, **F** = foundations, **W** = waves, **U** = UX rules, **P** = polish, **M** = optional suggestions.

> **Status:** hotfix and W0–W6 done on `feat/revamp` in both repos (not released, not deployed). Left: a low-end phone check, the Hindi review, then release when the owner says so. Nothing is released until the owner says so. Tick items here as they are done (`[x]`), with the commit hash.

## Ground rules

- One branch per repo for the whole plan: `feat/revamp` in **MicroFinance** and **MicroFinance-backend**, both from the latest `main`. No per-phase branches. Leave `feat/redesign*` untouched.
- Commit backend changes currently uncommitted on `main` **before** branching.
- Merge `main` into `feat/revamp` regularly. No APK build for release and no backend deploy until approved. The backend deploys first (backward compatible), then the app.
- Commit messages start with the item ID, e.g. `W2: payment sheet`, `B-1: send all installment fields`.
- Every wave ends with the visual check: screenshots at 360dp and 412dp × light and dark × en and hi, reviewed for misalignment, wrapping and cramped spacing. Check hidden gestures and automatic behaviours too.
- Test matrix per wave: admin + employee × light + dark × English + Hindi × small + large phone × 130% font × offline or slow network. Money totals are checked against the backend.

## Decisions (locked)

- Build-time white-label: `brands/<id>/`, `npm run brand <id>`, Android flavors. Package ID `com.softwares76.microfinance[.brand]` (a one-time reinstall for the current client).
- Theme = palette × mode (Indigo, Emerald, Evi, Saffron × light, dark, system), chosen in Settings.
- TypeScript for new and rewritten files. TanStack Query for data. React Native Paper removed.
- Shared screens with `can()` role config wherever both roles show the same data (13 screens). Role-specific screens only where the jobs differ. A role-aware API layer maps admin and employee endpoints to one type.
- Navigation: 5 tabs + More per role. Admin: Home, Customers, Loans, Leads, More. Employee: Home, Collect, Customers, Leads, More.
- English + Hindi now (Claude drafts, a native speaker reviews). Marathi later: the switch becomes a dropdown at 3 languages. The app owns UI text; the server owns result messages via `Accept-Language` + `code` (BE-20).
- Login: a visible Employee/Admin switch that remembers the last choice. Quick unlock (fingerprint or phone PIN) after the first password login, while the 30-day token is valid. The password is never stored.
- Receipts go from the phone only (SMS app or WhatsApp, pre-filled). The native SMS module and the 8 SMS, phone and storage permissions are removed.
- Toasts: style A, a floating glass pill, from one root `ToastHost`. Undo is offered only where the backend can truly restore (see the Undo table in the plan).
- Loan number stays manual. Admins can record payments. One list of 7 loan types for leads and loans; Create loan asks for it.
- Menu items: Payments, My payments, Settings, Help & support, App lock, Notifications (a server list, no push). Savings Account removed. No self-service password change for employees. Admins get change password and backup.
- Welcome screen dropped. The hidden 5-tap force delete is kept, with the A6c safety sheet and a server snapshot (BE-22).

## Hotfix (on `feat/revamp`, not released)

- [x] **B-1** (app 96229da · backend 64f343e): Editing an installment never saves. The admin fills in status, amount, date, method, penalty and collector, then gets an error. _Cause:_ The modal gathers every field, but handleSaveSchedule sends only {id, collectedBy}. The server requires status and returns 400. _Where:_ Loans/RepaymentSchedule.js → RepaymentScheduleController.updateRepaymentSchedule
- [x] **B-2** (app f017b3e): A successful Close loan shows a red error toast ("Loan closed successfully") and stays on the screen. _Cause:_ It checks response.status !== 200, but the API returns status: 'success'. _Where:_ Loans/CloseLoan.js
- [x] **B-3** (app e38272d · backend c8c719e): Employees can't open a loan's Schedule (403). _Cause:_ The employee schedule screen calls the admin-only /api/admin/loan/repayment/schedule. _Where:_ EmployeeHome/…/Loans/RepaymentSchedule.js
- [x] **B-4** (app 2d1d771 · backend 6294b15): Admins see "Pay Now" on NPA/SMA lists, but it always fails (403). _Cause:_ Both pay endpoints reject anyone who isn't an employee. Admins can't record payments anywhere (decided: admins may collect, via BE-10). _Where:_ LoanStatusDetailsScreen.js → LoanCollection.payOldInstallment
- [x] **B-5** (app 451012a · backend db92166): The employee Home "Customers" count is always empty. _Cause:_ It calls the admin-only /api/admin/customer/count/total. _Where:_ EmployeeHome/Home/HomeScreen.jsx
- [x] **B-6** (app 61f2e1b · backend be629e0): Approving a lead never links it to a customer. The admin re-types everything in Customer registration. _Cause:_ convertLeadToCustomer exists in the controller but has no route. _Where:_ AdminLeadController.js, routes/admin/lead/leadRoutes.js
- [x] **B-7** (app 695472b · backend 6158bc9): Lead loan types (Personal, Home, Business, Education, Vehicle, Gold, Other) don't match loan types (Personal, Business, Other). _Cause:_ Two separate lists, so a "Gold Loan" lead can't become a Gold loan. _Where:_ EmployeeCreateLead.js, LoanModel.js
- [x] **B-8** (app 0119860): The login response, including the token, is written to the log. _Cause:_ console.log('Login response:', response) _Where:_ LoginScreen.js
- [x] **B-9** (app 7dfe9a2): Employees see only the first 200 installments of a long daily loan, with no "load more". _Cause:_ LoanDetalis.js requests limit=200 but sets "has more" only when exactly 5 come back (length === 5). A daily loan of 300–2200 days has 300–2200 installments, so everything after #200 is silently missing. _Where:_ EmployeeHome/…/Loans/LoanDetalis.js line 89
- [x] **B-10** (app 15a90b8 · backend 1563653): Payment history shows "Remaining after payment: N/A" for every payment an employee records. _Cause:_ `applyWaterfallPayment` never sets `balanceAfterPayment`. _Where:_ `helpers/paymentAllocation.js` → BE-24
- [x] **B-11** (backend 3ea0d35) (security): any employee can list all overdue loans with customer contact details. _Cause:_ `getLoanStatus` / `getLoanStatusStatistics` only scope to the employee when `assignedTo=me` is sent. _Fix:_ force `assignedTo = req._id` for employees. _Where:_ `controllers/admin/loanStatus/loanStatusController.js`
- [x] **B-12** (app 740480f · backend c015772) (security): "inactive" employees can still log in and work. _Cause:_ `accountStatus` is never checked at login or in `helpers/token.js` (only `isDeleted` is). _Fix:_ refuse login and end sessions when inactive; the app shows "Your account was deactivated". _Where:_ `controllers/employee/authController.js`, `helpers/token.js`

## Backend (`MicroFinance-backend`)

- [x] **BE-1** (backend c8c719e): Employee schedule route: GET /employee/loan/repayment/schedule, reusing getRepaymentSchedule with the canAccessLoan check _Files:_ routes/employee/loans/loanRoutes.js, RepaymentScheduleController.js _For:_ B-3, E6b
- [x] **BE-2** (partly done: `GET /employee/dashboard` returns `customersCount`, backend db92166; the rest comes in W2): GET /employee/dashboard → due today (count, amount due, amount collected), my customers count, lead stats, my SMA/NPA buckets _Files:_ new controllers/employee/DashboardController.js _For:_ B-5, E1 _(backend 543ccab)_
- [x] **BE-3**: Admin dashboard adds pendingRepayments, pendingLoans, collectedToday _Files:_ controllers/admin/DashboardController.js _For:_ A1, A20 badges _(backend 9696b0f)_
- [x] **BE-4** (backend be629e0): Route POST /admin/lead/:id/convert (existing convertLeadToCustomer). Add POST /admin/lead/:id/create-customer, which registers and converts in one step from the lead's data _Files:_ routes/admin/lead/leadRoutes.js, AdminLeadController.js _For:_ B-6, A14
- [x] **BE-5** (backend 6158bc9): Decided: one list of 7 loan types (Personal, Home, Business, Education, Vehicle, Gold, Other) for leads and loans; old "Personal/Business/Other" values stay valid _Files:_ LoanModel.js, LeadCustomersModel.js _For:_ B-7
- [x] **BE-6**: Employee loan details: default page size 20, plus scheduleSummary (paid, overdue, pending, next due) and includeDocuments for assigned loans _Files:_ LoanCollection.getLoanDetails _For:_ E6, E6b _(backend 45d8942)_
- [x] **BE-7**: Employee repayment history without loanId → my collections (filter by date and status) _Files:_ LoanCollection.getRepaymentHistory _For:_ E12 My payments (P-2) _(backend 45d8942)_
- [x] **BE-8**: Text search q on admin customers, employee customers and admin loans (name, phone, loan number) _Files:_ customerController.getCustomers, LoanCollection.getCustomers, loanController.getLoans _For:_ A2, A5, E4 _(backend 45d8942 · 6e34355 · ace3332)_
- [x] **BE-9**: Status recalculation as POST (keep the GET alias). Return lastRunAt from the existing CronRun model _Files:_ routes/shared/sharedRoutes.js, systemController.js _For:_ A18 _(backend 0ff54b7: POST + GET alias, last run)_
- [x] **BE-10** (backend 6294b15): Decided: allow admins in payACustomerInstallment (collectedBy = null → shown as "Admin", which the schedule already supports) _Files:_ LoanCollection.js, routes/admin/loans/loanRoutes.js _For:_ B-4
- [x] **BE-11**: Correctly spelt aliases: /apply/penalty, /remove/penalty, /profilePicture (keep the old spellings) _Files:_ route files _For:_ clean API client _(backend fa1c430)_
- [x] **BE-12**: One response shape {status, message, code, data, meta:{page,totalPages,total}}. code drives app logic; title/message arrive already translated (BE-20). Fixes the meesage typo. _Files:_ middleware/errorHandler.js + controllers as they're touched _For:_ F-7 i18n, U-06 _(backend c4c4795; controllers move to codes as they're touched)_
- [x] **BE-13**: Deployment per brand: each brand has its own backend deployment and database, with its own update APK and URL (same as today's single deployment). No code change, just documented in the brand README. _Files:_ docs _For:_ white-label _(app 8436a28: brands/README.md)_
- [x] **BE-14**: `POST /shared/client-errors` for crash reports, written to the winston logs, limited per device. _Files:_ new route + controller _For:_ S8 crash screen _(backend 9855aea)_
- [x] **BE-15**: Add the remove-penalty and backup routes to the typed API client (no server change). _Files:_ app API client _For:_ A7b, X3 _(app ee1be66 removePenalty · 4344c30 backup)_
- [x] **BE-16**: Notifications: model, notify() helper called from 9 places, 4 endpoints, 09:00 follow-up cron, 90-day cleanup (see Round 9) _Files:_ new NotificationModel.js, controllers/shared/notificationController.js, crone/registry.js _For:_ X5, bell badge _(backend cf1c4dc)_
- [x] **BE-17**: Customer summary (borrowed, outstanding, on-time rate, since) on admin and employee profile responses _Files:_ customerController.getCustomers, LoanCollection.getCustomerProfile _For:_ A3 _(backend 45d8942 · 00165df · 6e34355)_
- [x] **BE-18**: Upload size limit on multer; Cloudinary thumbnails for the document grid _Files:_ config/storageConfig.js, storageService.js _For:_ A8, F-9 _(backend f8e00d9)_
- [x] **BE-19**: Undo endpoints, all admin-only and time-limited: (a) un-approve a payment (Approved → Pending); (b) un-approve a loan (Active → Pending, only while there are no repayments); (c) restore a soft-deleted lead; (d) restore a soft-deleted employee. No amounts ever move. _Files:_ loanController.js, routes/admin/loans/loanRoutes.js _For:_ Undo on the approve toast _(backend ace3332)_
- [x] **BE-20**: Server-side message translation: locales/en.json and hi.json, and middleware that reads Accept-Language and fills title/message from code + params _Files:_ new src/i18n/, middleware/errorHandler.js, controllers as touched _For:_ Server-driven toasts in Hindi _(backend c4c4795)_
- [ ] **BE-21**: (Optional, later) One route per resource that filters by the caller's role, like `/shared/search`. _Files:_ routes _For:_ fewer endpoint pairs
- [x] **BE-22**: Before a force delete of a loan (and before deleting a customer), save a JSON snapshot of the loan, schedules, repayments, penalties and document records to a DeletionArchive collection, with who and when. Kept for 90 days. It's for recovery by hand, not an app feature. Also return the counts shown in A6c (GET /admin/loan/:id/delete-preview). _Files:_ loanController.deleteLoan, customerController.deleteCustomer, new DeletionArchiveModel.js _For:_ A6c, safety _(backend ace3332)_
- [x] **BE-23**: Optional: include lastSeen and the latest loginHistory date in the admin employee response _Files:_ employeeController.getEmployees _For:_ A16 "Last login" _(backend 472566e: GET /admin/employee/profile)_
- [x] **BE-24** (backend 1563653): Set `balanceAfterPayment` in `applyWaterfallPayment`, and return it with `outstandingAmount` in the `/pay` reply (for receipts). Optionally fill old records with a one-off script. _Files:_ helpers/paymentAllocation.js, LoanCollection.js _For:_ B-10, receipts

## Foundations (W0)

- [x] **F-1 · Folder structure by feature**: src/features/<loans|customers|leads|payments|reports|staff>/ each holding api.ts, components/, admin/ screens and employee/ screens. Plus src/ui (kit), src/theme, src/brand, src/i18n, src/lib (API client, formatters), src/navigation. The same 40 screens end up in predictable places. _(src/features, src/ui, src/lib, src/theme, src/brand, src/i18n, src/navigation; old screens move in as they're replaced)_
- [x] **F-2 · No URLs inside screens**: Today 67 apiCall('/api/…') strings are scattered across screens. Each feature's api.ts owns its endpoints (loansApi.schedule(loanId, {page, status})), so a backend path change touches one file. _(api client 606efd1; screens move over wave by wave)_
- [x] **F-3 · A data layer (Q-A)**: One library handles loading, error, paging, pull-to-refresh, caching and "refresh after approve". Without it, every screen repeats ~40 lines of useState and useEffect (as today), and offline caching (U-10) would be added screen by screen later. _(606efd1)_
- [x] **F-4 · TypeScript for new code (Q-B)**: App.tsx and tsconfig.json already exist. Typing the API responses (Loan, Schedule, Repayment, Lead) catches field mistakes like LogicNote vs logicNote and totalPenalty vs totalPenaltyAmount at build time. Adopting it later means re-touching every file. _(57155d9)_
- [x] **F-5 · One source for enums and statuses**: Loan, schedule, repayment, lead and document statuses, payment methods, frequencies and durations are defined once (mirroring the Mongoose enums), with a colour tone and a t() label each. Today "Approved" is yellow on one screen and green on another. _(606efd1)_
- [x] **F-6 · Permissions in one place**: can(user, 'loan.close') decides what each role sees (U-13). Screens never check user.role === 'admin' themselves, so adding a role later (for example a branch manager) doesn't touch every screen. _(606efd1)_
- [x] **F-7 · i18n from the first screen**: i18next with en and hi JSON files, with amounts and dates formatted by locale. Hindi text is ~30% longer, so layouts are checked in Hindi as part of each wave. _(606efd1)_
- [x] **F-8 · Navigation as config**: Each role's tabs and screens are listed in one file per role, and brand feature flags (for example features.leads) can hide a tab there. No more headers built inline in the navigator. _(app 4344c30)_
- [x] **F-9 · Image rules**: `react-native-image-crop-picker`. Profile and lead photos: square 512px, JPEG 0.8. Documents: free, A4 or rotate crop, 1600px max, JPEG 0.75, under 400 KB. Upload progress + retry. _(606efd1)_

## Waves

### H · Hotfix on today's app (S) (built on `feat/revamp`, released only when approved)

- [x] B-1: Loans/RepaymentSchedule.js handleSaveSchedule sends every field from the modal; stays on the schedule and refreshes instead of going back
- [x] B-2: CloseLoan.js checks response.status === 'success'
- [x] B-3: backend BE-1 (employee schedule route) + EmployeeHome/…/RepaymentSchedule.js calls it
- [x] B-4: backend BE-10 (admins may record payments) + LoanStatusDetailsScreen uses /pay
- [x] B-5: employee Home customer count from an employee-scoped count (a small part of BE-2)
- [x] B-8: remove the console.log of the login response
- [x] B-9: set "has more" from the page size actually requested (and page 20 at a time, with BE-6)

**Done when:**each bug's steps pass with an admin and an employee login on a real phone. The backend is deployed before the APK.

### W0 · Foundation, with no visible change to users (L)

- [x] TypeScript setup; src/features/*, src/ui, src/lib, src/theme, src/brand, src/i18n folders (F-1) _(app 57155d9; feature folders fill in with each wave)_
- [x] lib/api.ts: an axios instance with the token, Accept-Language, a 15 s timeout, the 401 → logout handler, ApiError, and typed feature APIs (F-2) _(app 606efd1; typed feature APIs are added with each feature's screens)_
- [x] TanStack Query provider, query-key helpers, and useInfiniteList (F-3) _(app 606efd1)_
- [x] Theme: palettes × modes, ThemeProvider, makeStyles, and adapters for navigation, status bar and charts _(app ced0fa7)_
- [x] Brand: brands/evi/ (with logo-dark.png), npm run brand, Android flavors, new package ID _(app 94ea1a7, 512d385)_
- [x] i18n: i18next, en and hi, formatMoney, formatDate, amountInWords (en and hi) _(app 606efd1, 6d6e1e3)_
- [x] UI kit: Button, IconButton, TextField, MoneyField, Chips, UnderlineTabs, SegmentedControl, Card, ListRow, Avatar (with cache), StatusBadge, EmptyState, ErrorState, Skeleton, BottomSheet, ConfirmSheet, Header, Stepper, Timeline, Switch, ToastHost, AppModal, OfflineBanner, BrandLogo _(app d29b2ef)_
- [x] Utilities: pickImage (crop and compress, F-9), ensurePermission, can() (F-6), the status map (F-5), openSms and openWhatsApp _(app 606efd1)_
- [x] Remove React Native Paper, add the ESLint no-hex rule, npm run release _(app 57155d9, 512d385)_
- [x] A developer-only kit gallery screen showing every component _(app d29b2ef)_
- [x] BE-12 one response shape + BE-20 server-side message translation _(backend c4c4795)_
- [x] BE-11 correctly spelt route aliases _(backend fa1c430)_
- [x] BE-14 /shared/client-errors _(backend 9855aea)_

**Done when:**the kit gallery looks right in 4 palettes × light/dark × English/Hindi at 360dp width and 130% font size. npm run release produces app-evi-x.y.z.apk with the new ID. The old screens still work unchanged.

### W1 · New shell around the old screens (M)

- [x] Navigation configured per role (F-8): 5 tabs + More for admin and employee. Old screens are mounted inside the new tabs until their wave replaces them _(app 4344c30)_
- [x] S1 Splash, S2 Login (role switch, logout reason), S2b Quick unlock and app lock, S4 permissions explainer _(app 4344c30; quick unlock uses react-native-biometrics (keychain 8 has no PIN fallback on Android)_
- [x] Android: delete SMSModule and SMSPackage; remove the 8 SMS, phone and storage permissions from the manifest; save to Downloads through Android's media storage _(app 9a06de2; WRITE_EXTERNAL_STORAGE kept only up to Android 10)_
- [x] Logout clears drafts, cached lists, recent searches and quick unlock _(app 4344c30, 9a06de2)_
- [x] S5 update sheet, S6 states, S7 offline banner, S8 crash screen → BE-14; the single ToastHost, with all 39 <CustomToast /> removed _(app 4344c30; backend c42c274 (size + notes)_
- [x] X1 Profile (photo crop), X2 Settings (mode, palette, language), X3 Security (admin: password, backup), X4 Support, X6 About _(app 4344c30)_

**Done when:**both roles can log in with a password, then with fingerprint, and reach every old feature from the new tabs. Switching theme and language applies without a restart. A toast shows above an open modal.

### W2 · Employee field flow (L)

- [x] E1 Home, E2 Collect, E3 PaymentSheet (MoneyField, amount in words), E3b PenaltySheet, E11 receipt (SMS and WhatsApp) _(app ee1be66)_
- [x] E4 My customers, E5 profile, E6/E6b loan (grouped repayments component, reused in A7), E7 overdue list _(app ee1be66)_
- [x] E12 More + My payments _(app ee1be66)_
- [x] Backend: BE-1, BE-2, BE-6, BE-7, BE-8 (employee customers) _(backend 543ccab, 45d8942, 00165df)_

**Done when:**an employee can do a full day in the field: open the app, see what's due, record a cash, a UPI and a partial payment, apply a penalty, send an SMS and a WhatsApp receipt, check the overdue list, and see "My payments". On weak data, the offline banner and cached lists work.

### W3 · Admin loans and payments (L)

- [x] A1 Home (badges), A5 Loans, A6 loan with 3 tabs, A7/A7b/A7c schedule, installment sheet and edit (with penalty apply and remove), A8 documents (crop, compress, thumbnails) _(app a013e44)_
- [x] A9 create loan (3 steps, 7 loan types, calculator preview), A10 pending, A11 close loan with confirmation _(app a013e44)_
- [x] A12 payments grouped by collector, approve with Undo, reject with reason _(app a013e44)_
- [x] Backend: BE-3, BE-5, BE-10, BE-18, BE-19 _(backend 9696b0f, 6158bc9, 6294b15, f8e00d9, ace3332)_

**Done when:**an admin can create a loan with documents, approve it, see an employee's payment arrive, approve it and undo it, edit an installment, and close a loan with and without forgiveness. The totals match the backend's figures to the rupee.

### W4 · Customers, staff, leads (M)

- [x] A2 customers, A3 profile (summary numbers), A4 form; A15/A16 employees (deactivate); A13/A14/A14b leads + convert; E8/E9/E10 employee leads; A19 search _(app ee44d73 · backend 685acf3, 8593a66, 63c4e9d, c78efb5)_
- [x] Backend: BE-4, BE-8, BE-17 _(backend be629e0, 685acf3, 45d8942, 6e34355, ace3332)_

**Done when:**an employee adds a lead with a cropped photo, records a follow-up and requests conversion, and the admin approves and converts it into a customer. The new customer has the lead's details, and a loan can be started straight away.

### W5 · Reports, risk, notifications (M)

- [x] A17 reports (bars, PDF and Excel, history), A18 risk (cron status, run settlement), X5 notifications + bell badge, X7 calculator, hidden Diagnostics _(app 1035ccc · backend cf1c4dc, 0ff54b7, ac89738, 818e338, 9b2d0a9, 22e1143)_
- [x] Backend: BE-9, BE-16 _(backend 0ff54b7, cf1c4dc)_

**Done when:**every notification event in the BE-16 table reaches the right person and opens the right screen, and the risk screen shows last night's run.

### W6 · Clean-up and final checks (S–M)

- [x] Delete every old screen file, HomeDARK-.js, RepaymentApprovalScreenOld.js and the unused WelcomeScreen.js; remove md5, @react-navigation/stack, material-top-tabs and react-native-rename; remove react-native-image-picker and react-native-toast-message _(app 1035ccc, 79a0b2d; the three named old files were already gone)_
- [ ] Strip console output from release builds, check list performance on a low-end phone, run an accessibility pass _(console stripped: app 79a0b2d; accessibility pass: app 8470552. Still open: list performance on a low-end phone, which needs a device.)_
- [ ] A native speaker reviews the Hindi text in the app and on the server _(every string has Hindi; review sheet with all 987 strings: docs/hindi-review.md)_

### W7 · Polish: depth, motion, speed (M–L)

Added 2026-10-01 after device testing. The screens matched the mocks' layout but felt flat, static and slow. This wave adds the qualities that made the mocks look good.

- [x] **W7-K · Kit**: shadow tokens, press spring (PressableScale), floating tab bar with a sliding pill, sliding segmented control and underline tabs, tinted chips, shimmer skeletons, field focus ring, header glow, content fade-in, `Screen defer`, `Appear`, list batching settings, memoised rows, freezing of hidden screens. _(b83e460)_
- [ ] **W7-S · Screen fidelity**: compare every screen with its mock (PNGs in `.lavish/mocks/`, named by screen ID) and close the gaps. _Done in code, not yet checked on a device: E1 (5ebcd97), E2 (d322f3e), A3/E5 (e2d858a), the header on every screen (cc7435c), A6 (5c50797), A7 (1d4fb0b), A12 (934bc98), A2 (2a0f851), A5/A13/A15 (55ef3e8), A20 and settings groups (5cede92), E9/A14 (c0014a4), E3 (4677463), E7 (5fa0f11, backend 088b1e9), A9 stepper (50f4788), S2 (6cb95cd), A11 (99d337c), A1 kit pieces (012b35a), X1 (8be58bb), X2 (ee935f1), X5 (1ffa13e), X7 (19d09c3), A17 (d281a13), A18 (c85ed57), A16 (83619ac), E10 (2ad1ede), A4 (864305a); S5 already matched._ Not compared one by one (they get the kit changes): S8, M-1, M-2, M-3, M-5. **Nothing in W7 has been seen on a device yet.**
- [ ] **W7-M · Motion on screens**: _Done: staggered entrances (Homes, profile, loan, lead, login), first-screenful list entrances, `defer` on Loan and Lead, count-up on hero and outstanding amounts, growing progress bars and step lines, tab content fade, Create loan step slides, spring sheets (e99c3ad)._ Rows leaving a list: Payments approve/reject/Undo (dec9673), Collect paid → Done. Inter font (a1e975c), system haptics (e79c5e9), brand-coloured pull-to-refresh (a8227f6).
- [ ] **W7-P · Speed check on a release-mode build** (debug builds on an emulator are several times slower): scroll long lists, push heavy screens, and record any dropped frames.

## UX rules (every screen)

- U-14 · List rows: photo + at most 2–3 lines
- U-15 · Photos everywhere a person appears
- U-16 · At most 3 tabs, and chips that scroll
- U-17 · No stat strips of 4–5 tiles
- U-18 · Details as label / value rows
- U-19 · Secondary actions are text buttons
- U-01 · Five tabs per role
- U-02 · Back button on every screen that isn't a tab
- U-03 · Compact floating actions
- U-04 · Easy to tap
- U-05 · Long lists: group and page, never cut
- U-06 · Loading, empty and error states
- U-07 · Forms
- U-08 · Money and destructive actions
- U-09 · One status language
- U-10 · Weak networks
- U-11 · Numbers and dates
- U-12 · Readable in both modes
- U-13 · Each role only sees what it can do

## Polish items

- [x] P-01 · Amount in words _(app ee1be66)_
- [x] P-02 · ₹ grouping while typing _(app ee1be66)_
- [x] P-03 · Badges on tabs _(app a013e44)_
- [x] P-04 · Haptics _(app ee1be66, a013e44: payment recorded/approved, copy)_
- [x] P-05 · Filters and tabs are remembered _(app 6cc7fef: Loans, Payments, Leads)_
- [x] P-06 · Smart defaults _(payment method remembered; app ee1be66)_
- [x] P-07 · Tap to copy _(app 6cc7fef)_
- [x] P-08 · Empty states that help _(app ee1be66 onward: each empty list has one next step)_
- [x] P-09 · Map from address _(app ee1be66: customer, employee and lead addresses)_
- [x] P-10 · Keyboard never hides the button _(app d29b2ef: Screen keyboard avoidance, floating buttons)_
- [x] P-11 · Subtle motion _(app d29b2ef: toasts, sheets, skeletons)_
- [x] P-12 · Photo viewer everywhere _(app ee1be66)_
- [x] P-13 · End-of-day summary for employees _(app ee1be66)_
- [x] P-14 · Approve a whole collector group _(backend ace3332, app a013e44)_
- [x] P-15 · Drafts survive _(Create loan; lead and customer forms in W4 — app a013e44)_
- [x] P-16 · Collect list order _(app ee1be66)_
- [x] P-17 · Big-number check before money is sent _(app ee1be66)_
- [x] P-18 · Recent customers on Search _(app ee44d73)_

## Feasibility adjustments (final audit, round 23)

- **BE-10:** `payACustomerInstallment` requires an Employee; allow admins with `collectedBy: null` and skip the `collectedRepayments` push.
- **BE-4:** `convertLeadToCustomer` requires `followupStatus === "Completed"`; the new create-customer endpoint marks it Completed as part of the admin's approval (logged in the audit log).
- **M-2:** the penalty rate is used in two places (`RepaymentScheduleController` and `crone/RepaymentScheduleCron.js`); both read the setting. SMA thresholds apply to new loans only.
- **M-12:** the backup needs the `mongodump` program on the server; verify once per deployment.
- **M-5:** `deleteLoan` must also delete the loan's statements and their files.

## Optional suggestions: decided (round 21)

- [x] **M-1 · Audit log**: included. _W3 screens done (loan Activity, admin Activity log; app a013e44). W0 part done: model, audit() helper and calls in every money/status controller (backend 066ddb0, 85d6124)._ W0: an `AuditLog` model + `audit()` helper called from every money- or status-changing controller. W3: the loan "Activity" screen + the admin Activity log in More.
- [x] **M-2 · Business settings**: included. _W3 screen done (app a013e44). W0 part done: Settings document, GET/PUT /shared/settings, penalty rate, minimum payment and SMA thresholds read from it (backend 066ddb0)._ W0: a `Settings` document (default interest, grace, penalty rate, min payment, SMA thresholds, **optional** loan-number prefix that is **empty by default**). W3: admin screen; Create loan and the calculator read their defaults from it. **No holidays or off-days.**
- [x] **M-3 · Cash handover**: included as an **optional module, off by default**, switched on per client in Business settings. W5. _(backend 818e338 · app 1035ccc)_
- [x] **M-5 · Loan statement PDF**: included. W5. Kept as **history** on the loan (date, language, who) for re-sharing; **deleted when the loan is deleted** (including force delete / BE-22). _(backend 9b2d0a9 · app 1035ccc)_
- [x] **M-9 · Tests for money logic**: included. _Started:_ `npm test` in the backend covers payment allocation, advance draw-down and the penalty amount (backend fa1734a). Close-loan math still needs extracting from the controller before it can be tested. They start in the hotfix (payment allocation, close loan, penalties) and grow each wave. _(backend fa1734a, 34ea518 (close loan, un-approve), cf1c4dc, 818e338, 9b2d0a9 · app tests every wave: 89)_
- [x] **M-10 · Collection performance per employee**: included. W5 (Reports → By employee). _(backend ac89738 · app 1035ccc)_
- Skipped: M-4 KYC, M-6 holidays and off-days, M-7 reminders, M-8 areas.
- [ ] **M-14 · Renew / top-up loan** (a new loan pre-filled from the previous one, copying documents): proposed, undecided.
- [ ] **M-15 · Re-send a receipt from payment history**: proposed, undecided (depends on BE-24).
- [x] **M-11 · Module switches (server-side)**: included. _Switches on the Business settings screen (app a013e44). W0 part done: modules on Settings, lead routes refused when off, can() honours them (backend 066ddb0, app 606efd1)._ W0: `modules` on the `Settings` document (Leads, Cash handover, Performance report), read by the app at login and on resume; `can()` hides disabled modules. W3: switches on the Business settings screen. Cash handover defaults to **off**.
- [x] **M-12 · Automatic daily DB backup**: included. W0 backend: a 02:00 IST cron using the existing `backupUtils`, writing dated zips on the server and keeping the last 14. No app screen. _(backend 4694db1)_
- [x] **M-13 · Settings changes in the audit log** _(backend 066ddb0, app a013e44)_: included. W3: every Business settings or module change goes through `audit()` (who, old → new); the settings screen shows "Last changed by … · date".

## Employee accounts (round E, 2026-10-02)

Plan and mocks: `.lavish/employee-account.html`. Decisions: E-03 (forced password change, Share login) and E-06 (My month card) dropped. Removing an employee moves their leads with the loans and warns about cash not handed over, but still allows removal. The Home eye hides the market amount, collected today and repaid.

- [x] **A-01 · Market amount hidden on admin Home**: shows `₹ • • • • • •` by default; the eye shows market, collected today and repaid; hides again when the app is reopened or unlocked. App only.
- [ ] **E-01 · Move loans**: "Move loans to…" in the A16 ⋯ menu (all active, or chosen loans; optionally open leads). Removing an employee with active loans requires choosing who takes them (leads move too, cash warning). Backend: one bulk reassign route, audited per loan.
- [ ] **E-02 · Employees change their own password**: "My account" group in Security, current + new + confirm, server password rules.
- [ ] **E-04 · Today on the employee profile**: collected of due today, overdue loans, cash held (when the module is on).
- [ ] **E-05 · Employee profile links + last active**: Loans, Payments, Overdue filtered to the employee; "Active … ago" from `lastSeen`.
- [ ] **E-07 · Employees list**: search, All/Active/Inactive chips, today's collected and % per row.
- [ ] **E-08 · Employees edit their own contact details**: phone, email, address, emergency contact (photo already editable).
- [ ] **E-12 · Record payments offline**: saved on the phone with an idempotency key, sent when online; "Not sent yet" on Collect and My payments; rejected ones shown in red. Penalties stay online-only.
- [ ] **E-13 · Login history**: keep 90 days with phone model, app version and IP; "Recent logins" on A16 (with a "New phone" badge) and "My recent logins" in Security.

## Shared screens (one implementation, role config)

CustomerList (A2·E4), CustomerProfile (A3·E5), LoanScreen (A6·A10·E6), ScheduleView + InstallmentSheet (A7·A7b·E6b), PaymentHistory, OverdueList (E7), LeadList (A13·E8), LeadDetail (A14·E9), Search, Calculator, Profile, Settings, Notifications.

## Order of work

1. Branch `feat/revamp` in both repos (after committing the backend's uncommitted changes).
2. Hotfix B-1…B-12 (B-11 and B-12 first, as they are security fixes) (+ BE-1, BE-10, BE-24, part of BE-2), with M-9 tests for payment allocation first.
3. W0 foundation → W1 shell → W2 field → W3 money → W4 people → W5 insight → W6 clean-up.
4. Included M-items are placed in waves as listed above: M-1, M-2, M-11 and M-12 backend in W0; the M-1, M-2, M-11 and M-13 screens in W3; M-3, M-5 and M-10 in W5; M-9 from the hotfix onward.
