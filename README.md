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

1. Click **Fork** at the top right of this repository page to create your own copy.
2. Clone your fork (replace `<your-username>` with your GitHub username):

   ```bash
   git clone https://github.com/<your-username>/MetPAS.git
   cd MetPAS
   ```

   Or clone this repository directly:

   ```bash
   git clone https://github.com/ayata/MetPAS.git
   cd MetPAS
   ```

3. Optional: add the original repository as `upstream` so you can pull in later changes:

   ```bash
   git remote add upstream https://github.com/ayata/MetPAS.git
   git fetch upstream
   git merge upstream/main
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

## Docker deployment

The image is an Nginx server that serves the prebuilt `dist/` folder on port **3000**, with SPA fallback to `index.html` (see `nginx.conf.template`).

```bash
npm run build
docker build -t metlifevirtualpas .
docker run -p 3000:3000 metlifevirtualpas   # http://localhost:3000
```

Run `npm run build` first: the Dockerfile copies `dist/` and does not build the app itself.

## Demo guide

- **Preview** (header): switch the experience (Operator / Manager / Support), the permission profile and the user group independently, or pick a sample persona.
- **Suggested demo path**:
  1. **Priya Raman** (Operator, G1): My Priority Work, then Policy Changes → New policy change (eligibility, documents, before-and-after).
  2. **Elena Petrova** (Senior Operator, G2): Death Claims and Redemptions & Withdrawals.
  3. **Marcus Chen** (Manager, G1): approvals and workload by business area.
  4. **Nikhil Varma** / **Sophie Laurent** (G3): Calculation Engines, Valuation and Pricing, with formulas unlocked.
  5. **Andre Wallace** (Audit / Risk, G4): read-only Audit & Controls.
  6. **James Whitfield** (Super User, G5): System Monitoring, Integration Management, Role & Permissions → Data access.
  7. **Olivia Grant** (agent) and **Hannah Wright** (policyholder), G6: restricted external views and the self-service portal.
- Changes (assignments, approvals, record statuses, permissions) persist for the browser session. To start over, use **Settings → Reset demonstration data**.

## Project structure

```
src/
  App.tsx, main.tsx   App entry and routing
  components/         Shared UI kit, charts, module page kit
  config/             Modules, navigation, permissions, profiles, groups, data access
  data/               Synthetic data per business area
  features/           Feature modules (auth, claims, finance, policies, ...)
  layout/             App shell, sidebar, header
  lib/                Formatting and masking helpers
  store/              Session state, access rules, task workflow rules
  styles/             Design tokens and styles
public/               Static assets (brand logo)
```

## Architecture (extension points)

| Area | Location |
|---|---|
| Business module catalog (26 components + work + admin) | `src/config/modules.ts` |
| Sidebar navigation (built from the catalog) | `src/config/navigation.ts` |
| Permission levels and default group × module matrix | `src/config/permissions.ts` |
| Permission profiles (7) mapped to the 3 experiences | `src/config/profiles.ts` |
| Restricted data categories and group × category defaults | `src/config/dataAccess.ts` |
| Six user groups | `src/config/groups.ts` |
| Internal criticality classification (metadata only, never displayed) | `src/config/tiers.ts` |
| Task types (each owned by a business module) | `src/data/tasks.ts` → `TASK_TYPES` |
| Synthetic module data | `src/data/` (`policyChanges`, `claims`, `finance`, `product`, `customer`, `compliance`, `technology`) |
| Access rules (profile ∩ group module grant; data = group grant capped by profile) | `src/store/access.ts` |
| Task workflow rules (claim, submit, approve, escalate, segregation of duties) | `src/store/taskRules.ts` |
| Session state and actions (audit-logged) | `src/store/AppStore.tsx` |
| Module page kit (restricted sections, masking, gated actions, tables) | `src/components/module.tsx` |
| Design system (tokens, components) | `src/styles/`, `src/components/` |
| Feature modules | `src/features/<area>/` |

## Contributing

1. Fork the repo and create a branch: `git checkout -b feature/my-change`
2. Make your changes and confirm `npm run build` passes (it type-checks the project).
3. Commit, push to your fork and open a pull request against `main`.

## Branding

Place the official MetLife logo at `public/brand/metlife-logo.svg`. It appears on a white plate at the top of the sidebar next to the "MetPAS" name. Until the file exists, a neutral MetPAS mark is shown. To use a PNG, change `CLIENT_LOGO` in `src/layout/Sidebar.tsx`.
