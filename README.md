# Sector Guard

An AI-powered expense reimbursement auditing platform. Employees upload receipts, a hosted vision-language model extracts the data automatically, and a rule-based fraud engine catches policy violations before finance ever sees them.

**Live demo:** https://sector-guard.vercel.app/

---

## Overview

Sector Guard automates the expense reimbursement workflow that finance teams usually handle manually:

1. An employee uploads a receipt (ride, food, or accommodation)
2. A hosted vision-language model (Groq's Llama 4 Scout) extracts structured data — merchant, amount, currency, date, category, line items — with zero manual entry
3. A rule-based fraud engine audits the expense against the employee's recent history, checking for policy violations, receipt-splitting fraud, and temporally impossible claims
4. Each expense is scored, categorized (`APPROVED` / `FLAGGED` / `DENIED`), and the employee's trust rating adjusts accordingly
5. At month-end, approved expenses are aggregated and **locked** into an immutable payout record — capped at the employee's monthly tier limit, with a category-wise (Travel / Food / Stay / Other) breakdown

---

## Features

- **Automated receipt parsing** — no manual data entry; a vision LLM reads the receipt image directly
- **Fraud detection engine**
  - Per-transaction policy limit checks
  - Split-receipt detection (catches attempts to divide one large expense into several smaller ones to dodge limits)
  - Temporal conflict detection (flags physically implausible overlapping claims, e.g. two transport charges minutes apart)
  - Flagged/denied claims auto-surface a plain-language explanation modal (which rule triggered, why, and what happens next) instead of a bare status badge
- **Dynamic employee trust rating** — auto-adjusts based on audit history (clean record improves it, fraud flags lower it)
- **Employee management** — full CRUD (create, view, edit, cascade-delete)
- **Monthly payout engine**
  - Locks in a permanent, immutable record once a month is closed
  - Caps actual payout at the employee's tier limit, while transparently showing total claimed vs. actual paid
  - Category breakdown (Travel / Food / Stay / Other) per payout period
- **Batch receipt upload** — process multiple receipts sequentially in one go
- **Responsive UI** — glassmorphic design, works on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma (adapter-based, `@prisma/adapter-pg`) |
| AI / Vision | Groq API — `Qwen 3.6 27B` |
| Local dev infra | Docker Compose |
| Production hosting | Vercel |
| Production database | Neon (serverless Postgres) |

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Employee   │────▶│  Groq Vision │────▶│   Prisma /   │────▶│  Fraud Audit │
│   Uploads    │     │  LLM Extract │     │   Postgres   │     │    Engine    │
│   Receipt    │     │  Structured  │     │   Expense    │     │  Risk Score  │
└─────────────┘     │     Data     │     │    Record    │     │   + Status   │
                     └──────────────┘     └─────────────┘     └──────┬───────┘
                                                                       │
                                                                       ▼
                                                            ┌──────────────────┐
                                                            │  Employee Trust   │
                                                            │  Rating Updated   │
                                                            └──────────────────┘

                        ── At month-end ──

┌──────────────┐     ┌────────────────┐     ┌───────────────────┐
│  All Approved │────▶│  Sum & Cap at   │────▶│  Locked Monthly    │
│   Expenses    │     │  Tier Limit     │     │  Payout Record     │
│  (that month) │     │  + Categorize   │     │  (immutable)       │
└──────────────┘     └────────────────┘     └───────────────────┘
```

### Key design decisions

- **Groq over local inference**: originally prototyped with a locally-hosted vision model (Ollama + Qwen2.5-VL) but moved to Groq's hosted API for portability — the app needs to run reliably in interview/demo settings without depending on local GPU hardware.
- **Prisma with driver adapters**: uses `@prisma/adapter-pg` rather than the default connection method, required for compatibility with serverless deployment on Vercel.
- **Fraud detection is rule-based, not ML-based**: deliberately deterministic and explainable — every flag has a clear, auditable reason, which matters more than a black-box model for a compliance-adjacent use case.
- **Cascade delete for employees**: deleting an employee removes their full history. This was a deliberate simplicity trade-off for a demo project; a production system would more likely block deletion of employees with existing financial records to preserve the audit trail.
- **Monthly payout caps, not per-transaction aggregate limits**: the fraud engine checks individual transactions in real time; the monthly tier limit is enforced at payout close, mirroring how real reimbursement cycles reconcile spend against a budget at cycle-end rather than blocking every transaction live.
- **No authentication**: out of scope for this project's focus (the extraction + fraud-detection pipeline). A production version would add role-based access control (admin vs. employee-scoped permissions).

---

## Getting Started (Local Development)

### Prerequisites

- Docker & Docker Compose
- A [Groq API key](https://console.groq.com/keys)

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/<your-username>/sector-guard.git
   cd sector-guard
   ```

2. Create a `.env` file in the project root:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. Start the containers:
   ```bash
   docker compose up -d
   ```
   This spins up the Next.js app and a local PostgreSQL instance, and automatically runs Prisma migrations.

4. Open [http://localhost:3000](http://localhost:3000)

### Useful commands

```bash
# View logs
docker compose logs -f web

# Run a new migration after schema changes
docker compose exec web npx prisma migrate dev --name your_migration_name

# Open Prisma Studio (visual DB browser)
docker compose exec web npx prisma studio --port 5555 --browser none
# then visit http://localhost:5555
```

---

## Deployment

The app is deployed on **Vercel**, backed by a **Neon** (serverless Postgres) production database.

Required environment variables on Vercel:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (for serverless runtime) |
| `GROQ_API_KEY` | Groq API key |

> Note: database migrations against Neon should use the **direct** (non-pooled) connection string, since Neon's connection pooler doesn't support the session-level advisory locks Prisma's migration tooling relies on.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Main dashboard (Home + Employees)
│   └── api/
│       ├── audit/route.ts        # Receipt upload + parsing + audit pipeline
│       ├── employees/route.ts    # List / create employees
│       ├── employees/[id]/route.ts   # Get / update / delete employee
│       └── payouts/close/route.ts    # Close a monthly payout
├── components/
│   ├── EmployeeList.tsx
│   ├── EmployeeDetail.tsx
│   ├── AddEmployeeModal.tsx
│   ├── AboutModal.tsx
│   └── AnomalyCard.tsx
├── lib/
│   ├── prisma.ts                 # Shared Prisma client
│   ├── ai/promptEngine.ts        # Groq vision extraction
│   └── engine/
│       ├── fraudCore.ts          # Fraud detection + risk scoring
│       ├── employeeStats.ts      # Employee profile / summary queries
│       └── payoutEngine.ts       # Monthly payout close logic
└── prisma/
    └── schema.prisma
```

---

## Known Limitations

- No authentication or access control
- Fraud detection rules are per-transaction and merchant/time-window based; no monthly aggregate anomaly detection beyond the payout cap
- No automated tests
- Category mapping (Travel / Food / Stay / Other) is a fixed lookup, not configurable per organization

---

## License

This project was built as a personal portfolio project.