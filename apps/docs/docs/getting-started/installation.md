---
sidebar_position: 1
---

# Installation

## Requirements

- Node.js ≥ 18
- pnpm ≥ 9

## Create a new project

```bash
npx create-codabra@latest my-app
```

This will:

1. Ask you to choose a provider (currently: Next.js)
2. Scaffold a Turborepo monorepo
3. Initialise the framework app
4. Create example config files

## Install in an existing project

```bash
pnpm add -g @codabra/cli
```

or use it via your project's dev dependencies:

```bash
pnpm add -D @codabra/cli
```
