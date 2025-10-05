# Self-Hosting Guide - JobNeko Platform

## Overview

JobNeko can be deployed in two modes:

1. **SaaS Mode** (Platform-Hosted) - Users pay subscriptions, platform pays AI costs
2. **Self-Hosted Mode** - Users run their own instance with their own OpenAI API key

This guide covers self-hosting setup and configuration.

## Why Self-Host?

**Benefits:**
- ✅ **Full Data Privacy** - Your job data never leaves your server
- ✅ **No Usage Limits** - Unlimited AI requests (you pay OpenAI directly)
- ✅ **No Subscription Fees** - Free software, you only pay for AI usage
- ✅ **Customization** - Modify code to fit your needs
- ✅ **Independence** - Not reliant on external service availability

**Trade-offs:**
- ❌ You manage infrastructure (server, database, backups)
- ❌ You pay OpenAI API costs directly
- ❌ No managed updates (you pull and deploy updates yourself)
- ❌ No platform support (community support only)

## Prerequisites

### Required:
- **Node.js** 18+ (with npm)
- **Database** (SQLite for development, PostgreSQL for production)
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))
- **Git** (to clone repository)

### Optional but Recommended:
- **Tavily API Key** (for web search - [Get one here](https://tavily.com))
- **Docker** & **Docker Compose** (for containerized deployment)
- **Reverse Proxy** (Nginx/Caddy for HTTPS)

## Quick Start (Local Development)

### 1. Clone Repository

```bash
git clone https://github.com/your-org/jobneko-platform.git
cd jobneko-platform/job-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database
DATABASE_URL="file:./dev.db"

# Authentication (Generate a secure random string)
JWT_SECRET="your-very-secure-random-string-here-change-this"

# AI Services - YOUR OpenAI API Key
OPENAI_API_KEY="sk-proj-your-actual-openai-key-here"

# Optional: Web Search for Enhanced Features
TAVILY_API_KEY="tvly-your-tavily-key-here"

# Optional: Encryption for user API keys (if allowing multi-user)
ENCRYPTION_SECRET="another-secure-random-string-change-this"

# Deployment Mode
DEPLOYMENT_MODE="self_hosted"
NODE_ENV="production"
```

### 4. Setup Database

```bash
npx prisma generate
npx prisma db push
```

### 5. Build and Run

```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`

### 6. Create Your Account

1. Navigate to `http://localhost:3000`
2. Register a new account
3. Your account will automatically be set to **SELF_HOSTED** tier with all features

## Production Deployment

### Option 1: Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: jobneko
      POSTGRES_USER: jobneko
      POSTGRES_PASSWORD: change-this-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://jobneko:change-this-password@postgres:5432/jobneko"
      JWT_SECRET: "your-jwt-secret-here"
      OPENAI_API_KEY: "your-openai-key-here"
      TAVILY_API_KEY: "your-tavily-key-here"
      ENCRYPTION_SECRET: "your-encryption-secret-here"
      DEPLOYMENT_MODE: "self_hosted"
      NODE_ENV: "production"
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Deploy:

```bash
docker-compose up -d
```

### Option 2: Traditional VPS Deployment

**On Ubuntu/Debian:**

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Setup database
sudo -u postgres psql
CREATE DATABASE jobneko;
CREATE USER jobneko WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE jobneko TO jobneko;
\q

# Clone and setup application
git clone https://github.com/your-org/jobneko-platform.git
cd jobneko-platform/job-tracker

# Install dependencies
npm install

# Configure environment
nano .env  # Add your keys and database URL

# Setup database
npx prisma generate
npx prisma migrate deploy

# Build application
npm run build

# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start npm --name "jobneko" -- start
pm2 save
pm2 startup
```

### Option 3: Vercel (Serverless)

1. Fork the repository
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Use Vercel Postgres or external PostgreSQL
5. Deploy

**Note:** Vercel free tier has function timeout limits that may affect long AI operations.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL or SQLite connection string |
| `JWT_SECRET` | Yes | Secret for JWT token generation |
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `TAVILY_API_KEY` | No | For web search features |
| `ENCRYPTION_SECRET` | Yes* | For encrypting user API keys (*if multi-user) |
| `DEPLOYMENT_MODE` | Yes | Set to `self_hosted` |
| `NODE_ENV` | Yes | Set to `production` |

### Feature Configuration

Self-hosted instances have ALL features enabled by default:

- ✅ Unlimited jobs
- ✅ Unlimited AI requests
- ✅ Resume matching (comprehensive)
- ✅ Salary intelligence with web search
- ✅ Company intelligence
- ✅ Interview preparation
- ✅ Skills gap analysis
- ✅ Batch operations
- ✅ Advanced filtering
- ✅ Export capabilities

## Multi-User Self-Hosting

If you want to host for multiple users (family, team, etc.):

### Security Considerations

1. **Use HTTPS** - Set up SSL certificate (Let's Encrypt with Certbot)
2. **Strong Passwords** - Enforce password requirements
3. **Firewall** - Only expose necessary ports (80, 443)
4. **Regular Backups** - Backup database regularly
5. **Update Regularly** - Pull latest code and security patches

### User API Key Management

Each user can optionally provide their own OpenAI key:

1. User goes to **Settings** > **API Keys**
2. Enters their OpenAI API key
3. Key is encrypted and stored securely
4. User's requests use their key (not yours)
5. User sees unlimited tier features

This allows you to host for others without paying their AI costs!

## Cost Estimation

### Your Costs (Self-Hosting):

**Infrastructure:**
- Small VPS: $5-10/month (e.g., DigitalOcean, Linode)
- Or free: Home server, old laptop, Raspberry Pi 4+

**OpenAI API:**
- GPT-5 pricing: ~$0.03 per request (estimated)
- Typical usage: 50-200 requests/month per user
- **Cost per user: $1.50 - $6/month**

**Total for 1 user:** $6.50 - $16/month
**Total for family (4 users):** $11 - $34/month

**Compare to SaaS:**
- FREE tier: $0/month (limited features)
- PRO tier: $9.99/month
- PRO MAX tier: $24.99/month

**Self-hosting is cheaper for:**
- Solo users who want full features ($6-16 vs $25)
- Families/teams (split costs)
- Privacy-conscious users
- Users with existing servers

## Maintenance

### Backup Database

**PostgreSQL:**
```bash
pg_dump jobneko > backup-$(date +%Y%m%d).sql
```

**SQLite:**
```bash
cp prisma/dev.db backups/backup-$(date +%Y%m%d).db
```

### Update to Latest Version

```bash
cd jobneko-platform/job-tracker
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart jobneko
```

### Monitor Logs

```bash
pm2 logs jobneko
```

### Check AI Usage & Costs

Go to: https://platform.openai.com/usage

## Troubleshooting

### "OpenAI API Key Invalid"
- Check key starts with `sk-proj-` (project key) or `sk-` (user key)
- Verify key is active on OpenAI dashboard
- Check no extra spaces in `.env` file

### "Database Connection Failed"
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check `DATABASE_URL` format is correct
- Ensure database exists and user has permissions

### "Port 3000 Already in Use"
- Change port in `.env`: `PORT=3001`
- Or kill existing process: `lsof -ti:3000 | xargs kill`

### "AI Requests Timing Out"
- Increase timeout in `next.config.ts`
- Check OpenAI service status: https://status.openai.com
- Try different GPT model (gpt-5-mini faster than gpt-5)

### "Out of Memory"
- Increase Node.js heap: `NODE_OPTIONS="--max-old-space-size=4096" npm start`
- Reduce concurrent operations in batch processing
- Use smaller GPT model

## Advanced Configuration

### Custom AI Models

Edit `lib/services/gpt5-service.ts` to use:
- Different OpenAI models (GPT-4, GPT-3.5)
- Other providers (Anthropic Claude, local LLMs)
- Ollama for fully local AI (no API costs!)

### Custom Branding

- Logo: Replace files in `public/` directory
- Colors: Edit `tailwind.config.ts`
- Name: Update `next.config.ts` and metadata

### Database Optimization

For PostgreSQL production:
```sql
-- Add indexes for performance
CREATE INDEX idx_jobs_user_created ON jobs(user_id, created_at DESC);
CREATE INDEX idx_jobs_match_score ON jobs(match_score DESC);
```

## Migrating from SaaS to Self-Hosted

1. **Export your data** from SaaS platform (if available)
2. **Setup self-hosted instance** following guide above
3. **Import data** using database migration scripts
4. **Update Chrome extension** to point to your server
5. **Enjoy unlimited features!**

## Community & Support

- **GitHub Issues**: https://github.com/your-org/jobneko/issues
- **Discord Community**: https://discord.gg/jobneko
- **Documentation**: https://docs.jobneko.com

## Contributing

We welcome contributions! See `CONTRIBUTING.md` for guidelines.

## License

JobNeko is open-source under the MIT License. See `LICENSE` file.

---

**Questions?** Open an issue on GitHub or ask in Discord!

**Enjoying self-hosting?** Give us a star on GitHub ⭐
