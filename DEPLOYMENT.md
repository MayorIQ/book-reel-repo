# 🚀 BookReel Deployment Guide

Complete guide for deploying BookReel using Docker.

---

## 📋 Prerequisites

- **Docker** (v20.10+)
- **Docker Compose** (v2.0+)
- **API Keys** for:
  - ElevenLabs (Text-to-Speech)
  - OpenAI (Script Generation)
  - Pexels (Stock Videos)
  - Unsplash (Stock Images)

---

## 🐳 Quick Start (Docker Compose)

### 1. Clone and Setup

```bash
# Navigate to project directory
cd Capstone-Project

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use your preferred editor
```

### 2. Configure Environment

Edit `.env` file with your actual API keys:

```env
ELEVENLABS_API_KEY=sk_xxxxx
OPENAI_API_KEY=sk-xxxxx
PEXELS_API_KEY=xxxxx
UNSPLASH_ACCESS_KEY=xxxxx
```

### 3. Start Application

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Check status
docker-compose ps
```

### 4. Access Application

- **Application**: http://localhost:3000
- **Database**: localhost:5432

### 5. Stop Application

```bash
# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

---

## 🔧 Docker Only (No Compose)

If you prefer to use Docker without Docker Compose:

### 1. Build Image

```bash
docker build -t bookreel:latest .
```

### 2. Run PostgreSQL

```bash
docker run -d \
  --name bookreel-db \
  -e POSTGRES_USER=bookreel \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=bookreel \
  -p 5432:5432 \
  postgres:15-alpine
```

### 3. Run Application

```bash
docker run -d \
  --name bookreel-app \
  --link bookreel-db:db \
  -e DATABASE_URL="postgresql://bookreel:your_password@db:5432/bookreel" \
  -e ELEVENLABS_API_KEY="your_key" \
  -e OPENAI_API_KEY="your_key" \
  -e PEXELS_API_KEY="your_key" \
  -e UNSPLASH_ACCESS_KEY="your_key" \
  -p 3000:3000 \
  bookreel:latest
```

---

## ☁️ Cloud Deployment

### Render.com

1. Create new **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `docker build -t bookreel .`
   - **Start Command**: `docker run -p 3000:3000 bookreel`
4. Add environment variables in Render dashboard
5. Deploy!

### Railway.app

1. Create new project from GitHub
2. Railway auto-detects Dockerfile
3. Add PostgreSQL service
4. Set environment variables
5. Deploy automatically

### AWS ECS / Google Cloud Run

1. Build and push image to container registry:
   ```bash
   docker build -t your-registry/bookreel:latest .
   docker push your-registry/bookreel:latest
   ```
2. Create container service
3. Configure environment variables
4. Set up database connection
5. Deploy

---

## 🔍 Troubleshooting

### Application won't start

```bash
# Check logs
docker-compose logs app

# Check database connection
docker-compose exec app npx prisma db pull
```

### Database connection error

```bash
# Ensure database is running
docker-compose ps db

# Test connection
docker-compose exec db psql -U bookreel -d bookreel -c "SELECT 1"
```

### FFmpeg not found

FFmpeg is pre-installed in the Docker image. If you see errors:
```bash
# Rebuild image
docker-compose build --no-cache app
```

### Out of memory errors

Increase Docker memory limit:
- **Docker Desktop**: Settings → Resources → Memory (recommend 4GB+)

### Prisma migration issues

```bash
# Run migrations manually
docker-compose exec app npx prisma migrate deploy

# Reset database (⚠️ deletes data)
docker-compose exec app npx prisma migrate reset
```

---

## 📊 Production Checklist

Before deploying to production:

- [ ] **Security**
  - [ ] Change default PostgreSQL password
  - [ ] Use secrets management for API keys
  - [ ] Enable HTTPS/SSL
  - [ ] Set up firewall rules

- [ ] **Performance**
  - [ ] Configure reverse proxy (Nginx/Caddy)
  - [ ] Set up CDN for static assets
  - [ ] Enable database connection pooling
  - [ ] Configure caching (Redis)

- [ ] **Monitoring**
  - [ ] Set up logging (ELK Stack, Datadog)
  - [ ] Configure health checks
  - [ ] Enable error tracking (Sentry)
  - [ ] Set up uptime monitoring

- [ ] **Backup**
  - [ ] Automated database backups
  - [ ] Volume snapshots
  - [ ] Disaster recovery plan

---

## 🛠️ Maintenance

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Database Backup

```bash
# Backup
docker-compose exec db pg_dump -U bookreel bookreel > backup.sql

# Restore
docker-compose exec -T db psql -U bookreel bookreel < backup.sql
```

### View Application Logs

```bash
# All logs
docker-compose logs -f

# App only
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app
```

---

## 📚 Additional Resources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Prisma Production Guide](https://www.prisma.io/docs/guides/deployment)

---

## 🆘 Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Ensure all API keys are valid
4. Check database connection
5. Review this troubleshooting guide

---

**Happy Deploying! 🎉**

