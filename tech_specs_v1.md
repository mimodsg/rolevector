# ATS CV Optimizer - Technical Specification v1

## Project Overview

ATS CV Optimizer is a local-first application designed to generate ATS-optimized resumes and cover letters tailored to specific job descriptions.

The application maintains a single structured “master CV” per user containing all truthful professional information. When a user pastes a job description, the system analyzes the role requirements and generates:

- An ATS-optimized CV
- A tailored cover letter
- An ATS compatibility score

The generated application is stored historically without modifying previous generated versions.

The architecture must support future SaaS deployment and monetization.

---

# Core Goals

## Primary Goals

- Maintain one editable master CV per user
- Generate ATS-optimized CVs from job descriptions
- Generate tailored cover letters automatically
- Store historical applications
- Track ATS scores
- Export generated CVs as PDF
- Support future multi-user SaaS deployment

## Non-Goals (v1)

- CV editing after generation
- Multiple CV variants
- Billing/subscriptions
- Collaborative editing
- Importing CVs from files
- LinkedIn integration
- AI training/fine-tuning
- Advanced analytics

---

# Recommended Technology Stack

## Frontend

- Next.js
- TypeScript
- TailwindCSS

## Backend

- Next.js API Routes
- Node.js

## Database

- PostgreSQL
- Prisma ORM

## Authentication

- Email/password authentication
- JWT/session-based auth

## AI Integration

- OpenAI API

## PDF Generation

HTML → PDF rendering using:

- Puppeteer

---

# Architecture Overview

## Application Structure

```text
Frontend (Next.js UI)
    |
    v
API Layer (Next.js API routes)
    |
    v
Services Layer
    |
    |-- AI Optimization Service
    |-- ATS Scoring Service
    |-- PDF Generation Service
    |-- Job Parsing Service
    |
    v
PostgreSQL Database
```

---

# Core Features

# 1. User Management

## Features

- User registration
- Login/logout
- Password hashing
- Session management

## User Fields

```yaml
User:
  id:
  name:
  email:
  password_hash:
  created_at:
  updated_at:
```

---

# 2. Master CV System

Each user has one editable master CV.

The master CV contains all truthful information available for optimization.

## Requirements

- Form-based editing
- Structured JSON storage
- ATS-friendly section organization
- Hidden/contextual experience allowed

## Master CV Structure

```yaml
MasterCV:
  basics:
    full_name:
    title:
    email:
    phone:
    location:
    linkedin:
    website:

  summary:

  core_skills: []

  technical_skills:
    languages: []
    frameworks: []
    cms: []
    tools: []

  work_experience:
    - company:
      title:
      location:
      start_date:
      end_date:
      current:
      description:
      achievements: []

  projects:
    - title:
      description:
      technologies: []

  education:
    - institution:
      degree:
      start_date:
      end_date:

  certifications: []

  languages: []

  hidden_context:
    additional_experience: []
    keywords: []
```

---

# 3. Job Description Input

## Input Method

- Paste job description into textarea

## Parsed Metadata

The system must extract:

- Company name
- Position title
- Location
- Seniority
- Required skills
- Preferred skills
- Responsibilities
- Keywords

## Storage

Both must be stored:

- Original pasted job description
- Parsed metadata

---

# 4. AI CV Optimization

## Trigger

User clicks:

```text
Optimize CV for Position
```

## AI Responsibilities

The AI must:

- Analyze the job description
- Compare against master CV
- Reorder/rewrite truthful experience
- Improve ATS keyword alignment
- Preserve factual accuracy
- Never invent:
  - companies
  - dates
  - skills
  - experience
  - achievements

## Output

Generate:

- Optimized CV JSON
- Cover letter text
- ATS score
- Optimization metadata

---

# 5. ATS Optimization Rules

## ATS Requirements

The generated CV must:

- Use single-column layout
- Use standard headings
- Avoid:
  - tables
  - icons
  - graphics
  - text boxes
  - progress bars
  - multi-column layouts

## Preferred Sections

- Professional Summary
- Core Skills
- Technical Skills
- Work Experience
- Projects
- Education
- Certifications
- Languages

## Optimization Strategy

The AI should:

- Prioritize role-relevant skills
- Reorder achievements
- Improve keyword alignment
- Improve readability
- Balance recruiter readability with ATS compatibility

---

# 6. Generated Applications

Each optimization creates an immutable application snapshot.

## Application Fields

```yaml
Application:
  id:
  user_id:

  company_name:
  position_title:
  location:

  original_job_description:

  parsed_metadata:

  optimized_cv_json:

  cover_letter_text:

  ats_score:

  status:

  created_at:
```

## Application Status Values

```yaml
- Draft
- Applied
- Interviewing
- Rejected
- Offer
```

---

# 7. ATS Scoring System

## Initial Implementation

Simple 10-point scoring system.

## Factors

- Keyword alignment
- Skill matching
- Role relevance
- Formatting compatibility
- Experience alignment

Example:

```yaml
ATS Score:
  overall: 8.4
```

---

# 8. PDF Generation

## Source

PDFs are generated from:

- Optimized CV JSON
- Cover letter text

## Rendering Flow

```text
Structured JSON
    ->
HTML Template
    ->
Puppeteer PDF Export
```

## Template Requirements

- ATS-safe
- Minimal styling
- Single-column
- Print optimized

## Initial Template

```text
default-ats
```

---

# 9. Dashboard

## Dashboard Metrics

- Total applications
- Applications by status
- Average ATS score
- Recent applications

## Filters

- Status
- Company
- Date

---

# 10. AI Usage Tracking

Track OpenAI usage for future monetization.

## Usage Fields

```yaml
AIUsage:
  id:
  user_id:
  application_id:

  model:
  input_tokens:
  output_tokens:
  estimated_cost:

  created_at:
```

---

# 11. Error Logging

Store lightweight AI failure logs.

## Error Log Fields

```yaml
AIErrorLog:
  id:
  user_id:
  application_id:

  model:
  error_message:
  retry_count:
  created_at:
```

## Important Rule

Do NOT store:

- Full prompts
- Full CV payloads
- Full job descriptions

Unless debug mode is enabled.

---

# 12. Development Seed Data

Development-only seed data must include:

- Demo user
- Demo master CV
- Demo job description
- Demo generated application
- Demo ATS score
- Demo cover letter

---

# 13. Suggested Project Phases

# Phase 1 - MVP

## Goals

- Authentication
- Master CV CRUD
- Job description input
- OpenAI integration
- CV optimization
- Cover letter generation
- ATS scoring
- Application history
- PDF generation

---

# Phase 2 - UX Improvements

## Goals

- Better dashboard
- Search/filtering
- Improved ATS scoring
- Better PDF styling
- Retry generation
- Better error handling

---

# Phase 3 - SaaS Preparation

## Goals

- Subscription tiers
- Rate limiting
- Usage quotas
- Stripe integration
- Admin dashboard
- Public deployment

---

# 14. Security Requirements

## Requirements

- Password hashing
- Environment variable protection
- OpenAI key stored server-side only
- Input validation
- Rate limiting preparation

---

# 15. OpenAI Integration Requirements

## Initial Model Strategy

Use configurable model setting.

Example:

```env
OPENAI_MODEL=gpt-5
```

## Required AI Operations

- Job parsing
- CV optimization
- Cover letter generation
- ATS scoring

---

# 16. Prompting Rules

## System Prompt Requirements

The optimization prompt must explicitly state:

- Never invent information
- Only use user-provided experience
- Optimize for ATS compatibility
- Optimize for recruiter readability
- Preserve factual accuracy

---

# 17. Future Improvements

## Potential Enhancements

- Multiple templates
- LinkedIn import
- Resume diff viewer
- Editable generations
- AI suggestions
- Multi-language CVs
- Recruiter mode
- Company tracking
- Email tracking
- Analytics
- AI-assisted master CV enhancement
- Resume benchmarking

---

# Final Product Goal

Create a professional-grade ATS optimization platform that:

- Maintains truthful user experience
- Improves ATS compatibility
- Simplifies job applications
- Stores application history
- Scales from local tool to monetizable SaaS platform without major architectural rewrites.

