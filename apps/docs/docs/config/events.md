---
sidebar_position: 6
---

# Events

Events wire lifecycle triggers to functions. After a model is created, updated, or deleted, the associated function is automatically called.

```json title="config/events/UserCreated.json"
{
    "name": "UserCreated",
    "trigger": "onUserCreated",
    "function": "SendWelcomeEmail"
}
```

## Trigger naming convention

Triggers follow the pattern `on<Model><Action>`:

| Trigger            | Fires when…                  |
| ------------------ | ---------------------------- |
| `onUserCreated`    | A `User` is POSTed           |
| `onArticleDeleted` | An `Article` is DELETEd      |
| `onOrderUpdated`   | An `Order` is PUT or PATCHed |

## Generated output

Events are wired directly into the generated API route handlers. For example, with the `UserCreated` event above, the `POST /api/users` route becomes:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="drizzle" label="Drizzle (default)" default>

```ts title="src/app/api/users/route.ts (excerpt)"
import { SendWelcomeEmail as sendWelcomeEmailEvent } from "../../lib/functions/SendWelcomeEmail";
import { db } from "../../lib/db";
import { users } from "../../drizzle/schema";

export async function POST(_req: NextRequest) {
    const body = await _req.json();
    const data = await db
        .insert(users)
        .values({ email: body.email, name: body.name })
        .returning()
        .then((r) => r[0]);
    await sendWelcomeEmailEvent({ ...data }); // ← event wired here
    return NextResponse.json(data, { status: 201 });
}
```

  </TabItem>
  <TabItem value="prisma" label="Prisma">

```ts title="src/app/api/users/route.ts (excerpt)"
import { SendWelcomeEmail as sendWelcomeEmailEvent } from "../../lib/functions/SendWelcomeEmail";

export async function POST(_req: NextRequest) {
    const body = await _req.json();
    const data = await prisma.user.create({ data: { email: body.email, name: body.name } });
    await sendWelcomeEmailEvent({ ...data }); // ← event wired here
    return NextResponse.json(data, { status: 201 });
}
```

  </TabItem>
</Tabs>

No extra event dispatcher file is needed — events are inlined at the call site.
