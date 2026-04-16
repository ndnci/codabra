---
sidebar_position: 3
---

# Routes

Routes define your HTTP endpoints. Files go in `config/routes/`.

## Example

```json title="config/routes/Users.json"
{
    "routes": [
        {
            "method": "GET",
            "path": "/api/users",
            "response": "User[]"
        },
        {
            "method": "POST",
            "path": "/api/users",
            "body": {
                "email": "string",
                "name": "string"
            },
            "response": "User"
        },
        {
            "method": "GET",
            "path": "/api/users/:id",
            "params": { "id": "uuid" },
            "response": "User"
        },
        {
            "method": "DELETE",
            "path": "/api/users/:id",
            "params": { "id": "uuid" }
        }
    ]
}
```

## Route fields

| Field      | Type                                    | Description                                  |
| ---------- | --------------------------------------- | -------------------------------------------- |
| `method`   | `GET \| POST \| PUT \| PATCH \| DELETE` | HTTP method                                  |
| `path`     | `string`                                | URL path (use `:param` for dynamic segments) |
| `params`   | `object`                                | URL path parameters                          |
| `body`     | `object`                                | Request body (POST/PUT/PATCH)                |
| `response` | `string`                                | Expected response model name                 |
| `redirect` | `string`                                | Redirect to another path                     |
| `function` | `string`                                | Function to call                             |
| `auth`     | `boolean`                               | Require authentication                       |
| `voter`    | `string`                                | Voter to check authorization                 |

## Body validation

```json
{
    "method": "POST",
    "path": "/api/users",
    "body": {
        "email": {
            "type": "string",
            "required": true,
            "validation": ["notEmpty", "isEmail"]
        }
    }
}
```

## Authentication

Add `"auth": true` to require authentication. The generated handler calls `getAuthUser` and returns `401` if unauthenticated:

```json
{ "method": "GET", "path": "/api/users/:id", "auth": true, "response": "User" }
```

## Authorization (voters)

Add `"voter": "<VoterName>"` to apply an authorization voter. See the [Voters](./voters) page.

## Function routing

Add `"function": "<FunctionName>"` to delegate the handler to a generated function instead of a raw ORM query. See the [Functions](./functions) page.

## Event wiring

When a route mutates a model (POST/PUT/PATCH/DELETE), any matching event is automatically invoked after the database operation. See the [Events](./events) page.

## Generated output

Each unique path segment generates a file:

- `/api/users` → `src/app/api/users/route.ts`
- `/api/users/:id` → `src/app/api/users/[id]/route.ts`

### Example generated route

For `GET /api/users/:id` with `"auth": true` and `"response": "User"`:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="drizzle" label="Drizzle (default)" default>

```ts title="src/app/api/users/[id]/route.ts"
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "../../lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    const id = params.id;
    const userId = getAuthUser(_req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const data = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .then((r) => r[0] ?? null);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
}
```

  </TabItem>
  <TabItem value="prisma" label="Prisma">

```ts title="src/app/api/users/[id]/route.ts"
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { getAuthUser } from "../../lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    const id = params.id;
    const userId = getAuthUser(_req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const data = await prisma.user.findUnique({ where: { id } });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
}
```

  </TabItem>
</Tabs>
