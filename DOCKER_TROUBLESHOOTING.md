# 🔧 Docker Build Troubleshooting

Common Docker build errors and how to fix them.

---

## ❌ Error: `npm run build` failed (exit code: 1)

### **Quick Fix Steps**

1. **Test build locally first:**
   ```bash
   npm install
   npm run build
   ```
   If this fails, fix the errors before trying Docker.

2. **Use the debug script:**
   ```bash
   # Linux/Mac
   chmod +x docker-build-debug.sh
   ./docker-build-debug.sh
   
   # Windows
   docker-build-debug.bat
   ```

3. **Try simplified Dockerfile:**
   ```bash
   docker build -f Dockerfile.simple -t bookreel .
   ```

---

## 🔍 Common Causes & Solutions

### **1. Prisma Database URL Error**

**Error:**
```
Error: DATABASE_URL environment variable not set
```

**Solution:**
The Dockerfile now includes a dummy DATABASE_URL for build time. If you still see this:

```dockerfile
# Add to Dockerfile before build:
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
```

---

### **2. TypeScript Build Errors**

**Error:**
```
Type error: ...
Failed to compile.
```

**Solution:**
1. Fix TypeScript errors locally:
   ```bash
   npm run lint
   npm run build
   ```

2. If errors persist, temporarily disable strict checking:
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "strict": false
     }
   }
   ```

---

### **3. Out of Memory**

**Error:**
```
FATAL ERROR: Reached heap limit
JavaScript heap out of memory
```

**Solution:**

**Docker Desktop:**
- Settings → Resources → Memory
- Increase to 4GB or more

**Alternative - Use simplified build:**
```bash
docker build -f Dockerfile.simple -t bookreel .
```

---

### **4. Missing Dependencies**

**Error:**
```
Module not found: Can't resolve 'xxx'
```

**Solution:**
```bash
# Delete and reinstall locally
rm -rf node_modules package-lock.json
npm install

# Then rebuild Docker
docker build --no-cache -t bookreel .
```

---

### **5. Prisma Generation Failed**

**Error:**
```
Prisma schema not found
Can't generate Prisma Client
```

**Solution:**
Ensure `prisma/schema.prisma` exists and run:
```bash
npx prisma generate
```

Then rebuild Docker image.

---

### **6. FFmpeg Not Found**

**Error:**
```
Error: ffmpeg not found
```

**Solution:**
FFmpeg is pre-installed in the Dockerfile. If you see this error:

1. Rebuild without cache:
   ```bash
   docker build --no-cache -t bookreel .
   ```

2. Verify FFmpeg in container:
   ```bash
   docker run -it bookreel:latest ffmpeg -version
   ```

---

## 🐛 Debug Mode

### **Verbose Build**

```bash
# Linux/Mac
./docker-build-debug.sh

# Windows
docker-build-debug.bat
```

This will:
- ✅ Show detailed build output
- ✅ Save logs to `docker-build.log`
- ✅ Help identify exact error

---

### **Interactive Debug**

If build fails, inspect at the failure point:

```bash
# Build to the point before failure
docker build --target builder -t bookreel:debug .

# Enter the container
docker run -it bookreel:debug sh

# Inside container, try commands manually
npm run build
```

---

## 🔄 Alternative Build Methods

### **Method 1: Simplified Dockerfile**

Use `Dockerfile.simple` for easier debugging:

```bash
docker build -f Dockerfile.simple -t bookreel .
```

**Pros:**
- Easier to debug
- Single stage build
- All dependencies visible

**Cons:**
- Larger image size
- Less optimized

---

### **Method 2: Local Build, Docker Deploy**

Build locally, then copy to Docker:

```dockerfile
# Create Dockerfile.local
FROM node:18-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json package-lock.json ./
COPY .next ./.next
COPY public ./public
COPY node_modules ./node_modules
COPY prisma ./prisma

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build locally
npm run build

# Build Docker with pre-built files
docker build -f Dockerfile.local -t bookreel .
```

---

## 📊 Check Build Context

Large build context can cause issues:

```bash
# Check size
du -sh .

# Check what's being sent to Docker
docker build --no-cache --progress=plain . 2>&1 | grep "Sending build context"
```

**Expected size:** < 100MB (excluding node_modules)

If larger, update `.dockerignore`:
```
node_modules
.next
.git
*.log
```

---

## 🧪 Test Builds Step by Step

Build each stage separately:

```bash
# Stage 1: Dependencies
docker build --target deps -t bookreel:deps .

# Stage 2: Builder
docker build --target builder -t bookreel:builder .

# Stage 3: Runner
docker build -t bookreel:latest .
```

---

## 📝 Build Checklist

Before building Docker image:

- [ ] ✅ Local build succeeds: `npm run build`
- [ ] ✅ No TypeScript errors: `npm run lint`
- [ ] ✅ Prisma generates: `npx prisma generate`
- [ ] ✅ `.dockerignore` exists
- [ ] ✅ `node_modules` not committed to Git
- [ ] ✅ Docker has enough memory (4GB+)
- [ ] ✅ `.env` in `.dockerignore` (security)

---

## 🆘 Still Having Issues?

1. **Run debug script:**
   ```bash
   ./docker-build-debug.sh
   ```

2. **Check the logs:**
   - Look for the first error (not the last)
   - Error is usually near "npm run build"

3. **Share the error:**
   - Copy error from `docker-build.log`
   - Include Docker version: `docker --version`
   - Include Node version: `node --version`

---

## 💡 Pro Tips

### **Faster Builds**

Cache dependencies between builds:
```bash
# Use BuildKit for better caching
DOCKER_BUILDKIT=1 docker build -t bookreel .
```

### **Smaller Images**

The multi-stage Dockerfile already optimizes size:
- Stage 1: Install deps (discarded)
- Stage 2: Build app (discarded)
- Stage 3: Runtime only (~200MB)

### **Build Arguments**

Pass build-time variables:
```bash
docker build \
  --build-arg NODE_ENV=production \
  -t bookreel .
```

---

## ✅ Success Indicators

When build succeeds, you'll see:

```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization

Successfully built <image-id>
Successfully tagged bookreel:latest
```

Then you can run:
```bash
docker run -p 3000:3000 bookreel:latest
```

---

**Happy Building! 🚀**

