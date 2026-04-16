---
sidebar_position: 1
---

# CLI Commands

The `codabra` CLI is the main entry point for generating and running your app.

## `codabra generate`

Generate application files from your config. By default, generates for **all** providers configured in `codabra.json`.

```bash
codabra generate [options]
```

| Option                  | Default     | Description                                        |
| ----------------------- | ----------- | -------------------------------------------------- |
| `-p, --provider <name>` | _(all)_     | Only generate for this provider                    |
| `-c, --config <path>`   | auto-detect | Path to config directory                           |
| `-a, --app-dir <path>`  | auto-detect | Path to target app (only useful with `--provider`) |

**Examples:**

```bash
# Generate for all configured providers
codabra generate

# Generate only the Next.js provider
codabra generate --provider nextjs
```

## `codabra validate`

Validate config files without generating any code.

```bash
codabra validate [options]
```

| Option                | Default     | Description              |
| --------------------- | ----------- | ------------------------ |
| `-c, --config <path>` | auto-detect | Path to config directory |

## `codabra dev`

Generate files and start the development server.

```bash
codabra dev [options]
```

| Option                  | Default                 | Description                  |
| ----------------------- | ----------------------- | ---------------------------- |
| `-p, --provider <name>` | first in `codabra.json` | Provider dev server to start |
| `-c, --config <path>`   | auto-detect             | Path to config directory     |
| `-a, --app-dir <path>`  | auto-detect             | Path to target app           |
| `--port <port>`         | `3000`                  | Dev server port              |

If multiple providers are configured and `--provider` is omitted, the first one in `codabra.json` is used and a warning is shown.

## `codabra build`

Generate files and run the production build.

```bash
codabra build [options]
```

| Option                  | Default                 | Description              |
| ----------------------- | ----------------------- | ------------------------ |
| `-p, --provider <name>` | first in `codabra.json` | Provider to build        |
| `-c, --config <path>`   | auto-detect             | Path to config directory |
| `-a, --app-dir <path>`  | auto-detect             | Path to target app       |

## `codabra upgrade`

Upgrade `@ndnci/codabra` to the latest matching version and regenerate application files.

```bash
codabra upgrade [options]
```

| Option                    | Default         | Description                       |
| ------------------------- | --------------- | --------------------------------- |
| `-v, --version <version>` | latest dist-tag | Pin upgrade to a specific version |

### How dist-tags work

The upgrade command reads the current version spec from your root `package.json` and infers the appropriate dist-tag:

| Current spec    | Resolved dist-tag |
| --------------- | ----------------- |
| `latest`        | `latest`          |
| `alpha`         | `alpha`           |
| `beta`          | `beta`            |
| `rc`            | `rc`              |
| `0.3.0-alpha.4` | `alpha`           |
| `0.2.1`         | `latest`          |

If the npm registry is unreachable, the command falls back to re-running `generate` with the installed version.

### Examples

```bash
# Upgrade to the latest version matching your current dist-tag
codabra upgrade

# Pin to a specific version
codabra upgrade --version 0.5.0

# Force a pre-release version
codabra upgrade --version 0.5.0-alpha.2
```

## `codabra db`

Manage the database lifecycle — push schemas, generate migration files, and apply them.

```bash
codabra db <action> [options]
```

### `codabra db push`

Push the current ORM schema directly to the database. The recommended workflow for development — no migration files are created.

- **Drizzle + SQLite**: runs automatically after every `codabra generate` (safe, instant).
- **Drizzle + PostgreSQL / MySQL**: reads `DATABASE_URL` from `.env.local`, then runs `drizzle-kit push`.
- **Prisma (any database)**: runs `prisma generate && prisma db push`.

```bash
codabra db push [options]
```

| Option                  | Default  | Description                        |
| ----------------------- | -------- | ---------------------------------- |
| `-p, --provider <name>` | _(all)_  | Only run for this provider         |

### `codabra db generate`

Generate versioned migration files without applying them. Use this for production-ready migration workflows.

```bash
codabra db generate [options]
```

| Option                  | Default        | Description                        |
| ----------------------- | -------------- | ---------------------------------- |
| `-p, --provider <name>` | _(all)_        | Only run for this provider         |
| `-n, --name <name>`     | `"migration"`  | Migration name (Drizzle / Prisma)  |

### `codabra db migrate`

Apply pending migration files to the database.

- **Drizzle**: runs `drizzle-kit migrate`.
- **Prisma**: runs `prisma migrate deploy`.

```bash
codabra db migrate [options]
```

| Option                  | Default  | Description                        |
| ----------------------- | -------- | ---------------------------------- |
| `-p, --provider <name>` | _(all)_  | Only run for this provider         |

### How `DATABASE_URL` is resolved

For databases that require a connection string (PostgreSQL, MySQL), the commands look for `DATABASE_URL` in this order:

1. The current environment (`process.env.DATABASE_URL`)
2. The `.env.local` file in the app directory

If neither is set, the command warns and exits without running. The `.env.local` file is created automatically by `codabra generate` if it does not exist, with a pre-filled value matching the Docker dev service credentials.

### Examples

```bash
# Push schema after changing a model (SQLite — runs automatically via codabra generate)
codabra db push

# Push schema for PostgreSQL (requires DATABASE_URL in .env.local or env)
codabra db push --provider nextjs

# Generate a named migration file
codabra db generate --name add_articles_table

# Apply pending migrations (CI / production)
codabra db migrate
```

## `codabra add-provider`

Add a new framework provider to an existing Codabra project. This command is interactive — it prompts you to choose a provider, ORM, and database, then:

1. Updates `codabra.json` with the new provider entry
2. Initialises the framework app inside `apps/<provider>/`
3. Injects ORM runtime dependencies into the new app's `package.json`
4. Runs `pnpm install`
5. Generates application files for the new provider

```bash
codabra add-provider
```

Already-configured providers are excluded from the selection list.

### Example workflow

```bash
# Your project already has nextjs configured.
# Add a second provider:
codabra add-provider

# → Prompts: choose provider, ORM, database
# → Updates codabra.json
# → Scaffolds apps/vuejs/ (or whichever provider)
# → pnpm install
# → codabra generate --provider vuejs

# Then start the new provider's dev server:
codabra dev --provider vuejs
```

## `create-codabra`

Interactive project scaffolder.

```bash
npx create-codabra@latest my-app
```

Prompts:

1. Provider selection (arrow keys)
2. ORM selection
3. Database selection
4. Confirmation

Then scaffolds a full Turborepo monorepo with the chosen provider configured in `codabra.json`.
