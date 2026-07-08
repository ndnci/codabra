---
layout: home

hero:
  name: 'Codabra'
  text: 'Configuration-driven application generator'
  tagline:
    Write JSON config files — Codabra compiles them into real applications.
  image:
    src: /logo.png
    alt: Codabra
  actions:
    - theme: brand
      text: Get Started →
      link: /getting-started/installation
    - theme: alt
      text: View on GitHub
      link: https://github.com/ndnci/codabra

features:
  - icon: 🧬
    title: Models
    details:
      Data entities that compile to TypeScript interfaces and your ORM schema
      (Drizzle or Prisma).

  - icon: 🛣️
    title: Routes
    details:
      HTTP endpoints that compile to Next.js API routes — with voters,
      functions, and events wired in.

  - icon: 🖼️
    title: Views
    details:
      Declarative UI that compiles to React page components — no hand-written
      boilerplate.

  - icon: ⚙️
    title: Functions & Events
    details:
      Reusable logic blocks and lifecycle hooks like onUserCreated, triggered
      automatically by mutations.

  - icon: 🔐
    title: Voters
    details:
      Authorization rules attached directly to routes, enforced at compile
      time.

  - icon: 🧩
    title: Providers & ORMs
    details:
      Framework adapters (Next.js today, more soon) and database adapters
      (Drizzle, Prisma) you choose at setup.
---
