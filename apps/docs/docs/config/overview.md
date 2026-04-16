---
sidebar_position: 1
---

# Config Overview

All Codabra configuration lives inside a `/config` directory at your project root, and a `codabra.json` file that declares your providers.

## `codabra.json`

The `codabra.json` file at your project root defines which providers (frameworks), ORMs, and databases are active. It supports multiple providers in a single project.

```json
{
    "$schema": "./.codabra/schemas/codabra.schema.json",
    "providers": [
        {
            "provider": "nextjs",
            "orm": "drizzle",
            "database": "sqlite"
        }
    ]
}
```

### Multiple providers

You can configure several providers in the same project — each runs in its own `apps/<provider>/` directory and shares the same `config/` files:

```json
{
    "$schema": "./.codabra/schemas/codabra.schema.json",
    "providers": [
        { "provider": "nextjs", "orm": "drizzle", "database": "sqlite" },
        { "provider": "vuejs", "orm": "prisma", "database": "postgresql" }
    ]
}
```

To add a new provider interactively after project creation, use:

```bash
codabra add-provider
```

### Provider config fields

| Field      | Values                          | Description              |
| ---------- | ------------------------------- | ------------------------ |
| `provider` | `nextjs`                        | Framework provider       |
| `orm`      | `drizzle`, `prisma`             | ORM to use for DB access |
| `database` | `sqlite`, `postgresql`, `mysql` | Database dialect         |

## Config directory structure

```
config/
├── models/        ← Data models (entities)
├── routes/        ← HTTP routes
├── views/         ← Declarative UI definitions
├── functions/     ← Reusable logic
├── events/        ← Lifecycle hooks
└── voters/        ← Authorization rules
```

## File format

Currently supported: **JSON** (`.json` files).

Coming soon: TypeScript (`.ts`) and YAML (`.yaml`).

## Nesting

Files can be nested in sub-folders for organisation. The folder name may be used as a path prefix for routes:

```
config/routes/
  Users.json      → no prefix
  api/
    Admin.json    → may prefix with /api
```

## Multiple definitions per file

Route files can contain a single object or an array of route objects:

```json
[
    { "method": "GET", "path": "/api/articles" },
    { "method": "POST", "path": "/api/articles" }
]
```

Model files always contain a single model definition.
