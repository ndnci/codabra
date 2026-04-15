---
sidebar_position: 1
---

# Installation

## Requirements

- Node.js ≥ 18
- pnpm ≥ 9

## Create a new project

```bash
npx @ndnci/codabra@alpha create my-app
```

This will:

1. Ask you to choose a provider (currently: Next.js)
2. Ask you to choose an ORM (Drizzle or Prisma)
3. Ask you to choose a database (SQLite, PostgreSQL, or MySQL)
4. Scaffold a Turborepo monorepo
5. Initialise the framework app
6. Create example config files

## Install in an existing project

```bash
pnpm add -g @ndnci/codabra
```

or use it via your project's dev dependencies:

```bash
pnpm add -D @ndnci/codabra
```
