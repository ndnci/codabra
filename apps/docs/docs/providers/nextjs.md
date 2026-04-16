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
| `routes/Users.json` → `GET /api/users`     | `src/app/api/users/route.ts`               |
| `routes/Users.json` → `GET /api/users/:id` | `src/app/api/users/[id]/route.ts`          |
| `views/LoginPage.json` → `path: /login`    | `src/app/login/page.tsx`                   |
| `functions/CreateUser.json`                | `src/lib/functions/CreateUser.ts`          |
| `voters/ArticleVoter.json`                 | `src/lib/voters/ArticleVoter.ts`           |

## Versioning

| Version | Next.js | Router     |
| ------- | ------- | ---------- |
| v16     | 16.2.3  | App Router |

Future versions (v17, v18…) will be added without breaking existing projects.

## ORM & database integration

Codabra supports multiple ORMs and databases. Both are chosen independently during project creation:

```bash
npx create-codabra@latest my-app
# → Choose an ORM:      Drizzle ORM (recommended) / Prisma
# → Choose a database:  SQLite (default) / PostgreSQL / MySQL
```

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="drizzle-sqlite" label="Drizzle + SQLite" default>

Generated files: `src/drizzle/schema.ts` and `src/lib/db.ts`.

```bash
cd apps/web
npx drizzle-kit push   # push schema to SQLite (creates sqlite.db automatically)
pnpm dev
```

  </TabItem>
  <TabItem value="drizzle-pg" label="Drizzle + PostgreSQL">

Generated files: `src/drizzle/schema.ts` and `src/lib/db.ts`.

Set `DATABASE_URL` in `apps/web/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
```

```bash
cd apps/web
npx drizzle-kit push
pnpm dev
```

  </TabItem>
  <TabItem value="drizzle-mysql" label="Drizzle + MySQL">

Generated files: `src/drizzle/schema.ts` and `src/lib/db.ts`.

Set `DATABASE_URL` in `apps/web/.env`:

```env
DATABASE_URL=mysql://user:password@localhost:3306/mydb
```

```bash
cd apps/web
npx drizzle-kit push
pnpm dev
```

  </TabItem>
  <TabItem value="prisma-sqlite" label="Prisma + SQLite">

Generated files: `prisma/schema.prisma` and `src/lib/prisma.ts`.

Set `DATABASE_URL` in `apps/web/.env`:

```env
DATABASE_URL=file:./dev.db
```

```bash
cd apps/web
npx prisma migrate dev --name init
pnpm dev
```

  </TabItem>
  <TabItem value="prisma-pg" label="Prisma + PostgreSQL">

Generated files: `prisma/schema.prisma` and `src/lib/prisma.ts`.

Set `DATABASE_URL` in `apps/web/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
```

```bash
cd apps/web
npx prisma migrate dev --name init
pnpm dev
```

  </TabItem>
  <TabItem value="prisma-mysql" label="Prisma + MySQL">

Generated files: `prisma/schema.prisma` and `src/lib/prisma.ts`.

Set `DATABASE_URL` in `apps/web/.env`:

```env
DATABASE_URL=mysql://user:password@localhost:3306/mydb
```

```bash
cd apps/web
npx prisma migrate dev --name init
pnpm dev
```

  </TabItem>
</Tabs>
