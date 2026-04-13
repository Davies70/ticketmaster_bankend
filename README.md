# TicketFlow

> A high-concurrency ticketing API built with Node.js, Express, PostgreSQL, and Redis — engineered for atomic seat reservation, exactly-once payment processing, and async background delivery.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local setup](#local-setup)
  - [Running the workers](#running-the-workers)
- [Environment variables](#environment-variables)
- [Database migrations](#database-migrations)
- [API reference](#api-reference)
  - [Authentication](#authentication)
  - [Events](#events)
  - [Orders](#orders)
  - [Users](#users)
- [Concurrency model](#concurrency-model)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

TicketFlow handles the hardest part of ticketing: selling the last seat to thousands of simultaneous users without double-booking. It uses a **Redis distributed soft-lock** to hold a seat during checkout, a **PostgreSQL transaction** to commit the sale atomically, and a **BullMQ message queue** to push confirmation emails and PDF tickets out-of-band — keeping the HTTP response time under 100 ms even at peak load.

**Core guarantees:**

- No double-booking under concurrent load (Redis `SET NX EX` + pg transaction)
- No duplicate charges on retry (idempotency key stored in DB + Redis cache)
- No lost confirmation emails (BullMQ persists jobs in Redis with exponential-backoff retry)
- No silent misconfiguration (env vars validated at startup via `zod` — missing vars exit immediately)

---

## Tech stack

| Layer         | Technology                      | Why                                             |
| ------------- | ------------------------------- | ----------------------------------------------- |
| Runtime       | Node.js 20 (LTS)                | Async I/O, large ecosystem                      |
| Framework     | Express 4                       | Minimal, well-understood, composable            |
| Database      | PostgreSQL 16 via `pg` (no ORM) | Full SQL control, raw transaction management    |
| Cache + locks | Redis 7 via `ioredis`           | Atomic `SET NX EX`, sub-millisecond reads       |
| Queue         | BullMQ (Redis-backed)           | Persistent jobs, retries, delayed scheduling    |
| Validation    | Zod                             | Schema inference, runtime + compile-time safety |
| Logging       | Pino                            | Structured JSON logs, near-zero overhead        |
| Testing       | Jest + Supertest                | Unit and full integration test support          |
| Migrations    | node-pg-migrate                 | SQL-first, reversible, timestamped              |

---

## Architecture

```
┌─────────────┐     HTTPS      ┌──────────────────┐
│   Client    │ ─────────────► │   Express API     │
│ (web/mobile)│ ◄───────────── │   (src/server.js) │
└─────────────┘   JSON resp    └────────┬─────┬────┘
                                        │     │
                         ┌──────────────┘     └──────────────┐
                         ▼                                    ▼
               ┌──────────────────┐               ┌──────────────────┐
               │     Redis        │               │   PostgreSQL     │
               │  • Soft locks    │               │  • Users         │
               │  • Response cache│               │  • Events/Seats  │
               │  • Rate limiting │               │  • Orders        │
               │  • BullMQ jobs   │               │  • Job results   │
               └──────────────────┘               └──────────────────┘
                         │
                         ▼
               ┌──────────────────┐
               │  Background      │
               │  Worker process  │
               │  (src/workers/)  │
               │  • PDF generator │
               │  • Mailer        │
               └──────────────────┘
```

### Checkout flow (abbreviated)

```
User → GET /seats/:id
     → API: SET lock:seat:{id} NX EX 600   ← atomic soft lock (10 min TTL)
     → 200 OK { lockExpiresAt }

User → POST /checkout  [Idempotency-Key: uuid]
     → API: BEGIN pg transaction
          UPDATE wallets, UPDATE seats, INSERT orders
       COMMIT
     → API: DEL lock:seat:{id}
     → API: queue.add("order.confirmed")    ← fire-and-forget
     → 200 OK { orderId }

Worker → consume "order.confirmed"
       → generatePDF() → smtp.send()
       → INSERT job_results
```

For the full 11-step annotated sequence, see [`docs/sequence.md`](docs/sequence.md).

---

## Project structure

```
ticketing-api/
├── src/
│   ├── config/          # pg pool, Redis clients, queue factory, env validation
│   ├── db/
│   │   ├── migrations/  # Timestamped SQL migration files
│   │   └── seeds/       # Dev-only seed scripts
│   ├── modules/
│   │   ├── users/       # Router · Controller · Service · Repository · Validator
│   │   ├── events/
│   │   └── orders/      # Checkout orchestration lives here
│   ├── middleware/       # auth, rate-limit, idempotency, validation, error handler
│   ├── services/
│   │   ├── cache/        # ioredis get/set/del wrappers
│   │   └── lock/         # acquireLock / releaseLock (SET NX EX)
│   ├── workers/          # BullMQ processors (separate process)
│   ├── utils/            # AppError, asyncHandler, logger, paginate
│   ├── app.js            # Express factory (no listen)
│   └── server.js         # Process entry — listen + graceful shutdown
├── tests/
│   ├── integration/
│   ├── unit/
│   └── fixtures/
├── scripts/
│   ├── migrate.js
│   └── seed.js
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

Each module follows a strict four-layer contract:

```
Router → Controller → Service → Repository → pg Pool
                         ↕
                   Redis cache / lock
```

No layer may skip the one below it. Controllers never touch the database. Services never build HTTP responses.

---

## Getting started

### Prerequisites

| Tool                    | Minimum version    |
| ----------------------- | ------------------ |
| Node.js                 | 20.x               |
| npm                     | 9.x                |
| Docker + Docker Compose | 24.x               |
| PostgreSQL              | 16 (or use Docker) |
| Redis                   | 7 (or use Docker)  |

### Local setup

**1. Clone the repository**

```bash
git clone https://github.com/your-org/ticketing-api.git
cd ticketing-api
```

**2. Install dependencies**

```bash
npm install
```

**3. Start PostgreSQL and Redis via Docker**

```bash
docker-compose up -d
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

**4. Configure environment variables**

```bash
cp .env.example .env
# Edit .env — all required keys are documented below
```

**5. Run database migrations**

```bash
npm run migrate
```

**6. (Optional) Seed development data**

```bash
npm run seed
```

**7. Start the API server**

```bash
npm run dev        # nodemon with hot reload
# or
npm start          # production mode
```

The API will be available at `http://localhost:3000`.

### Running the workers

The background worker is a **separate Node.js process** — it must be started independently of the API server.

```bash
npm run start:worker
```

In production, run this as a separate container or dyno. It has no HTTP listener and can be scaled independently.

---

## Environment variables

Copy `.env.example` to `.env` and fill in every value. The app validates all variables at startup via `zod` and will refuse to start if any required key is missing or malformed.

| Variable               | Required | Default             | Description                                                                       |
| ---------------------- | -------- | ------------------- | --------------------------------------------------------------------------------- |
| `NODE_ENV`             | yes      | —                   | `development` \| `production` \| `test`                                           |
| `PORT`                 | yes      | `3000`              | HTTP port for the API server                                                      |
| `DATABASE_URL`         | yes      | —                   | Full pg connection string, e.g. `postgresql://user:pass@localhost:5432/ticketing` |
| `REDIS_URL`            | yes      | —                   | Redis connection string, e.g. `redis://localhost:6379`                            |
| `JWT_SECRET`           | yes      | —                   | Secret for signing JWTs — minimum 32 characters                                   |
| `JWT_EXPIRES_IN`       | no       | `15m`               | JWT expiry in [ms format](https://github.com/vercel/ms), e.g. `15m`, `1h`         |
| `QUEUE_NAME`           | no       | `ticketing-jobs`    | BullMQ queue name                                                                 |
| `RATE_LIMIT_WINDOW_MS` | no       | `60000`             | Rate limit window in milliseconds                                                 |
| `RATE_LIMIT_MAX`       | no       | `100`               | Max requests per window per IP                                                    |
| `SMTP_HOST`            | yes      | —                   | SMTP server hostname                                                              |
| `SMTP_PORT`            | no       | `587`               | SMTP port                                                                         |
| `SMTP_USER`            | yes      | —                   | SMTP username / address                                                           |
| `SMTP_PASS`            | yes      | —                   | SMTP password or app token                                                        |
| `PDF_STORAGE_PATH`     | no       | `./storage/tickets` | Local path for generated PDF tickets                                              |
| `LOG_LEVEL`            | no       | `info`              | Pino log level: `trace` \| `debug` \| `info` \| `warn` \| `error`                 |

---

## Database migrations

Migrations use `node-pg-migrate` and live in `src/db/migrations/` as plain `.sql` files, named with a timestamp prefix.

```bash
# Apply all pending migrations
npm run migrate

# Roll back the most recent migration
npm run migrate:down

# Create a new migration file
npm run migrate:create -- add_refund_status_to_orders
```

> Never edit an already-applied migration. Create a new one to amend the schema.

---

## API reference

All endpoints return JSON. Errors follow the shape `{ "status": "error", "message": "..." }`.

### Authentication

Authentication uses short-lived JWTs passed in the `Authorization: Bearer <token>` header.

#### `POST /api/v1/auth/register`

Create a new user account.

**Request body**

```json
{
  "email": "user@example.com",
  "password": "Min8Chars!",
  "name": "Jane Smith"
}
```

**Response `201`**

```json
{
  "token": "<jwt>",
  "user": { "id": "uuid", "email": "user@example.com", "name": "Jane Smith" }
}
```

---

#### `POST /api/v1/auth/login`

**Request body**

```json
{
  "email": "user@example.com",
  "password": "Min8Chars!"
}
```

**Response `200`**

```json
{
  "token": "<jwt>"
}
```

---

### Events

#### `GET /api/v1/events`

Returns paginated list of upcoming events.

**Query params**

| Param    | Type    | Description                                  |
| -------- | ------- | -------------------------------------------- |
| `page`   | integer | Page number (default: `1`)                   |
| `limit`  | integer | Results per page (default: `20`, max: `100`) |
| `search` | string  | Filter by event name                         |

**Response `200`**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Rock Night 2025",
      "venue": "O2 Arena",
      "date": "2025-08-10T20:00:00Z",
      "availableSeats": 142
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 84 }
}
```

---

#### `GET /api/v1/events/:eventId/seats`

Returns the seat map for an event, with availability status pulled from Redis cache (TTL: 60 s).

**Response `200`**

```json
{
  "eventId": "uuid",
  "seats": [
    {
      "id": "uuid",
      "row": "A",
      "number": 12,
      "status": "available",
      "price": 75.0
    },
    { "id": "uuid", "row": "A", "number": 13, "status": "held", "price": 75.0 }
  ]
}
```

Seat `status` values: `available` | `held` (Redis lock active) | `sold`

---

#### `POST /api/v1/events/:eventId/seats/:seatId/hold`

Acquires a 10-minute soft lock on a seat for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response `200`**

```json
{
  "seatId": "uuid",
  "lockExpiresAt": "2025-08-10T19:12:00Z"
}
```

**Response `409`** — seat already held or sold

```json
{ "status": "error", "message": "Seat is temporarily unavailable" }
```

---

### Orders

#### `POST /api/v1/orders/checkout`

Completes payment and creates an order. Idempotent — safe to retry with the same key.

**Headers**

| Header            | Required | Description                                                           |
| ----------------- | -------- | --------------------------------------------------------------------- |
| `Authorization`   | yes      | `Bearer <token>`                                                      |
| `Idempotency-Key` | yes      | Client-generated UUID v4. Same key = same response, no double charge. |

**Request body**

```json
{
  "seatId": "uuid",
  "paymentMethodId": "pm_stripe_token"
}
```

**Response `200`**

```json
{
  "orderId": "uuid",
  "status": "confirmed",
  "seat": { "row": "A", "number": 12, "event": "Rock Night 2025" },
  "totalPaid": 75.0
}
```

**Response `402`** — insufficient balance / payment failure

**Response `409`** — seat no longer available (lock expired or sold)

---

#### `GET /api/v1/orders`

Returns the authenticated user's order history.

**Headers:** `Authorization: Bearer <token>`

**Response `200`**

```json
{
  "data": [
    {
      "orderId": "uuid",
      "event": "Rock Night 2025",
      "seat": "A12",
      "status": "confirmed",
      "createdAt": "2025-07-01T14:32:00Z"
    }
  ]
}
```

---

#### `GET /api/v1/orders/:orderId`

Returns a single order with ticket download link.

**Response `200`**

```json
{
  "orderId": "uuid",
  "status": "confirmed",
  "ticketUrl": "/api/v1/orders/uuid/ticket.pdf"
}
```

---

### Users

#### `GET /api/v1/users/me`

Returns the authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response `200`**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Smith",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

## Concurrency model

TicketFlow uses a three-layer defence against race conditions:

**Layer 1 — Redis soft lock (seat hold)**
`SET lock:seat:{seatId} {userId} NX EX 600` is a single atomic command. Only one request can win it. All others receive a `409` immediately — no database read required.

**Layer 2 — PostgreSQL transaction (atomic write)**
Even if the Redis lock is somehow bypassed (e.g. TTL races at expiry), the pg transaction enforces a final-write check. The seat row is updated with a conditional `WHERE status = 'available'`, which returns `0 rowsAffected` if another transaction already sold it — triggering an immediate rollback.

**Layer 3 — Idempotency key (duplicate payment guard)**
The `Idempotency-Key` header value is stored in the `orders` table. On retry, the API checks Redis first (fast path, 24 h TTL) then falls back to a DB lookup — returning the original response without re-running any business logic or re-charging the user.

---

## Testing

```bash
# Run all tests
npm test

# Unit tests only (fast, no DB required)
npm run test:unit

# Integration tests (requires running pg + Redis — uses a separate test DB)
npm run test:integration

# Watch mode during development
npm run test:watch

# Coverage report
npm run test:coverage
```

Integration tests spin up against a dedicated `ticketing_test` database. The test runner applies migrations fresh on each run and tears down after. Never point the test suite at your development or production database.

---

## Contributing

1. Fork the repository and create a feature branch off `main`.

```bash
git checkout -b feat/your-feature-name
```

2. Follow the existing module structure — new domain features go in `src/modules/`, shared infrastructure in `src/services/`.

3. Write tests. PRs without tests covering the happy path and at least one error path will not be merged.

4. Run the full suite before opening a PR.

```bash
npm test && npm run lint
```

5. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` new feature
   - `fix:` bug fix
   - `chore:` tooling / deps
   - `docs:` documentation only

6. Open a pull request against `main` with a clear description of what changed and why.

---

## License

MIT — see [LICENSE](LICENSE) for details.
