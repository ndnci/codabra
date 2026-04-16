---
sidebar_position: 1
---

# Config Overview

All Codabra configuration lives inside a `/config` directory at your project root.

## Directory structure

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
