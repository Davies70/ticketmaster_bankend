# Ticketing API — Production Directory Structure

Domain-driven layout. Each feature module owns its routes, controller, service, and repository.  
Cross-cutting concerns (auth, cache, queue, DB) live outside modules and are injected as dependencies.

---

```
ticketing-api/
│
├── src/
│   │
│   ├── config/                          # Environment & third-party config (never business logic)
│   │   ├── index.js                     # Re-exports all config; single import site for the app
│   │   ├── database.js                  # pg Pool setup, connection options, SSL config
│   │   ├── redis.js                     # ioredis client factory (one client for cache, one for BullMQ)
│   │   ├── queue.js                     # BullMQ Queue + Worker factory, shared job options
│   │   └── env.js                       # Validates & exports process.env vars via envalid/zod
│   │
│   ├── db/
│   │   ├── migrations/                  # Ordered, timestamped SQL migration files (run by node-pg-migrate)
│   │   │   ├── 20240101_create_users.sql
│   │   │   ├── 20240102_create_events.sql
│   │   │   ├── 20240103_create_seats.sql
│   │   │   └── 20240104_create_orders.sql
│   │   ├── seeds/                       # Dev/test seed scripts — never run in production CI
│   │   │   └── seed_events.js
│   │   └── pool.js                      # Exports the singleton pg.Pool; imported by all repositories
│   │
│   ├── modules/                         # Feature modules — the core of the domain
│   │   │
│   │   ├── users/
│   │   │   ├── users.router.js          # Express.Router() — mounts routes, applies module middleware
│   │   │   ├── users.controller.js      # Thin layer: parse req, call service, send res — no business logic
│   │   │   ├── users.service.js         # Business logic: password hashing, JWT issuance, profile rules
│   │   │   ├── users.repository.js      # All SQL for users table — SELECT/INSERT/UPDATE via pg pool
│   │   │   ├── users.validator.js       # Joi/zod schemas for request body & params validation
│   │   │   └── users.test.js            # Integration tests scoped to this module
│   │   │
│   │   ├── events/
│   │   │   ├── events.router.js
│   │   │   ├── events.controller.js
│   │   │   ├── events.service.js        # Availability checks, capacity logic, cache invalidation hooks
│   │   │   ├── events.repository.js     # Raw SQL: event + seat queries, bulk inserts for seat maps
│   │   │   ├── events.validator.js
│   │   │   └── events.test.js
│   │   │
│   │   └── orders/
│   │       ├── orders.router.js
│   │       ├── orders.controller.js
│   │       ├── orders.service.js        # Checkout orchestration: acquire lock → tx → publish event
│   │       ├── orders.repository.js     # Transactional SQL helpers; accepts pg Client for tx sharing
│   │       ├── orders.validator.js      # Validates idempotency-key header, payment payload schema
│   │       └── orders.test.js
│   │
│   ├── middleware/                      # Express middleware — applied globally or per-router
│   │   ├── auth.middleware.js           # Verifies JWT, attaches req.user; throws 401 on failure
│   │   ├── rateLimiter.middleware.js    # express-rate-limit backed by Redis store (rate-limit-redis)
│   │   ├── idempotency.middleware.js    # Checks Redis for cached response keyed by Idempotency-Key header
│   │   ├── validate.middleware.js       # Generic wrapper: runs a zod/joi schema, returns 422 on failure
│   │   ├── requestLogger.middleware.js  # Pino HTTP request/response logging with correlation IDs
│   │   └── error.middleware.js          # Global Express error handler — formats & logs all thrown errors
│   │
│   ├── services/                        # Shared application services (not domain-specific)
│   │   │
│   │   ├── cache/
│   │   │   ├── cache.service.js         # get/set/del wrappers around ioredis with JSON serialisation
│   │   │   └── cache.keys.js            # Centralised key templates, e.g. SEAT_MAP(eventId) => string
│   │   │
│   │   ├── lock/
│   │   │   ├── lock.service.js          # acquireLock / releaseLock using SET NX EX (Redlock-compatible)
│   │   │   └── lock.keys.js             # Lock key templates, e.g. SEAT_LOCK(seatId) => string
│   │   │
│   │   └── mailer/
│   │       ├── mailer.service.js        # Nodemailer transport setup, sendMail wrapper with retry logic
│   │       └── templates/
│   │           ├── order-confirmation.html
│   │           └── ticket.html
│   │
│   ├── workers/                         # BullMQ background workers — run as a separate Node.js process
│   │   ├── index.js                     # Worker process entry point — registers all processors, handles shutdown
│   │   ├── order.processor.js           # Handles "order.confirmed": generates PDF, triggers mailer
│   │   ├── email.processor.js           # Handles "send.email" jobs with retry + backoff config
│   │   └── pdf.processor.js             # Puppeteer/pdfkit PDF generation, uploads to S3/local storage
│   │
│   ├── utils/                           # Pure utility functions — no side effects, no I/O
│   │   ├── asyncHandler.js              # Wraps async route handlers to forward errors to next()
│   │   ├── AppError.js                  # Custom error class with statusCode, isOperational flag
│   │   ├── logger.js                    # Pino logger singleton with log-level from env
│   │   ├── paginate.js                  # Builds LIMIT/OFFSET clauses + response envelope from query params
│   │   └── idempotency.js               # Generates and validates idempotency key format (UUID v4)
│   │
│   ├── app.js                           # Express app factory — mounts middleware, routers; no listen() call
│   └── server.js                        # Process entry point — calls app.listen(), handles SIGTERM/SIGINT
│
├── tests/
│   ├── integration/                     # Full request-to-DB integration tests using a test pg database
│   │   ├── orders.integration.test.js
│   │   └── auth.integration.test.js
│   ├── unit/                            # Pure unit tests — services and utils mocked at boundary
│   └── fixtures/                        # Shared test factories and seed helpers
│
├── scripts/
│   ├── migrate.js                       # Runs node-pg-migrate up/down; invoked by npm run migrate
│   └── seed.js                          # Runs dev seeds; guarded to refuse NODE_ENV=production
│
├── .env.example                         # Committed template — all keys present, no real values
├── .env                                 # Local only — gitignored
├── docker-compose.yml                   # Local dev: postgres + redis services
├── Dockerfile                           # Multi-stage build: deps → build → production image
├── jest.config.js                       # Jest setup: separate projects for unit vs integration
└── package.json
```

---

## Module anatomy

Every feature module follows the same four-layer contract:

```
Request → Router → Controller → Service → Repository → pg Pool → PostgreSQL
                                    ↕               ↕
                               Redis cache      Redis lock
```

| Layer | File | Rule |
|---|---|---|
| Router | `*.router.js` | Wires HTTP verbs to controller methods, applies middleware |
| Controller | `*.controller.js` | Parses `req`, calls one service method, sends `res` — nothing else |
| Service | `*.service.js` | All business logic, orchestration, cache/lock coordination |
| Repository | `*.repository.js` | Raw SQL only — accepts an optional `client` arg for transaction sharing |

---

## Key wiring patterns

### Transaction-aware repository calls

Repositories accept an optional `pgClient` so the service can share a transaction across multiple tables without leaking SQL into the service layer.

```js
// orders.service.js
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await walletRepo.deduct(userId, amount, client);   // same tx
  await seatRepo.markSold(seatId, client);           // same tx
  await orderRepo.create(orderData, client);         // same tx
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

### Lock → Transaction → Publish ordering

```js
// orders.service.js — correct sequencing
await lockService.acquire(`seat:${seatId}`, userId, 600);  // 1. soft lock
// ... run pg transaction ...
await client.query('COMMIT');                               // 2. durable write
await lockService.release(`seat:${seatId}`);               // 3. release lock
await queue.add('order.confirmed', { orderId });           // 4. async job AFTER commit
```

### Worker process separation

```jsonc
// package.json
{
  "scripts": {
    "start":       "node src/server.js",           // API process
    "start:worker":"node src/workers/index.js",    // Worker process (separate dyno/container)
    "migrate":     "node scripts/migrate.js up",
    "seed":        "node scripts/seed.js"
  }
}
```

---

## Environment variables (`.env.example`)

```env
NODE_ENV=development
PORT=3000

# PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/ticketing

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=changeme
JWT_EXPIRES_IN=15m

# Queue
QUEUE_NAME=ticketing-jobs

# Mailer
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# PDF / Storage
PDF_STORAGE_PATH=./storage/tickets
```
