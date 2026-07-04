<div align="center">
  <h1>🐫 Codabra</h1>
  <p><strong>Configuration Driven Development — write JSON configs, get real apps.</strong></p>
  <p>Codabra reads config files and compiles them into production-ready applications. It works on top of frameworks — not instead of them.</p>

  <a href="https://www.npmjs.com/package/@ndnci/codabra">
    <img alt="npm version" src="https://img.shields.io/npm/v/@ndnci/codabra?style=flat-square&color=0070f3" />
  </a>
  <a href="https://www.npmjs.com/package/@ndnci/codabra">
    <img alt="npm downloads" src="https://img.shields.io/npm/dm/@ndnci/codabra?style=flat-square&color=0070f3" />
  </a>
  <a href="https://github.com/ndnci/codabra/blob/main/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/ndnci/codabra?style=flat-square&color=0070f3" />
  </a>
  <a href="https://github.com/ndnci/codabra/actions">
    <img alt="CI" src="https://img.shields.io/github/actions/workflow/status/ndnci/codabra/ci.yml?style=flat-square&label=CI&color=0070f3" />
  </a>
  <img alt="Node.js" src="https://img.shields.io/node/v/@ndnci/codabra?style=flat-square&color=0070f3" />
</div>

---

## What is Codabra?

**Codabra** is a configuration-driven application generator. Instead of hand-writing
boilerplate for models, routes, and views, you describe your app in JSON/TS config
files and Codabra compiles them into real, framework-native code:

- **Generate** models, routes, and views from declarative config
- **Validate** config files before generating anything
- **Dev** — generate + start your app's dev server in one command
- **Build** — generate + run your app's production build
- **Providers** — pluggable code generators per framework (Next.js today, more planned)
- **Database lifecycle** — push, generate, and migrate your schema

---

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

---

## Config System

Place your config files in `/config`:

```
config/
├── models/        # Data models (entities)
├── routes/        # API + page routes
└── views/         # Declarative UI definitions
```

---

## CLI Commands

```bash
codabra generate       # Generate app from config
codabra validate       # Validate config files
codabra dev            # Generate + start dev server
codabra build          # Generate + production build
codabra upgrade        # Upgrade @ndnci/codabra and regenerate app files
codabra add-provider   # Add a new provider to an existing project
codabra db push        # Push schema directly to the database (dev)
codabra db generate    # Generate versioned migration files
codabra db migrate     # Apply pending migrations
codabra create [name]  # Scaffold a new Codabra project
```

| Command                | Description                                      |
| ----------------------- | ------------------------------------------------- |
| `codabra generate` (`g`) | Generate application files from your config       |
| `codabra validate` (`v`) | Validate config files without generating          |
| `codabra dev`            | Generate + start the development server           |
| `codabra build`          | Generate + run the production build                |
| `codabra upgrade`        | Upgrade the CLI and regenerate application files   |
| `codabra add-provider`   | Add a new provider to an existing project          |
| `codabra db push`        | Push the schema directly to the database           |
| `codabra db generate`    | Generate versioned migration files                 |
| `codabra db migrate`     | Apply pending migration files                       |
| `codabra create [name]`  | Scaffold a new Codabra project                      |

---

## Architecture

- **core** — Config loading, parsing, validation, compilation (no framework coupling)
- **providers** — Framework-specific code generators (Next.js, future: Remix, Nuxt…)
- **cli** — Orchestrates everything; exposes the `codabra` and `create-codabra` commands

Only `@ndnci/codabra` (the CLI) is published to npm — `core` and `providers` are
bundled into it at build time.

---

## License

Codabra is source-available under the [Elastic License 2.0](LICENSE).
</content>
