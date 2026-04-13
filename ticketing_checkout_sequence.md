# Ticketing API — Checkout Sequence Diagram

> View this file in VS Code with **Cmd/Ctrl + Shift + V** (Markdown Preview).  
> Mermaid diagrams render natively — no extension required in VS Code 1.70+.

---

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant API as Express API
    participant R as Redis
    participant PG as PostgreSQL
    participant MQ as Message Queue
    participant W as Background Worker

    %% ── Phase 1: Seat reservation (soft lock) ───────────────────────────────
    U->>API: GET /seats/:id  (JWT auth header)
    API->>R: EXISTS lock:seat:{id}

    alt Lock already held
        R-->>API: 1 (key exists)
        API-->>U: 409 Conflict — seat temporarily held
    else No lock found
        R-->>API: 0 (key free)
        API->>R: SET lock:seat:{id} {userId} EX 600 NX
        Note over R: Soft lock · TTL = 10 min
        R-->>API: OK
        API-->>U: 200 OK · { seatId, lockExpiresAt }
    end

    %% ── Phase 2: Payment submission ─────────────────────────────────────────
    U->>API: POST /checkout  Idempotency-Key: {uuid}
    Note over API: Check Redis for cached response<br/>under idempotency key first

    %% ── Phase 3: PostgreSQL transaction ─────────────────────────────────────
    API->>PG: BEGIN (READ COMMITTED)

    API->>PG: UPDATE wallets SET balance = balance - price WHERE user_id = {id}
    API->>PG: UPDATE seats SET status = 'Sold' WHERE seat_id = {id}
    API->>PG: INSERT INTO orders (user_id, seat_id, idempotency_key, ...) VALUES (...)

    alt Insufficient funds OR seat already sold
        PG-->>API: Error
        API->>PG: ROLLBACK
        API->>R: DEL lock:seat:{id}
        API-->>U: 402 / 409 — transaction aborted
    else All writes succeed
        API->>PG: COMMIT
        Note over PG: 3 writes durable
        PG-->>API: OK
        API->>R: DEL lock:seat:{id}
        Note over R: Hard lock lifted — DB is source of truth now
    end

    %% ── Phase 4: Async event publish ────────────────────────────────────────
    API-)MQ: publish "order.confirmed" { orderId, userId, seatId }
    Note over API,MQ: Fire-and-forget · async · dashed arrow

    API-->>U: 200 OK · { orderId, status: "confirmed" }
    Note over U,API: HTTP cycle complete — user sees confirmation

    %% ── Phase 5: Background processing ─────────────────────────────────────
    MQ-)W: consume job "order.confirmed"
    Note over W: Retries with exponential backoff on failure
    W->>W: generatePDF(orderId)
    W->>W: smtp.send(email, pdfAttachment)
    W->>PG: INSERT INTO job_results (job_id, status, completed_at)
    Note over W,PG: Audit trail written after delivery
```

---

## Flow summary

| Step | Actor(s) | Mechanism | Pattern |
|------|----------|-----------|---------|
| 1 | User → API | Seat availability check | Sync HTTP |
| 2–3 | API ↔ Redis | Lock existence check + `SET NX EX 600` | Atomic soft lock |
| 4 | API → User | Seat held, show payment form | Sync HTTP |
| 5 | User → API | Payment with `Idempotency-Key` header | Sync HTTP |
| 6 | API → PostgreSQL | `BEGIN` transaction | Pessimistic write |
| 7 | API → PostgreSQL | Deduct balance · set `Sold` · insert order | 3 writes, 1 tx |
| 8 | API → PostgreSQL | `COMMIT` | Durability guarantee |
| 9 | API → Queue | Publish `order.confirmed` event | Async, fire-and-forget |
| 10 | API → User | `200 OK` with order confirmation | Sync HTTP |
| 11 | Queue → Worker | Consume job, generate PDF, send email | Async, retryable |

## Key architectural decisions

**Redis `SET NX EX 600`** — single atomic command prevents TOCTOU races. Two concurrent requests both doing `EXISTS` then `SET` would break isolation; `SET NX` collapses it into one operation.

**Idempotency key stored in DB** — if Redis is flushed, the API falls back to a DB lookup by `idempotency_key` to detect duplicate submissions. Exactly-once semantics survive cache restarts.

**Publish after `COMMIT`, before response** — the order is durable before the job fires. If the queue is down, the `200 OK` still goes out; a separate outbox poller can re-enqueue from `orders WHERE notified = false`.

**Worker retries via BullMQ** — exponential backoff means transient SMTP failures don't lose the email. The `job_results` write gives an audit trail for observability.
