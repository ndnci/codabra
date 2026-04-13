---
sidebar_position: 1
---

# Contributing Overview

Thank you for your interest in contributing to Codabra! This guide covers the monorepo structure, development setup, and how to add new capabilities.

## Monorepo structure

```
codabra/
├── packages/
│   ├── core/          ← Config loading, parsing, validation, compilation
│   │   └── src/
│   │       ├── orm/           ← ORM adapters (Drizzle, Prisma)
│   │       ├── parser/        ← Code generators (routes, views, functions, …)
│   │       ├── compiler/      ← Orchestrates parsing into files
│   │       ├── loader/        ← Config file loaders
│   │       ├── validator/     ← Config validators
│   │       ├── types/         ← Shared TypeScript types
│   │       └── schemas/       ← JSON Schemas for VS Code autocomplete
│   ├── providers/     ← Framework adapters (Next.js)
│   └── cli/           ← `codabra` and `create-codabra` binaries
└── apps/
    ├── web/           ← Example Next.js app (generated output)
    └── docs/          ← This documentation site
```

## Development setup

**Prerequisites**: Node.js 20+, pnpm 9+.

```bash
# Clone and install
git clone https://github.com/your-org/codabra
cd codabra
pnpm install

# Build all packages in dependency order
pnpm turbo build

# Type-check all packages
pnpm --filter '@codabra/*' exec tsc --noEmit

# Watch mode (rebuilds on change)
pnpm --filter @codabra/core dev
```

## Running the local CLI

```bash
# After building, use the local CLI:
node packages/cli/bin/codabra.js generate
node packages/cli/bin/create-codabra.js my-new-project
```

## Adding a new feature

1. Implement the feature in `packages/core/src/`
2. Export it from `packages/core/src/index.ts`
3. Write a test (or update the example app in `apps/web`)
4. Update the relevant doc page in `apps/docs/docs/`

## Key design principles

- **OrmAdapter** — new ORMs plug in via the Strategy Pattern (`packages/core/src/orm/`)
- **Provider** — new frameworks plug in via the Provider interface (`packages/providers/src/types.ts`)
- **Parsers are pure functions** — each `generate*` function takes config → returns a string
- **No side effects in parsers** — file I/O is handled only by the Compiler
