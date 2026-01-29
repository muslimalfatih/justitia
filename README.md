# Justitia

A legal services platform connecting clients with lawyers. Clients can submit cases, receive quotes from lawyers, and process payments through Stripe.

## Live Demo

- **Website:** https://justitia-app.netlify.app
- **API:** https://justitia-api.onrender.com

## How It Works

### Client Flow

1. Client registers and creates a new case with title, category, description, and optional file attachments
2. Case is published to the marketplace with status `open`
3. Lawyers browse the marketplace and submit quotes (amount + expected days)
4. Client reviews quotes and accepts one by completing Stripe payment
5. Upon successful payment:
   - Selected quote status changes to `accepted`
   - All other quotes are `rejected`
   - Case status changes to `engaged`
   - Lawyer gains access to case documents

### Lawyer Flow

1. Lawyer registers with jurisdiction and bar number
2. Browses open cases in the marketplace
3. Submits a quote for cases they want to work on
4. Can update or withdraw quotes while status is `proposed`
5. Gets notified when quote is accepted and payment is complete

### Security and Access Control

- Role-based access control (RBAC) enforced at API level
- Clients can only view/edit their own cases
- Lawyers can only view open cases in marketplace
- File access restricted to case owner and assigned lawyer
- Payment processing uses Stripe webhooks with signature verification
- Quote acceptance is atomic (database transaction) to prevent race conditions

## Tech Stack

- **Frontend:** React Router v7, React Query, Tailwind CSS, shadcn/ui
- **Backend:** Hono, tRPC, Better Auth
- **Database:** PostgreSQL (Supabase)
- **Storage:** Cloudflare R2
- **Payments:** Stripe
- **Runtime:** Bun

## Database Schema

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    user      │       │    cases     │       │    quotes    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◄──────│ client_id    │       │ id (PK)      │
│ name         │       │ id (PK)      │◄──────│ case_id      │
│ email        │       │ title        │       │ lawyer_id    │──────►│ user │
│ role         │       │ category     │       │ amount       │
│ jurisdiction │       │ description  │       │ expected_days│
│ bar_number   │       │ status       │       │ note         │
└──────────────┘       │ accepted_    │       │ status       │
                       │   quote_id   │       └──────────────┘
                       └──────────────┘              │
                              │                      │
                              │                      ▼
                       ┌──────────────┐       ┌──────────────┐
                       │    files     │       │   payments   │
                       ├──────────────┤       ├──────────────┤
                       │ id (PK)      │       │ id (PK)      │
                       │ case_id      │       │ case_id      │
                       │ original_    │       │ quote_id     │
                       │   filename   │       │ client_id    │
                       │ storage_key  │       │ lawyer_id    │
                       │ file_size    │       │ amount       │
                       │ mime_type    │       │ stripe_      │
                       └──────────────┘       │   payment_   │
                                              │   intent_id  │
                                              │ status       │
                                              └──────────────┘

                       ┌──────────────┐
                       │  audit_logs  │
                       ├──────────────┤
                       │ id (PK)      │
                       │ user_id      │
                       │ action       │
                       │ resource_type│
                       │ resource_id  │
                       │ changes      │
                       └──────────────┘
```

### Table Summary

| Table       | Description                                      |
|-------------|--------------------------------------------------|
| user        | User accounts with role (client/lawyer)          |
| session     | Active user sessions                             |
| account     | OAuth provider accounts                          |
| verification| Email verification tokens                        |
| cases       | Legal cases submitted by clients                 |
| files       | Documents attached to cases                      |
| quotes      | Price quotes submitted by lawyers                |
| payments    | Stripe payment records                           |
| audit_logs  | Audit trail for security-sensitive actions       |

### Enums

| Enum           | Values                                           |
|----------------|--------------------------------------------------|
| user_role      | client, lawyer                                   |
| case_status    | open, engaged, closed, cancelled                 |
| case_category  | contract, family, corporate, criminal, civil, property, employment, immigration, intellectual_property, other |
| quote_status   | proposed, accepted, rejected                     |
| payment_status | pending, succeeded, failed                       |

## Project Structure

```
justitia/
├── apps/
│   ├── server/          # Hono API server
│   └── web/             # React frontend
├── packages/
│   ├── api/             # tRPC routers
│   ├── auth/            # Better Auth configuration
│   ├── db/              # Drizzle ORM schema
│   ├── env/             # Environment validation
│   └── services/        # Business logic (payments, file upload, audit)
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication
BETTER_AUTH_SECRET=your-32-character-secret-minimum
BETTER_AUTH_URL=http://localhost:3001

# CORS
CORS_ORIGIN=http://localhost:5173

# Cloudflare R2 Storage
CLOUDFLARE_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend (Vite)
VITE_SERVER_URL=http://localhost:3001
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Server
PORT=3001
NODE_ENV=development
```

## Local Development

### Prerequisites

- Bun 1.3+
- PostgreSQL database
- Stripe account (test mode)
- Cloudflare R2 bucket

### Setup

```bash
# Install dependencies
bun install

# Run database migrations
cd packages/db && bun run db:push

# Start development servers
bun run dev
```

The frontend runs on `http://localhost:5173` and the API on `http://localhost:3001`.

## Running Tests

```bash
# Run all tests
bun test

# Run tests with coverage
bun test --coverage
```

## Deployment

### Backend (Render)

The backend is deployed as a Docker container on Render. See `apps/server/Dockerfile` and `render.yaml` for configuration.

### Frontend (Netlify)

The frontend is deployed on Netlify. See `netlify.toml` for build configuration.

### Required Environment Variables

**Render (Backend):**
- DATABASE_URL
- BETTER_AUTH_SECRET
- BETTER_AUTH_URL
- CORS_ORIGIN
- CLOUDFLARE_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

**Netlify (Frontend):**
- VITE_SERVER_URL
- VITE_STRIPE_PUBLISHABLE_KEY

## API Endpoints

### Authentication
- `POST /api/auth/sign-up` - Register new user
- `POST /api/auth/sign-in` - Login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/get-session` - Get current session

### tRPC Routes
- `cases.create` - Create a new case (client)
- `cases.getMyCases` - Get client's cases
- `cases.getCaseById` - Get case details
- `cases.getOpenCases` - Get marketplace cases (lawyer)
- `quotes.submit` - Submit/update quote (lawyer)
- `quotes.getMyQuotes` - Get lawyer's quotes
- `quotes.getQuotesForCase` - Get quotes for a case
- `quotes.withdraw` - Withdraw a quote
- `payments.createIntent` - Create Stripe payment intent
- `payments.getPaymentStatus` - Get payment status
- `files.getSignedUrl` - Get signed URL for file download

### Other
- `POST /api/upload` - Upload file to case
- `POST /webhooks/stripe` - Stripe webhook handler
- `GET /health` - Health check
