---
slug: /
sidebar_position: 1
---

# Introduction

**Codabra** is a configuration-driven application generator.

Write JSON config files — Codabra compiles them into real applications.

## How it works

```
/config          →   Codabra   →   /apps/web (Next.js)
 models/                             src/types/User.ts
 routes/                             src/app/api/users/route.ts
 views/                              src/app/login/page.tsx
                                     drizzle/schema.ts  (or prisma/schema.prisma)
```

Codabra does **not** replace frameworks. It generates code that runs inside them.

## Core concepts

| Concept       | What it is                                                          |
| ------------- | ------------------------------------------------------------------- |
| **Models**    | Data entities (compile to TypeScript interfaces + ORM schema)       |
| **Routes**    | HTTP endpoints (compile to Next.js API routes)                      |
| **Views**     | Declarative UI (compile to React page components)                   |
| **Functions** | Reusable logic blocks                                               |
| **Events**    | Lifecycle hooks (e.g. `onUserCreated`)                              |
| **Voters**    | Authorization rules                                                 |
| **Providers** | Framework adapters (Next.js, future: Remix, Nuxt…)                  |
| **ORMs**      | Database adapters (Drizzle, Prisma) — choose your database at setup |

## Design principles

- Config files are the **single source of truth**
- The CLI **orchestrates** — it does not replace the framework runtime
- Everything is **extensible**: add new providers, ORMs, or config formats
- Separation of concerns: **parse → validate → compile**
