#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { spawn } = require('child_process');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

console.log('🚀 Starting Job Tracker Development Environment...\n');

// Check if .env file exists, if not create it with defaults
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file with default values...');
  const defaultEnv = `# Database
DATABASE_URL="file:./dev.db"

# JWT Secret - CHANGE THIS IN PRODUCTION!
JWT_SECRET="dev-secret-key-change-in-production"

# OpenAI API Key (optional - will use fallback if not provided)
# OPENAI_API_KEY="sk-..."

# Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000"
`;
  fs.writeFileSync(envPath, defaultEnv);
  console.log('✅ .env file created\n');
}

// Initialize database if needed
console.log('🗄️  Initializing database...');
const prismaGenerate = spawn('npx', ['prisma', 'generate'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

prismaGenerate.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Failed to generate Prisma client');
    process.exit(1);
  }

  const prismaPush = spawn('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });

  prismaPush.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Failed to push database schema');
      process.exit(1);
    }

    console.log('✅ Database initialized\n');

    // Start Next.js dev server
    console.log('🔥 Starting Next.js development server...');
    console.log('📱 Web app will be available at: http://localhost:3000');
    console.log('🧩 Chrome extension expects API at: http://localhost:3000/api\n');
    console.log('💡 Tips:');
    console.log('   - Sign in on the web app first');
    console.log('   - The Chrome extension will auto-sync authentication');
    console.log('   - Press Ctrl+C to stop all services\n');

    const nextDev = spawn('next', ['dev'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n👋 Shutting down development environment...');
      nextDev.kill();
      process.exit(0);
    });

    nextDev.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Next.js dev server exited with error');
      }
      process.exit(code);
    });
  });
});