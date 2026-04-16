# Codabra

> Configuration Driven Development. Write JSON configs, get real apps.

Codabra reads config files and compiles them into production-ready applications. It works on top of frameworks — not instead of them.

## Quick Start

```bash
npx create-codabra@latest my-app
cd my-app
pnpm install
pnpm codabra dev
```

## Monorepo Structure

```
codabra/
├── apps/
│   ├── docs/          # Documentation (Docusaurus)
│   └── web/           # Example generated app (Next.js)
├── packages/
│   ├── cli/           # CLI tool (codabra, create-codabra)
│   ├── core/          # Config loader, parser, validator, compiler
│   └── providers/     # Framework providers (Next.js, ...)
└── config/            # Example configuration files
```

## Config System

Place your config files in `/config`:

```
config/
├── models/        # Data models (entities)
├── routes/        # API + page routes
├── views/         # Declarative UI definitions
├── functions/     # Reusable logic blocks
├── events/        # Lifecycle hooks
└── voters/        # Authorization rules
```

## CLI Commands

```bash
codabra generate   # Generate app from config
codabra validate   # Validate config files
codabra dev        # Generate + start dev server
codabra build      # Generate + production build
```

## Architecture

- **core** — Config loading, parsing, validation, compilation (no framework coupling)
- **providers** — Framework-specific code generators (Next.js, future: Remix, Nuxt…)
- **cli** — Orchestrates everything; exposes `codabra` and `create-codabra` commands

## License

See [LICENSE](LICENSE) for details.