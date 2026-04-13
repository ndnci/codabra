---
sidebar_position: 1
---

# CLI Commands

The `codabra` CLI is the main entry point for generating and running your app.

## `codabra generate`

Generate application files from your config.

```bash
codabra generate [options]
```

| Option                  | Default     | Description              |
| ----------------------- | ----------- | ------------------------ |
| `-p, --provider <name>` | `nextjs`    | Provider to use          |
| `-c, --config <path>`   | auto-detect | Path to config directory |
| `-a, --app-dir <path>`  | auto-detect | Path to target app       |

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

| Option                  | Default     | Description              |
| ----------------------- | ----------- | ------------------------ |
| `-p, --provider <name>` | `nextjs`    | Provider to use          |
| `-c, --config <path>`   | auto-detect | Path to config directory |
| `-a, --app-dir <path>`  | auto-detect | Path to target app       |
| `--port <port>`         | `3000`      | Dev server port          |

## `codabra build`

Generate files and run the production build.

```bash
codabra build [options]
```

## `create-codabra`

Interactive project scaffolder.

```bash
npx create-codabra@latest my-app
```

Prompts:

1. Provider selection (arrow keys)
2. Confirmation

Then scaffolds a full Turborepo monorepo with the chosen provider.
