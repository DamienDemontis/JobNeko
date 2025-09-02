# Job Tracker Platform - Development Guide

## 🚀 Quick Start Commands

```bash
# Development
npm run dev

# Build & Test
npm run build
npm run lint

# Testing
npm run test
npm run test:watch
```

## 📋 Project Overview

A comprehensive job tracking platform with Chrome extension integration for seamless job application management.

### Tech Stack
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Shadcn/UI components
- **Database**: Supabase (PostgreSQL + Auth + Real-time)
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + Testing Library
- **Chrome Extension**: Manifest v3 with content scripts

## 🏗️ Architecture

### Directory Structure
```
src/
  app/                 # Next.js App Router pages
  components/          # Reusable UI components
    ui/               # Shadcn/UI components
    forms/            # Form components
    auth/             # Authentication components
  lib/                # Utility functions
    supabase.ts       # Supabase client configuration
    utils.ts          # General utilities
  hooks/              # Custom React hooks
  types/              # TypeScript type definitions
  constants/          # App constants
chrome-extension/     # Chrome extension files
  manifest.json
  content-scripts/
  popup/
```

## 🗄️ Database Schema

### Core Tables
- `users` - User profiles and settings
- `companies` - Company information
- `jobs` - Job postings and details
- `applications` - Job applications with status tracking
- `application_status_history` - Timeline of application progress

### Key Features
- Row-Level Security (RLS) enabled
- Real-time subscriptions for live updates
- File storage for resumes/documents

## 🔐 Authentication

Using Supabase Auth with:
- Email/password authentication
- OAuth providers (Google, GitHub)
- Protected routes with middleware
- Session management

## 🛠️ Development Workflow

1. **Before starting**: Always run `npm run lint` and `npm run build`
2. **Database changes**: Use Supabase migrations
3. **Components**: Use Shadcn/UI components when possible
4. **Testing**: Write tests for critical paths
5. **Chrome extension**: Test on multiple job sites

## 🧪 Testing Strategy

- **Unit Tests**: Components and utilities
- **Integration Tests**: Database operations and auth flows
- **E2E Tests**: Critical user journeys
- **Chrome Extension**: Test content script extraction

## 🌐 Chrome Extension

### Manifest V3 Features
- Content scripts for job site data extraction
- Popup UI for quick job saving
- Background service worker for API communication
- Shared authentication with web app

### Supported Job Sites
- Indeed
- LinkedIn
- Glassdoor
- AngelList
- Other major job boards

## 🚀 Deployment

- **Frontend**: Vercel (recommended for Next.js)
- **Database**: Supabase cloud
- **Chrome Extension**: Chrome Web Store

## 💡 Future Enhancements

- AI-powered CV-to-job matching
- Application tracking analytics
- Team collaboration features
- Mobile app (React Native)
- API for third-party integrations

---

**Important**: Always test build and lint before committing!