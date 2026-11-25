# Virtual PAS (MetPAS)

Phase 1 front-end mock-up of an enterprise **Policy Administration System**, built as a demo for MetLife stakeholders.

> All data is synthetic and there is no backend. State lives in the browser session only.

## Features

- Role-based experiences: **Operator**, **Manager** and **Support**
- 7 permission profiles and 6 user groups (G1–G6), switchable live from the header
- Group × module permission matrix and restricted data categories with masking
- 26 business modules plus work management and administration: policy changes, claims, finance, product, customer, compliance, technology and more
- Task workflow rules: claim, submit, approve, escalate, with segregation of duties
- Audit-logged actions (assignments, approvals, status changes, permission edits)
- Policyholder and agent self-service views

## Tech stack

React 18 · TypeScript · Vite · React Router 7 · lucide-react · Inter (variable font)

## Getting started

Prerequisites: [Node.js](https://nodejs.org/) 18+, npm and [Git](https://git-scm.com/).

### Fork and clone

1. Clone your fork 

   ```bash
   git clone https://github.com/ayata/MetPAS.git
   cd MetPAS
   ```

### Install and run

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server on port 5173 |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally |

```
