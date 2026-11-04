# Ecom-Flash

Ecom-Flash is a next-generation commerce operations SaaS platform being developed for merchants and growing e-commerce teams, with Bangladesh as the initial market.

## Project status

The repository currently contains the first public website implementation and a visual merchant workspace preview. The public website foundation is implemented. Phase 2 now includes a multi-tenant Prisma schema, PostgreSQL migrations, Prisma client singleton, role permission map, password hashing, database-backed registration/login/session APIs, and a protected workspace route. The catalog foundation includes tenant-scoped Product and Category models, migration, protected list/create APIs, and workspace pages. The latest code has not yet been validated against a configured live PostgreSQL database. Email verification, password reset, production rate limiting, live courier APIs, payments and broader business workflows remain outstanding.

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
3. Expand catalog CRUD, then inventory, customers and order workflows
4. Courier, COD, payment and fulfillment operations
5. Landing page builder and marketing tools
6. Subscription and billing system
7. Super Admin console
8. Security, testing, performance, SEO and production readiness

## Legal content notice

Privacy, terms and refund pages currently contain draft content only. They require legal review and final business details before launch.
