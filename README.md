# Ecom-Flash

Ecom-Flash is a next-generation commerce operations SaaS platform being developed for merchants and growing e-commerce teams, with Bangladesh as the initial market.

## Project status

The repository currently contains the first public website implementation and a visual merchant workspace preview. The public website foundation is implemented. Phase 2 now includes a multi-tenant Prisma schema, PostgreSQL migrations, Prisma client singleton, role permission map, password hashing, database-backed registration/login/session APIs, and a protected workspace route. The catalog foundation includes tenant-scoped Product and Category models, protected list/create/update/archive APIs, and workspace pages. Inventory now includes stock movement records, tenant-scoped inventory APIs, atomic stock adjustments, non-negative stock enforcement, audit logs, low/out-of-stock summaries, and a movement history UI. Customer management includes tenant-scoped customer records, search, contact details, customer segments, notes and audit logging. Order management now includes tenant-scoped order records, server-priced line items, BDT totals, atomic stock reservation, inventory movements, order lifecycle transitions, payment status and audit logs. The latest code has not yet been validated against a configured live PostgreSQL database. Email verification, password reset, production rate limiting, live courier APIs, payments and broader business workflows remain outstanding.

## Product direction

- Public marketing website and product information
- Merchant workspaces with tenant isolation and role-based access
- Orders, products, categories, inventory and customers
- Landing page and website tools
- Courier, shipment and COD workflows
- Payments, finance, reports and analytics
- Marketing, conversion tracking and recovery automations
- Configurable SaaS plans, subscriptions and usage limits
- Separate Super Admin console

## Technology direction

- Next.js App Router and TypeScript
- Tailwind CSS and shadcn/ui design system (planned UI foundation)
- PostgreSQL and Prisma ORM
- Secure server-side sessions and role-based authorization
- Zod validation
- Recharts analytics
- S3-compatible storage abstraction
- Automated unit and end-to-end tests

## Currency policy

Bangladeshi Taka is the default currency for the initial Bangladesh configuration. Use **৳ / BDT** for prices, revenue, expenses, COD, invoices, subscriptions and reports. Currency formatting is centralized in `src/lib/currency.ts`. Do not hardcode dollar-denominated Bangladesh values.

## Repository-first development

All source code, database schema, migrations, documentation and configuration are maintained in this GitHub repository. No production hosting, custom domain or live payment gateway is connected at this stage. GitHub Actions runs a build validation workflow only; it does not deploy the application.

## Local development

1. Install Node.js 22 or a compatible supported version.
2. Clone this repository.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local` when the relevant services are introduced.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

## Environment variables

See `.env.example`. Never commit real passwords, API keys, tokens or production credentials.

## Development phases

1. Public website and information architecture
2. Database, authentication and tenant-aware workspace foundation; product/category catalog APIs and initial UI implemented; live DB integration tests pending
3. Catalog, inventory and customer foundations; initial order creation, stock reservation and order lifecycle workflows implemented; order detail views, tenant-scoped internal notes and activity history for order/payment changes implemented
4. Courier, COD, payment and fulfillment operations
5. Landing page builder and marketing tools
6. Subscription and billing system
7. Super Admin console
8. Security, testing, performance, SEO and production readiness

## Legal content notice

Privacy, terms and refund pages currently contain draft content only. They require legal review and final business details before launch.

### Order details and activity timeline

- Protected order detail view at `/dashboard/orders/[orderId]` with tenant-scoped order, customer, delivery, payment and item details.
- Internal team notes are stored as order activity records and are not exposed on the customer-facing storefront.
- Order creation, order-status transitions and payment-status changes are recorded in a chronological activity timeline with the acting team member where available.
- New `OrderActivity` model and migration: `20261105050000_order_activity`.
- Detail and note endpoints are scoped to the authenticated tenant; note creation requires `orders.write`.


### Customer profiles and purchase history

- Protected customer profile at `/dashboard/customers/[customerId]` with tenant-scoped contact details and linked order history.
- Customer directory shows linked order count and lifetime order value.
- Lifetime order value sums linked orders excluding cancelled and returned orders; it is order value, not recognized accounting revenue.
- Customer detail API returns up to the latest 100 valid linked orders with item snapshots.


### Customer lifecycle controls

- Customer records support tenant-scoped editing, soft archive and restore; historical orders remain linked and are not deleted.
- The customer directory separates active and archived records, supports an archived-record filter, and retains segment filtering and name/phone/email search.
- Archive and restore actions are recorded in the workspace audit log. A database migration adds the indexed archive flag: `20261105060000_customer_archive`.


### Courier and fulfillment foundation

- Tenant-scoped courier profiles for Pathao, Steadfast, RedX, Paperfly, eCourier and an optional other provider.
- Shipment draft creation for confirmed/processing orders, recipient and parcel snapshots, COD amount calculation for COD orders, delivery charge, tracking references and manual shipment event history.
- Shipment status transitions are validated; delivered shipment status can move an eligible order from SHIPPED to DELIVERED.
- No live provider API calls, bookings, labels, pickup requests or automatic tracking sync are performed yet. Provider profiles store display/account references only; API secrets are not collected or stored.
- New models and migration: CourierAccount, Shipment, ShipmentEvent; migration `20261105070000_courier_shipments`.
- Access is controlled by `courier.read` and `courier.write` permissions.


### Business analytics dashboard
- Tenant-scoped `/api/analytics` endpoint with real database aggregates for all-time order value, paid order value, unpaid/partial COD order value, order and shipment status counts, 14-day sales trend, top-selling products, stock totals and recent orders.
- `/dashboard` now renders a responsive business overview with BDT currency formatting, loading/error/empty states and refresh support.
- Analytics access follows the workspace `orders.read` permission. No sample figures are presented as live business data.
- COD outstanding is the full total of unpaid/partially paid COD orders; partial payment amounts are not yet tracked separately in a payment ledger.


### Payments & COD management
- Added `amountPaid` to orders and a tenant-scoped `PaymentTransaction` ledger for incoming payments and refunds.
- Added order-level payment/refund recording with balance and overpayment/refund validation, audit events and order activity history.
- Added `/dashboard/payments` for BDT collection totals, outstanding balances, COD due orders and recent transaction history.
- Payment status is recalculated from the net amount collected; manual status toggles were removed from the order workflow so payment state follows ledger entries.
- No bank, card processor, mobile wallet or courier settlement is connected. Entries are staff-recorded and are not independently verified.
- Migration: `20261105080000_payment_ledger`.


### Team management & role-based access
- Added a workspace team page with member listing, role changes, suspension/restoration and removal.
- Added Owner/Admin-controlled invitations. Existing registered accounts can be added immediately; new accounts receive a one-time, seven-day invitation URL stored as a token hash.
- Added authenticated invitation acceptance that requires the signed-in email to match the invited address.
- Owner role is protected from removal or demotion. Admins cannot manage other admins or grant the Admin role. Managers can view the team; only Owners/Admins can change access.
- Team changes and invitation events are written to the workspace audit log.
- Email delivery is not configured; invitation URLs must be shared securely by the workspace admin.
- Migration: `20261105090000_team_invitations`.

### Landing page builder
- Added a tenant-scoped landing page editor at `/dashboard/landing-pages` with editable HERO, TEXT, FEATURES, PRODUCTS, TESTIMONIAL and CTA sections.
- Supports section ordering, removal, URL slug validation, SEO title/description, preview, draft saving, publishing status and page deletion.
- Added role permissions: Owners/Admins/Managers can create and edit; Staff can view; Viewer access is not granted.
- Pages and section configuration are stored as JSON in PostgreSQL and are isolated by tenant.
- Publishing currently records the published state and timestamp. Public storefront rendering, product data binding, media uploads, custom-domain routing and drag-and-drop pointer interactions are planned for the storefront phase.
- Migration: `20261105100000_landing_pages`.

### Merchant storefront
- Added tenant-scoped storefront branding settings: store name, tagline, description, logo/banner image URLs, announcement bar, brand color and contact details.
- Added a visual preview in the dashboard and a public storefront at `/store/{tenantSlug}`.
- Public store reads only active tenants, active main stores and active in-stock products; product prices are formatted in BDT.
- Store settings API is protected by workspace permissions and writes audit events.
- Storefront branding fields migration: `20261105110000_storefront_settings`.
- Current storefront is a functional first release: image assets are URL-based; secure media uploads, custom domain mapping, cart/checkout, product detail pages, order placement and storefront themes are later milestones.

### Public shopping cart and checkout
- Added product detail pages under `/store/{storeSlug}/products/{productSlug}` and a browser-persisted, store-specific cart at `/store/{storeSlug}/cart`.
- Cart supports quantity changes, item removal, subtotal calculation and delivery information collection.
- Added public COD order placement. Server reloads product prices from the database, verifies active store/products and available stock, then atomically reserves inventory and creates order, order items, inventory movement, order activity and audit log in a serializable transaction.
- Customer-provided prices, discounts and shipping charges are never trusted. Checkout currently offers Cash on Delivery only; shipping charge is shown as subject to store confirmation and is not added to the total.
- Payment gateways, shipping rate calculation, customer accounts, order tracking for shoppers, anti-abuse/rate limiting and checkout verification are later milestones.


### Delivery zone and shipping charge configuration
- Added tenant-scoped delivery rates by city/area, with editable zone names, BDT charges, optional free-shipping minimums and active/inactive controls.
- Public COD checkout now calculates shipping server-side from the configured active city rate and applies free shipping when the database-priced subtotal reaches the configured threshold.
- Customer-submitted shipping prices are not accepted. Unknown/unconfigured areas remain unquoted at checkout and require merchant confirmation before dispatch.
- Delivery rate create/update/delete operations are tenant-scoped and audited.
- Added `DeliveryRate` model and migration: `20261105120000_delivery_rates`.

### Customer profile linking and private order tracking
- Storefront COD checkout matches customer profiles by normalized phone number within the current tenant, updates contact/address details, and links the new order to that customer; new customers are created automatically.
- Every storefront order receives a cryptographically random private tracking token. Only its SHA-256 hash is stored in the database.
- Added public `/track/{token}` page and read-only tracking API. The page shows order status, item/amount summary, payment method/status, shipment references and recorded shipment events without exposing customer phone, email, street address, internal notes or staff audit data.
- Tracking tokens are unguessable bearer links; anyone holding the link can view the limited tracking details. Customers should keep the link private.
- Added `trackingTokenHash` to Order with a unique index; migration: `20261105130000_order_tracking`.
- No email/SMS delivery is configured; the tracking link is shown on the checkout confirmation page for the customer to save.

### Store customer accounts and order history
- Added tenant-scoped customer accounts with email/password registration and sign-in, using the existing scrypt password hashing utility and separate HttpOnly, SameSite=Lax, secure-in-production 30-day customer session cookies.
- Registration links the account to an existing customer record by normalized phone or email where possible, or creates a new customer record.
- Added customer account portal at `/store/{storeSlug}/account` with order history and order status/amount summaries.
- Account APIs scope all reads and sessions to the requested active store tenant; order history is limited to the linked customer profile.
- Added CustomerAccount and CustomerAccountSession models and migration `20261105140000_customer_accounts`.
- Email verification, password reset, email/SMS notifications, account checkout autofill and verified phone ownership are not yet implemented. Registration should not be treated as proof that a phone number belongs to the registrant.
