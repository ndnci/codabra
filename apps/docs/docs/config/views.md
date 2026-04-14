---
sidebar_position: 4
---

# Views

Views define your UI declaratively — no HTML, no CSS classes.

```json title="config/views/LoginPage.json"
{
    "name": "LoginPage",
    "path": "/login",
    "root": {
        "type": "form",
        "fields": [
            { "type": "heading", "label": "Sign in" },
            { "type": "email", "id": "email", "label": "Email" },
            { "type": "password", "id": "password", "label": "Password" },
            { "type": "button", "label": "Login" }
        ]
    }
}
```

## Component types

| Type        | Description                                       |
| ----------- | ------------------------------------------------- |
| `form`      | A form container with `fields`                    |
| `input`     | Generic text input (`type="text"`)                |
| `email`     | Email input (`type="email"`, built-in validation) |
| `password`  | Password input (`type="password"`, masked text)   |
| `button`    | Button (type="submit" in forms)                   |
| `text`      | Paragraph of text                                 |
| `heading`   | `<h1>` heading                                    |
| `container` | Generic `<div>` with `children`                   |
| `flex`      | Flex `<div>` with layout props                    |
| `list`      | Renders a list of model instances                 |
| `table`     | Renders a table of model instances                |
| `card`      | Card container                                    |
| `select`    | Dropdown select                                   |

## Binding to models

```json
{
    "name": "UserList",
    "path": "/users",
    "root": {
        "type": "list",
        "model": "User"
    }
}
```

:::tip Auto-capitalisation
Model refs are **automatically capitalised** — `"model": "users"` is treated the same as `"model": "Users"`.
:::

## Flex layout

The `flex` type generates a `<div style={{ display: 'flex', ... }}>`. Supported props:

| Prop             | Type                                                                        | Default        |
| ---------------- | --------------------------------------------------------------------------- | -------------- |
| `direction`      | `"row"` \| `"row-reverse"` \| `"column"` \| `"column-reverse"`              | `"row"`        |
| `alignItems`     | `"flex-start"` \| `"flex-end"` \| `"center"` \| `"baseline"` \| `"stretch"` | `"stretch"`    |
| `justifyContent` | `"flex-start"` \| `"flex-end"` \| `"center"` \| `"space-between"` \| …      | `"flex-start"` |
| `gap`            | `number` (px) or `string` (e.g. `"1rem"`)                                   | `0`            |

```json
{
    "name": "Dashboard",
    "path": "/dashboard",
    "root": {
        "type": "flex",
        "props": {
            "direction": "row",
            "alignItems": "center",
            "justifyContent": "space-between",
            "gap": 16
        },
        "children": [
            { "type": "heading", "label": "Dashboard" },
            { "type": "button", "label": "New" }
        ]
    }
}
```

Generated output:

```tsx
<div
    style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
    }}
>
    <h1>Dashboard</h1>
    <button type="submit">New</button>
</div>
```

## Generated output

Each view generates a Next.js page component:

- `path: "/login"` → `src/app/login/page.tsx`
