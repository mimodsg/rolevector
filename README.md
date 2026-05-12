# RoleVector

RoleVector is an AI-assisted CV and application tracking tool focused on ATS
compatibility, job alignment, and reusable career data.

The application lets a user maintain one structured Master CV, create job-specific
applications, generate a cover letter from a reusable template, score ATS alignment,
and optimize application documents against a job opening. It is built around
normalized career data in PostgreSQL, not hand-edited document files.

## Features

- Public welcome page with register and login links
- Credentials-based authentication with user roles
- Admin user CRUD
- Structured Master CV editor
- Master CV import from `.txt` and `.pdf`
- Normalized Master CV storage for profile, skills, work experience, projects,
  education, certifications, languages, hidden keywords, and supporting context
- Cover letter template editor with token replacement
- Application creation from company, position title, salary, and job details
- Baseline ATS score and optimized ATS score comparison
- OpenAI-backed CV optimization with schema validation and deterministic fallback
- Regenerate application CV from the latest Master CV without consuming AI tokens
- Application status updates
- Separate CV and cover letter PDF generation, delivered as a ZIP archive
- AI usage and AI error logging

## Tech Stack

### Application

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- NextAuth credentials provider
- Zod validation

### Data

- PostgreSQL
- Prisma ORM and migrations
- Normalized Master CV tables
- JSON application snapshots for generated optimized CV versions

### AI and Documents

- OpenAI API via the official `openai` SDK
- Structured output parsing with Zod validation
- Local deterministic optimizer fallback
- Puppeteer / Chromium PDF rendering
- `pdf-parse` for Master CV PDF imports

### Local Development

- Lando
- Node 20
- PostgreSQL 16
- ESLint

## Project Structure

```text
.
├── prisma/
│   ├── migrations/          # Database migrations
│   ├── schema.prisma        # Prisma schema
│   └── seed.mjs             # Local seed data and demo users
├── src/
│   ├── app/                 # Next.js routes, pages, and API handlers
│   ├── components/          # UI, feature, and layout components
│   ├── lib/
│   │   ├── schemas/         # Zod schemas
│   │   ├── server/          # Server-only request/session helpers
│   │   ├── services/        # Import, scoring, optimization, and PDF services
│   │   ├── auth.ts          # NextAuth configuration
│   │   ├── env.ts           # Environment validation
│   │   ├── master-cv.ts     # Master CV DB mapping helpers
│   │   └── master-cv-text.ts # ATS/plain text CV serialization
│   ├── middleware.ts        # Auth and admin route protection
│   └── types/               # Type augmentation
├── .lando.yml               # Local development services and tooling
├── .env.example             # Example environment variables
├── package.json
└── README.md
```

## Getting Started

The recommended local setup uses Lando.

```bash
lando start
lando prisma migrate deploy
lando seed
```

The app is served at:

```text
https://rolevector.lndo.site
```

Useful local accounts from the seed:

```text
admin@local.local / admin
demo@rolevector.local / password123
```

## Environment Variables

Copy `.env.example` to `.env.local` for local secrets and API keys. `.env.local`
is ignored by Git.

```bash
cp .env.example .env.local
```

Important variables:

```env
APP_URL="https://rolevector.lndo.site/"
DATABASE_URL="postgresql://postgres@database:5432/rolevector"
NEXTAUTH_URL="https://rolevector.lndo.site"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_URL="https://rolevector.lndo.site/"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5"
PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium"
```

If `OPENAI_API_KEY` is empty or an OpenAI request fails, optimization falls back
to the local deterministic optimizer.

## Common Commands

Run commands through Lando when working in the local environment:

```bash
lando lint
lando typecheck
lando prisma migrate deploy
lando seed
lando prisma studio
```

Package scripts are also available:

```bash
npm run dev
npm run lint
npm run build
npm run start
npm run prisma:generate
npm run prisma:migrate
```

## Application Workflow

1. Create or import a Master CV.
2. Create a cover letter template using supported tokens.
3. Create an application from a job opening.
4. Review the baseline CV snapshot and ATS score.
5. Regenerate the application CV if the Master CV changed.
6. Optimize the application CV once.
7. Review before/after ATS score comparison.
8. Download the CV and cover letter PDFs as a ZIP archive.
9. Track application status.

## Roles and Access

- Anonymous users can view public informational pages.
- Authenticated users can use the application features.
- Admin users can use application features and manage users.

Deleting a user cascades related Master CV, cover letter, application, usage, and
error log data through Prisma relations.

## Design Notes

- Master CV data is normalized in PostgreSQL.
- Application records keep generated optimized CV snapshots for review and PDF
  export.
- OpenAI output is validated before persistence.
- The optimizer restores immutable DB-backed facts before saving generated CVs.
- PDF output is intentionally ATS-safe and document-format polish is treated as a
  later enhancement.

## Status

RoleVector is in active development. The current implementation covers the core
Master CV, cover letter, application, optimization, scoring, and PDF download
workflow.

## License

MIT License. See `LICENSE`.
