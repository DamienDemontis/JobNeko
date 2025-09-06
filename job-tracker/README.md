# Job Tracker - AI-Powered Job Application Management

A comprehensive job search assistant platform with a dashboard web app and companion Chrome extension. Extract, organize, and track job applications with AI-powered matching.

## 🚀 Features

- **Chrome Extension**: Extract job information from any website with one click
- **AI-Powered Extraction**: Automatically parse and normalize job data
- **Resume Matching**: Upload your resume and get AI-calculated match scores
- **Professional Dashboard**: Clean, minimal interface for managing applications
- **Job Tracking**: Rate, filter, and organize your job applications
- **Authentication**: Secure email/password authentication system

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT with bcryptjs
- **AI/ML**: OpenAI API (optional, with fallback logic)
- **Testing**: Jest + Testing Library
- **Chrome Extension**: Vanilla JavaScript with Manifest V3

## 📋 Prerequisites

- Node.js 18+ and npm
- Chrome browser (for extension)
- OpenAI API key (optional, for enhanced AI features)

## 🔧 Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Update the `.env` file with your configuration:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# AI Services (optional)
OPENAI_API_KEY="your-openai-api-key"
OLLAMA_API_URL="http://localhost:11434"
```

### 3. Database Setup

```bash
# Generate Prisma client and run migrations
npx prisma generate
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 5. Chrome Extension Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from the project

## 🎯 Usage

### Getting Started
1. **Sign Up**: Create an account at `http://localhost:3000/register`
2. **Install Extension**: Load the Chrome extension as described above
3. **Extract Jobs**: Visit any job posting page and click the extension icon
4. **Upload Resume**: Upload your PDF resume for AI matching
5. **Manage Applications**: Use the dashboard to track and organize jobs

### Chrome Extension
- Click the extension icon on any job posting page
- Sign in with your account credentials
- Click "Extract Job Offer" to automatically parse job information
- View extracted jobs in your dashboard

### Dashboard Features
- **Search & Filter**: Find jobs by company, title, work mode, and more
- **Rating System**: Rate jobs with 1-5 stars
- **Match Scores**: See AI-calculated compatibility percentages
- **Application Status**: Track application progress
- **Resume Upload**: Upload PDF resumes for enhanced matching

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📁 Project Structure

```
job-tracker/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── jobs/         # Job management endpoints
│   │   └── resumes/      # Resume upload endpoints
│   ├── dashboard/        # Dashboard page
│   ├── login/           # Login page
│   └── register/        # Registration page
├── chrome-extension/     # Chrome extension files
│   ├── src/             # Extension scripts
│   └── public/          # Extension assets
├── lib/                 # Shared utilities
│   ├── auth.ts         # Authentication utilities
│   ├── ai-service.ts   # AI/ML services
│   └── prisma.ts       # Database client
├── prisma/             # Database schema and migrations
└── __tests__/          # Test files
```

## 🔐 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure session management
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **File Upload Security**: Type and size validation for resume uploads

## 🤝 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Jobs
- `GET /api/jobs` - List jobs with filtering
- `POST /api/jobs/extract` - Extract job from page data
- `GET /api/jobs/[id]` - Get specific job
- `PATCH /api/jobs/[id]` - Update job
- `DELETE /api/jobs/[id]` - Delete job
- `POST /api/jobs/[id]/rate` - Rate a job

### Resumes
- `POST /api/resumes/upload` - Upload resume PDF
- `GET /api/resumes` - List user resumes
- `DELETE /api/resumes` - Delete resume

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure DATABASE_URL is correctly set
   - Database file will be created automatically

2. **Extension Not Working**
   - Check if extension is loaded in Chrome
   - Verify manifest.json permissions
   - Check browser console for errors

3. **AI Features Not Working**
   - Verify OPENAI_API_KEY is set (optional)
   - Fallback logic handles missing AI services

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ using Next.js, Prisma, and modern web technologies.
