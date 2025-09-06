/init

You are an expert full-stack engineer and product designer.  
Your mission is to create a **job search assistant platform** with a **dashboard web app** and a **companion Chrome extension**.  

### 🎯 Goal
Help users collect job offers from *any website*, store them in a database, filter/search/rate them, and compare them to their resume.  
The platform should feel like a professional dashboard, with **clean UI**, **AI-powered scraping**, and **resume-to-offer matching**.

---

### 🔑 Core Features

1. **Authentication system**
   - Email/password auth (secure, standard best practices).
   - Only authenticated users can use the Chrome extension or dashboard.

2. **Job Offer Extraction (Chrome Extension)**
   - On any job offer webpage, the user clicks a button in the extension.
   - The extension extracts all possible job info:
     - Title, company, location, salary (if available), contract type, required skills, description, perks, remote/hybrid/onsite status, etc.
   - Extraction should be AI-augmented:
     - Use AI scraping/parsing (can leverage installed tools like `n8n` and `ollama`, or call an API).
     - Must work on arbitrary sites, not just well-known platforms.
   - Data is sent to the backend and stored in the database.

3. **Dashboard (Web App)**
   - Users can see all extracted job offers.
   - Features:
     - Filtering (by company, salary range, remote status, skills, etc.).
     - Sorting (by extraction date, rating, match score).
     - Rating system (⭐ 1-5 stars per job).
     - Upload resume (PDF) to user profile.
     - AI-powered matching system:
       - Compare resume content with each job offer.
       - Display a match percentage.

4. **Database**
   - Should work **locally** during dev, but scalable later.
   - Must support structured job schemas (not pure unstructured NoSQL blobs).
   - You decide the best approach (SQL with Prisma or MongoDb and mongoose).
   - Schema must cover:
     - Users, job offers, ratings, resumes, and AI match scores.

5. **Frontend**
   - Built with **Next.js + shadcn/ui**.
   - Must feel like a real dashboard (sidebar, filters, job cards, profile page).
   - Clean, minimal, professional look.

6. **Tests**
   - Pertinent unit and integration tests only.
   - No E2E tests.
   - Cover business logic, parsing, and AI matching.

---

### 📐 Guidelines

- **Tech stack**: Use technologies that AI coding agents handle extremely well:
  - Next.js + TypeScript + Tailwind + shadcn/ui for frontend.
  - Node.js/Express (or Next.js API routes) for backend.
  - Prisma + SQLite (for local dev) or Firestore alternative for persistence.
  - Jest for testing.
- **Code organization**: Keep clear module boundaries (auth, jobs, resumes, ratings, AI services).
- **Chrome Extension**:
  - Simple popup UI with a button “Extract Job Offer”.
  - Content script scrapes DOM → sends to backend for AI enrichment → saved in DB.
- **AI Enrichment**:
  - Use Ollama or OpenAI API for parsing + standardizing job offer data.
  - Should fall back gracefully if some fields can’t be parsed.
- **Resume Matching**:
  - Parse resume PDF → extract skills/experience → vector similarity (basic embedding approach).
  - Compute a % match score for each job.

---

### 🧑‍💻 User Journey

1. User signs up or logs in.
2. Installs Chrome extension.
3. On a job offer page → clicks “Extract Job Offer”.
4. Extension scrapes the page → AI normalizes fields → data stored in DB.
5. User opens dashboard:
   - Sees a list of extracted jobs.
   - Can filter, sort, or star-rate jobs.
   - Uploads resume → match scores appear next to jobs.
6. User continues to collect, rate, and review offers.

---

### 🚀 Deliverables

- Full project scaffold with working auth, DB, API routes, frontend pages, and Chrome extension boilerplate.
- Sample test suite (unit + integration).
- Example resume matching logic with embeddings.
- Seed/demo data for testing.
- Clear README with setup instructions.

---

Now, start generating the project scaffold with these requirements.  
Follow guidelines strictly, but make reasonable technical choices when unspecified.  
Prioritize maintainability, developer experience, and polished UX.

---

## ✅ Implementation Status

**COMPLETED**: Full project scaffold has been implemented with all core features working.

### 🏗️ Architecture Delivered

- **Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui** - Modern, performant web app
- **SQLite + Prisma ORM** - Structured database with type-safe queries
- **JWT Authentication** - Secure user sessions with bcryptjs password hashing
- **Chrome Extension (Manifest V3)** - Job extraction from any website
- **AI-Powered Features** - OpenAI API integration with fallback logic
- **Professional Dashboard** - Clean, responsive UI with filtering and search
- **PDF Resume Upload** - Text extraction and AI-powered matching
- **Comprehensive Testing** - Unit tests for core business logic

### 🎯 Key Features Implemented

✅ **Authentication System**
   - User registration and login
   - JWT token management
   - Secure password hashing
   - Session validation middleware

✅ **Chrome Extension**
   - Job extraction from any website
   - AI-enhanced data parsing
   - Authentication integration
   - Professional popup UI

✅ **Job Management**
   - Extract jobs with AI normalization
   - Rate jobs (1-5 stars)
   - Filter by company, work mode, salary
   - Search functionality
   - Application status tracking

✅ **Resume Matching**
   - PDF upload and text extraction
   - AI-powered skill analysis
   - Job-to-resume match scoring
   - Profile management

✅ **Dashboard UI**
   - Professional, clean interface
   - Real-time job statistics
   - Advanced filtering options
   - Responsive design
   - Toast notifications

### 🛠️ Commands Available

- `npm run dev` - Start development server
- `npm run build` - Production build (✅ passing)
- `npm test` - Run test suite (✅ passing)
- `npm run lint` - Code linting

### 📁 Project Structure

```
job-tracker/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes (auth, jobs, resumes)
│   ├── dashboard/         # Main dashboard page
│   ├── login/register/    # Auth pages
│   └── page.tsx          # Landing page
├── chrome-extension/      # Chrome extension files
│   ├── src/              # Extension scripts
│   ├── manifest.json     # Extension manifest
│   └── public/           # Extension icons
├── lib/                  # Shared utilities
│   ├── auth.ts           # Authentication logic
│   ├── ai-service.ts     # AI/ML services
│   └── prisma.ts         # Database client
├── prisma/               # Database schema
└── __tests__/           # Test files
```

### 🚀 Ready for Development

The project is fully functional and ready for:
1. Local development (`npm run dev`)
2. Chrome extension installation
3. Job extraction and management
4. Resume upload and matching
5. Production deployment

All core requirements have been implemented with modern best practices, comprehensive error handling, and extensible architecture.
