# 🐳 Docker Quick Start

Get BookReel up and running in minutes with Docker!

---

## 🚀 Super Simple Start

### Option 1: Automatic Script (Recommended)

**Linux/Mac:**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

**Windows:**
```cmd
docker-start.bat
```

The script will:
- ✅ Check Docker installation
- ✅ Create `.env` file if needed
- ✅ Build Docker images
- ✅ Start all services
- ✅ Show you where to access the app

---

### Option 2: Manual Steps

**Step 1: Create Environment File**
```bash
cp .env.example .env
```

**Step 2: Edit `.env` and add your API keys:**
```env
ELEVENLABS_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
PEXELS_API_KEY=your_key_here
UNSPLASH_ACCESS_KEY=your_key_here
```

**Step 3: Start Services**
```bash
docker-compose up -d
```

**Step 4: Open Application**
- Visit: http://localhost:3000

---

## 📦 What's Included?

- **Next.js App** - Your BookReel application
- **PostgreSQL** - Database for storing books
- **FFmpeg** - Video generation engine
- **Prisma** - Database ORM

---

## 🛠️ Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Check status
docker-compose ps

# Rebuild after code changes
docker-compose up -d --build
```

---

## 🔍 Troubleshooting

### App won't start?
```bash
# Check logs
docker-compose logs app

# Restart services
docker-compose restart
```

### Database errors?
```bash
# Check database logs
docker-compose logs db

# Reset database (⚠️ deletes all data)
docker-compose down -v
docker-compose up -d
```

### Port already in use?
Edit `docker-compose.yml` and change ports:
```yaml
ports:
  - "3001:3000"  # Use 3001 instead of 3000
```

---

## 📚 Full Documentation

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🆘 Need Help?

1. Check logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Ensure Docker Desktop is running
4. Try rebuilding: `docker-compose up -d --build`

---

**That's it! You're ready to create videos! 🎥✨**

