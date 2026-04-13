---
sidebar_position: 2
---

# Models

Models define your data entities. Each JSON file in `config/models/` is one model.

## Basic example

```json title="config/models/User.json"
{
    "name": "User",
    "fields": {
        "email": "string",
        "name": "string",
        "createdAt": "date_now"
    }
}
```

`id` is always implicit — it's generated as a UUID.

## Field types

| Type        | TypeScript  | ORM type (Drizzle / Prisma)                                      | Notes                    |
| ----------- | ----------- | ---------------------------------------------------------------- | ------------------------ |
| `string`    | `string`    | `text` / `String`                                                |                          |
| `number`    | `number`    | `integer` / `Int`                                                |                          |
| `boolean`   | `boolean`   | `integer (0/1)` / `Boolean`                                      |                          |
| `date`      | `Date`      | `integer (epoch ms)` / `DateTime`                                |                          |
| `date_now`  | `Date`      | `integer.$defaultFn(Date.now)` / `DateTime @default(now())`      | Auto-set on create       |
| `uuid`      | `string`    | `text.$defaultFn(crypto.randomUUID)` / `String @default(uuid())` | Auto-generated UUID      |
| `ModelName` | `ModelName` | FK column / relation                                             | References another model |

## Full field definition

You can use a shorthand string or a full field object:

```json
{
    "name": "Article",
    "fields": {
        "title": "string",
        "body": {
            "type": "string",
            "required": false
        },
        "published": {
            "type": "boolean",
            "default": false
        },
        "authorId": {
            "type": "string",
            "unique": false
        }
    }
}
```

## Relations

```json
{
    "name": "Article",
    "fields": {
        "author": {
            "type": "User",
            "relation": {
                "model": "User",
                "type": "one-to-many"
            }
        }
    }
}
```

## Relation generation

When you declare a relation, Codabra automatically generates **both sides** of the relation. For example:

```json title="config/models/Article.json"
{
    "name": "Article",
    "fields": {
        "title": "string",
        "author": {
            "type": "User",
            "relation": { "model": "User", "type": "one-to-many" }
        }
    }
}
```

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="drizzle" label="Drizzle (default)" default>

```ts title="drizzle/schema.ts"
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable("articles", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    // FK to users:
    authorId: text("authorId"),
});

export const users = sqliteTable("users", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    name: text("name").notNull(),
    createdAt: integer("createdAt")
        .$defaultFn(() => Date.now())
        .notNull(),
});
```

  </TabItem>
  <TabItem value="prisma" label="Prisma">

```prisma title="prisma/schema.prisma"
model Article {
  id      String   @id @default(uuid())
  title   String
  author  User[]
}

model User {
  id        String   @id @default(uuid())
  email     String
  name      String
  createdAt DateTime @default(now())
  // auto-generated backref:
  article   Article  @relation("Article_author", fields: [articleId], references: [id])
  articleId String
}
```

  </TabItem>
</Tabs>

Supported relation types: `one-to-one`, `one-to-many`, `many-to-many`.

## Generated output

For each model Codabra generates:

- `apps/web/src/types/<ModelName>.ts` — TypeScript interface (with relation imports)
- ORM schema file (aggregated, all models):
    - Drizzle: `apps/web/drizzle/schema.ts`
    - Prisma: `apps/web/prisma/schema.prisma`
- ORM client singleton:
    - Drizzle: `apps/web/src/lib/db.ts`
    - Prisma: `apps/web/src/lib/prisma.ts`
