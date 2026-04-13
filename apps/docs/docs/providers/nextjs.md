---
sidebar_position: 2
---

# Next.js Provider

The Next.js provider (v16) targets **Next.js 16.2.3 App Router**.

## Init command

```bash
npx create-next-app@16.2.3 . --typescript --eslint --tailwind --app --src-dir --import-alias "@/*" --yes
```

## Generated file mapping

| Config                                     | Generated file                             |
| ------------------------------------------ | ------------------------------------------ |
| `models/User.json`                         | `src/types/User.ts` (TypeScript interface) |
| `models/User.json`                         | ORM schema file (see ORM section below)    |
| `routes/users.json` → `GET /api/users`     | `src/app/api/users/route.ts`               |
| `routes/users.json` → `GET /api/users/:id` | `src/app/api/users/[id]/route.ts`          |
| `views/LoginPage.json` → `path: /login`    | `src/app/login/page.tsx`                   |
| `functions/CreateUser.json`                | `src/lib/functions/CreateUser.ts`          |
| `voters/ArticleVoter.json`                 | `src/lib/voters/ArticleVoter.ts`           |

## Versioning

| Version | Next.js | Router     |
| ------- | ------- | ---------- |
| v16     | 16.2.3  | App Router |

Future versions (v17, v18…) will be added without breaking existing projects.

## ORM integration

Codabra supports multiple ORMs. Choose during project creation:

```bash
npx create-codabra@latest my-app
# → Choose an ORM: Drizzle ORM (SQLite) (recommended) / Prisma (SQLite)
```

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="drizzle" label="Drizzle (default)" default>

Generated files: `drizzle/schema.ts` and `src/lib/db.ts`.

To apply the schema and start the dev server:

```bash
cd apps/web
npx drizzle-kit push   # push schema to SQLite
pnpm dev
```

Set up `sqlite.db` in your working directory (created automatically on first run).

  </TabItem>
  <TabItem value="prisma" label="Prisma">

Generated files: `prisma/schema.prisma` and `src/lib/prisma.ts`.

To apply the schema and start the dev server:

```bash
cd apps/web
npx prisma migrate dev --name init
pnpm dev
```

Set `DATABASE_URL` in `apps/web/.env` first.

  </TabItem>
</Tabs>
