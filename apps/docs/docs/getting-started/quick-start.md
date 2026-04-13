---
sidebar_position: 2
---

# Quick Start

## 1. Create your project

```bash
npx create-codabra@latest my-app
cd my-app
pnpm install
```

## 2. Define a model

Edit `config/models/User.json`:

```json
{
    "name": "User",
    "fields": {
        "email": "string",
        "name": "string",
        "createdAt": "date_now"
    }
}
```

## 3. Define routes

Edit `config/routes/users.json`:

```json
[
    { "method": "GET", "path": "/api/users", "response": "User[]" },
    { "method": "POST", "path": "/api/users", "body": { "email": "string", "name": "string" }, "response": "User" },
    { "method": "GET", "path": "/api/users/:id", "params": { "id": "uuid" }, "response": "User" },
    { "method": "DELETE", "path": "/api/users/:id", "params": { "id": "uuid" } }
]
```

## 4. Define a view

Edit `config/views/LoginPage.json`:

```json
{
    "name": "LoginPage",
    "path": "/login",
    "root": {
        "type": "form",
        "fields": [
            { "type": "input", "id": "email", "label": "Email" },
            { "type": "input", "id": "password", "label": "Password" },
            { "type": "button", "label": "Login" }
        ]
    }
}
```

## 5. Generate and start

```bash
pnpm codabra generate   # generates TypeScript types, API routes, pages
pnpm codabra dev        # generates + starts the dev server
```

Your app is now running at **http://localhost:3000** with:

- `GET /api/users` — returns `[]`
- `POST /api/users` — returns `{ success: true }`
- `GET /api/users/:id` — returns `{}`
- `DELETE /api/users/:id` — returns `{ success: true }`
- `/login` — renders a login form

All generated from config — no manual code written!
