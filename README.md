# Knowledge Base

A private, fast, developer-friendly knowledge base to capture notes, ideas, and references — fully type-safe with tRPC end-to-end.

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript** (strict mode)
- **tRPC v11** — end-to-end type safety, Zod input validation
- **Prisma 7** — ORM with SQLite (LibSQL adapter)
- **Tailwind CSS** — utility-first styling
- **React Query** — data fetching and cache invalidation

## Features

- Email + password authentication (JWT, HTTP-only cookies)
- Markdown-native notes with live preview
- Auto-save with debounce
- Tags (unique per user, AND-based filtering)
- Bidirectional note linking (backlinks)
- Full-text search (title + content)
- Archive / soft delete
- Dark theme UI

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/guillemdube/knowledge-base.git
cd knowledge-base

# Install dependencies (also generates Prisma client via postinstall)
npm install

# Copy environment variables
cp .env.example .env

# Run database migration
npm run db:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register an account.

### Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── api/trpc/[trpc]/route.ts  # tRPC HTTP handler
│   ├── dashboard/page.tsx        # Notes list, search, tags
│   ├── login/page.tsx            # Login form
│   ├── register/page.tsx         # Registration form
│   ├── notes/[id]/page.tsx       # Note editor
│   ├── layout.tsx                # Root layout + TRPCProvider
│   └── page.tsx                  # Auth redirect
├── lib/
│   ├── auth.ts                   # JWT, bcrypt, cookie helpers
│   ├── prisma.ts                 # Prisma client singleton
│   ├── trpc-client.tsx           # React tRPC provider
│   └── trpc-server.ts           # Server-side tRPC caller
├── server/
│   ├── trpc.ts                   # tRPC init, context, middleware
│   ├── root.ts                   # Root router
│   └── routers/
│       ├── auth.ts               # register, login, logout, me
│       ├── notes.ts              # CRUD, archive, link/unlink
│       ├── tags.ts               # create, list, delete, assign
│       └── search.ts             # full-text + tag search
└── middleware.ts                  # Auth route protection
prisma/
├── schema.prisma                 # Database schema
└── migrations/                   # Migration history
```
