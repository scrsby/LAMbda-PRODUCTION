# Demo Launch Readiness Plan

Target: business-owner demo in 5 days

## Demo Minimum

The demo should prove these four end-to-end stories work:

1. Admin can invite a user, the user can create an account, log in, and complete profile setup.
2. Vendor can log in, view their inventory, add/edit items, and attach discounts to those items.
3. Cashier can search/select items, build a cart, apply active discounts automatically, and submit checkout for Clover processing.
4. Admin can configure Clover connection settings, verify the connection, view sales totals/history, and manage core administrative settings.

If time gets tight, prioritize a reliable demo path over completeness. A smaller working flow is better than a broader mock.

## Current Codebase Findings

These are the highest-impact gaps based on the current repository state:

- Auth routes exist for account creation, login, logout, session lookup, and profile update.
- Admin invite/token flows exist, but the admin router does not currently appear to be protected by auth/role middleware.
- The inventory router exists, but it is not mounted in the server app, so inventory endpoints are not reachable.
- Vendor association is incomplete: `vendor_id` is accepted in the admin invite flow but is not inserted into the token creation query, and vendor session data is not clearly populated on login.
- Login redirect logic only handles `admin` and `user`; vendor and cashier flows are not wired there.
- Clover configuration and Clover service files are empty.
- There are no server routes for checkout, discounts, sales, or analytics.
- Vendor and POS flows are mostly HTML shells today; webpack only builds admin/auth bundles.
- `admin-inventory-settings.html` points at the wrong bundle, and the vendor inventory page points at a vendor bundle that does not exist in webpack.
- Analytics pages look like static mockups rather than data-backed screens.
- There is no test script or build script that validates the full app for demo readiness.

## Priority Order

### P0: Must be complete for the demo

- Mount and verify all required server routes.
- Finish role wiring for admin, vendor, and cashier users.
- Complete vendor inventory CRUD plus discount CRUD.
- Implement cashier checkout flow and handoff to Clover sandbox/stub or real Clover endpoint.
- Implement basic admin Clover setup plus a sales view backed by real stored data.
- Seed realistic demo data and rehearse the full flow end-to-end.

### P1: Strongly recommended before the demo

- Protect admin-only routes with auth and role checks.
- Add better error states and empty states on admin/vendor/POS pages.
- Persist checkout results and inventory updates so the demo shows state changes.
- Add a simple smoke-test checklist and one-command startup instructions.

### P2: Nice to have if time remains

- More polished analytics charts.
- Better vendor dashboards.
- More complete account settings/system settings pages.
- Better email/template polish.

## Work Breakdown

### 1. Backend foundations

- [ ] Mount the inventory router in `server/config/app.ts`.
- [ ] Decide whether to add separate routers for `checkout`, `discounts`, `sales`, and `clover`, or extend existing routes in a clean way.
- [ ] Add auth protection to admin-only routes in `server/routes/admin.ts`.
- [ ] Confirm CORS/session behavior works for the actual demo hostname/port, not just localhost.
- [ ] Replace hardcoded frontend API host usage with environment-based configuration so the demo can run outside local defaults.

Definition of done:

- Every required API route is mounted and reachable.
- Admin-only actions cannot be called anonymously.
- Frontend and backend communicate correctly in the demo environment.

### 2. User and role lifecycle

- [ ] Verify admin invite -> email/token -> create account -> login -> profile completion works end-to-end.
- [ ] Fix role redirect logic so `vendor` and `cashier` land on the correct screens after login/finalization.
- [ ] Persist vendor linkage correctly during invite/account creation/login so vendor users act on the correct vendor account.
- [ ] Confirm session typing and session payload contain everything vendor and cashier pages need.
- [ ] Create one ready-to-use account for each demo role: admin, vendor, cashier.

Definition of done:

- A new account can be invited and activated without manual database edits.
- Vendor users resolve to the correct vendor identity.
- Cashier users can access POS without custom hacks.

### 3. Vendor inventory and discounts

- [ ] Implement vendor-side client scripts and webpack entries for vendor pages.
- [ ] Fix broken page-to-bundle wiring on inventory pages.
- [ ] Add inventory list/read endpoints so vendors and admins can see current items.
- [ ] Add inventory update/delete endpoints.
- [ ] Define discount data model.
- [ ] Add discount CRUD endpoints with vendor/admin permissions.
- [ ] Show active discounts on vendor inventory pages and ensure they are attached to specific items.
- [ ] Seed 5-10 realistic products with at least 2-3 active discounts.

Recommended discount scope for the demo:

- Percentage discount
- Fixed amount discount
- Active/inactive flag
- Start/end date optional if time allows

Definition of done:

- Vendor can log in, see inventory, add an item, edit an item, and attach a discount.
- Admin can verify the vendor's data from an admin view if needed.

### 4. Cashier POS and checkout

- [ ] Decide whether cashier is a separate `user_type` or whether an existing role will be reused for the demo.
- [ ] Add POS client code and a webpack entry for the register flow.
- [ ] Populate the POS with real inventory from the backend.
- [ ] Apply active discounts to line items and totals.
- [ ] Add cart state, subtotal, discount total, tax handling if needed, and final amount.
- [ ] Create checkout endpoint(s) that validate the cart server-side.
- [ ] Persist sale/order records locally before or alongside Clover submission.
- [ ] Decrement inventory quantities after successful checkout.
- [ ] Show clear success/failure state to the cashier.

Definition of done:

- Cashier can add items to cart and complete a checkout that produces a saved sale record.
- The payload sent to Clover is visible and traceable.
- Inventory and sales totals change after checkout.

### 5. Clover integration

- [ ] Decide the demo mode: real Clover sandbox, real merchant test environment, or local stub that mimics Clover responses.
- [ ] Implement configuration storage for Clover credentials/settings.
- [ ] Implement a "Test Connection" action in admin settings.
- [ ] Implement the service layer in `server/services/clover-connect.ts`.
- [ ] Implement config loading/validation in `server/config/clover-config.ts`.
- [ ] Log outbound Clover requests and inbound responses clearly for demo troubleshooting.
- [ ] Define fallback behavior when Clover is unavailable during the demo.

Pragmatic recommendation:

- If full Clover processing is risky within 5 days, ship a working sandbox or stub integration first, but make the admin connection screen and checkout handoff real enough that the owner can see the architecture and payload flow.

Definition of done:

- Admin can save/test Clover settings.
- Checkout sends a valid payload through the Clover integration path.
- Failure cases are understandable and do not crash the demo.

### 6. Admin reporting and operations

- [ ] Keep the existing user invite/token management working.
- [ ] Add sales summary endpoint(s): total sales, transaction count, recent transactions.
- [ ] Add a simple sales history table for the admin demo.
- [ ] Replace static analytics placeholders with real numbers, even if charts remain simple.
- [ ] Add admin inventory oversight if the owner needs to review vendor items.
- [ ] Decide which "other administrative tasks" are actually in-scope for this demo and explicitly defer the rest.

Minimum admin feature set for the demo:

- Invite user
- Configure Clover
- Test Clover connection
- View recent sales
- View top-level sales totals
- Review vendor inventory/discounts

Definition of done:

- Admin pages show real operational data, not just template content.
- The owner can see a clear admin story from setup to reporting.

### 7. Demo hardening

- [ ] Add a root-level setup/run note if needed so the project can be started repeatably.
- [ ] Confirm required `.env` values are known and available for demo day.
- [ ] Seed demo data in the database.
- [ ] Run a full smoke test across admin, vendor, and cashier flows.
- [ ] Prepare fallback demo accounts and backup seed data.
- [ ] Prepare a 5-7 minute walkthrough script.
- [ ] Capture screenshots or short clips in case a live dependency fails.

Smoke test checklist:

- [ ] Admin login works.
- [ ] Admin can invite a new user.
- [ ] Invitee can create account and log in.
- [ ] Vendor can add/edit inventory.
- [ ] Vendor can add/edit a discount.
- [ ] Cashier can add items to cart.
- [ ] Checkout produces a sale record.
- [ ] Checkout reaches Clover integration path.
- [ ] Admin can view the new sale in reporting.

## 5-Day Timeline

### Day 1: Stabilize the foundations

Goals:

- Mount missing routes.
- Fix role/session/vendor wiring.
- Lock down admin routes.
- Fix broken client bundle wiring.

Tasks:

- [ ] Mount inventory router.
- [ ] Add missing route/module skeletons for discounts, checkout, Clover, and sales.
- [ ] Fix login/finalization redirects for all roles.
- [ ] Wire `vendor_id` through invite -> account -> session.
- [ ] Fix webpack entries and page script mismatches.
- [ ] Verify all major pages load without obvious JS errors.

Exit criteria:

- All required pages at least load correctly.
- Admin, vendor, and cashier roles can be routed intentionally.

### Day 2: Finish vendor workflows

Goals:

- Make vendor inventory management real.
- Add discount support.

Tasks:

- [ ] Add inventory list/update/delete endpoints.
- [ ] Build vendor page scripts.
- [ ] Implement discount model and endpoints.
- [ ] Connect vendor UI to inventory/discount APIs.
- [ ] Seed vendor demo products and discounts.

Exit criteria:

- Vendor can manage items and discounts from the UI.

### Day 3: Finish cashier checkout

Goals:

- Make the POS real enough to sell items.
- Persist sales and inventory changes.

Tasks:

- [ ] Build POS bundle and client logic.
- [ ] Load searchable inventory into the register.
- [ ] Implement cart math and discount application.
- [ ] Create checkout endpoint and sale persistence.
- [ ] Update inventory after successful checkout.

Exit criteria:

- Cashier can complete a full sale locally.

### Day 4: Finish Clover and admin reporting

Goals:

- Connect checkout to Clover path.
- Give admin a believable operations/reporting story.

Tasks:

- [ ] Implement Clover config storage and connection test.
- [ ] Implement Clover service integration path.
- [ ] Add sales summary/history endpoints.
- [ ] Replace static admin analytics values with real data.
- [ ] Verify the sale created on Day 3 appears in admin reporting.

Exit criteria:

- Admin can configure Clover and view sales data.
- Checkout reaches the Clover integration path.

### Day 5: Rehearsal and fallback prep

Goals:

- Make the demo reliable.
- Remove uncertainty.

Tasks:

- [ ] Run the full smoke test multiple times.
- [ ] Fix only demo-blocking bugs.
- [ ] Prepare backup data and backup user accounts.
- [ ] Create a short demo script with exact clicks and expected outcomes.
- [ ] Prepare fallback language for any intentionally stubbed piece.

Exit criteria:

- You can run the demo start-to-finish without touching the database manually.
- You have a backup path if Clover or email misbehaves.

## Explicit Risks

- Clover is currently the largest execution risk because the config/service layers are empty.
- Vendor flows are at risk because vendor identity and vendor page bundles are incomplete.
- POS is at risk because the page exists but the client/backend checkout flow does not.
- Analytics is at risk because there are no server sales/analytics routes yet.
- Demo environment setup is at risk because frontend API configuration is hardcoded to localhost today.

## Suggested Scope Cuts If Time Slips

Cut these before cutting the core demo story:

- Advanced charts and polished analytics visualizations.
- Non-essential account/system settings.
- Complex discount scheduling rules.
- Multi-step Clover edge cases beyond a single successful sale path plus one failure state.

Do not cut these:

- Login/account creation.
- Vendor item creation/editing.
- Discount attachment to items.
- Cashier checkout.
- Clover handoff path.
- Admin sales visibility.

## Final Pre-Demo Checklist

- [ ] Start commands are written down and verified.
- [ ] Env vars are present and tested.
- [ ] Database contains realistic demo data.
- [ ] Email invite flow works, or a backup pre-created account exists.
- [ ] Clover test path works, or the approved fallback stub is in place.
- [ ] Admin, vendor, and cashier credentials are ready.
- [ ] One full rehearsal has been completed on the exact machine/environment used for the demo.
