# RoleVector

RoleVector is an AI-assisted CV optimization platform focused on ATS (Applicant Tracking System) compatibility, job alignment, and application customization.

The platform helps developers and technical professionals maintain a single structured master CV while generating optimized versions tailored to specific job descriptions. It also generates supporting documents such as cover letters, evaluates ATS compatibility, and provides scoring and recommendations to improve application quality.

The project is designed around structured data, automation workflows, and AI-assisted analysis rather than traditional document editing.

---

# Features

- Master CV management
- ATS optimization scoring
- Job description analysis
- AI-assisted CV tailoring
- Cover letter generation
- Structured JSON/YAML CV storage
- PDF generation pipeline
- Hidden keywords and supplemental experience support
- Application-specific CV versions
- Plain text export for ATS systems
- Modern dark-themed interface
- Modular architecture for future AI agents and automation workflows

---

# Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- SCSS
- Atomic Design architecture

## Backend

- Node.js
- Express.js

## AI / Processing

- OpenAI API
- Prompt engineering workflows
- ATS parsing logic
- CV scoring engine

## Data

- JSON
- YAML

## Tooling

- ESLint
- Prettier
- Docker
- GitHub Actions

---

# Project Structure

```bash
project-root/
│
├── frontend/
├── backend/
├── shared/
├── prompts/
├── templates/
├── generated/
├── docs/
└── README.md
```

---

# Installation

## Clone the repository

```bash
git clone https://github.com/yourusername/rolevector.git
cd rolevector
```

---

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at:

```bash
http://localhost:5173
```

---

# Backend Setup

```bash
cd backend
npm install
npm run dev
```

The API server will run at:

```bash
http://localhost:3000
```

---

# Environment Variables

Create a `.env` file in the backend directory:

```env
OPENAI_API_KEY=your_api_key
PORT=3000
```

---

# Build

## Frontend

```bash
npm run build
```

## Backend

```bash
npm run start
```

---

# Development Goals

- Improve ATS matching accuracy
- Support multiple CV strategies
- Add AI application agents
- Expand scoring and recommendations
- Improve PDF rendering
- Add job tracking and analytics
- Add recruiter-focused exports
- Add interview preparation workflows

---

# Design Principles

- ATS-first architecture
- Structured over visual editing
- Single source of truth for career data
- Minimal manual repetition
- AI-assisted, not AI-generated spam
- Maintainable and extensible architecture

---

# License

MIT License

---

# Status

Currently in active development.
