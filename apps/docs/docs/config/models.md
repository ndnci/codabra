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

The TypeScript type is always the same regardless of ORM or database. The generated ORM column type depends on the chosen ORM and database.

| Type        | TypeScript  | Drizzle — SQLite             | Drizzle — PostgreSQL        | Drizzle — MySQL                | Prisma (all databases)     | Notes                    |
| ----------- | ----------- | ---------------------------- | --------------------------- | ------------------------------ | -------------------------- | ------------------------ |
| `string`    | `string`    | `text`                       | `text`                      | `varchar(255)`                 | `String`                   |                          |
| `number`    | `number`    | `integer`                    | `integer`                   | `int`                          | `Int`                      |                          |
| `boolean`   | `boolean`   | `integer` (0/1)              | `boolean`                   | `boolean`                      | `Boolean`                  |                          |
| `date`      | `Date`      | `integer` (epoch ms)         | `timestamp`                 | `timestamp`                    | `DateTime`                 |                          |
| `date_now`  | `Date`      | `integer` + `.now()`         | `timestamp` + `.now()`      | `timestamp` + `.now()`         | `DateTime @default(now())` | Auto-set on create       |
| `uuid`      | `string`    | `text` + `randomUUID()`      | `uuid` + `.defaultRandom()` | `varchar(36)` + `randomUUID()` | `String @default(uuid())`  | Auto-generated UUID      |
| `ModelName` | `ModelName` | FK `text` / `integer` column | FK `uuid` column            | FK `varchar(36)` column        | FK relation                | References another model |

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
  <TabItem value="drizzle-sqlite" label="Drizzle + SQLite" default>

```ts title="src/drizzle/schema.ts"
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable("articles", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    authorId: text("authorId"), // FK to users
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
  <TabItem value="drizzle-pg" label="Drizzle + PostgreSQL">

```ts title="src/drizzle/schema.ts"
import { pgTable, text, integer, uuid, timestamp } from "drizzle-orm/pg-core";

export const articles = pgTable("articles", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    authorId: uuid("authorId"), // FK to users
});

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

  </TabItem>
  <TabItem value="drizzle-mysql" label="Drizzle + MySQL">

```ts title="src/drizzle/schema.ts"
import { mysqlTable, varchar, int, boolean, timestamp } from "drizzle-orm/mysql-core";

export const articles = mysqlTable("articles", {
    id: varchar("id", { length: 36 })
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    title: varchar("title", { length: 255 }).notNull(),
    authorId: varchar("authorId", { length: 36 }), // FK to users
});

export const users = mysqlTable("users", {
    id: varchar("id", { length: 36 })
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt")
        .$defaultFn(() => new Date())
        .notNull(),
});
```

  </TabItem>
  <TabItem value="prisma" label="Prisma (all databases)">

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
