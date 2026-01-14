@echo off
REM ============================================================================
REM Test Local Build Before Docker
REM ============================================================================

echo.
echo 🧪 Testing Local Build
echo =====================
echo.

echo Step 1: Install dependencies...
call npm install
if errorlevel 1 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

echo.
echo Step 2: Generate Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo ❌ Prisma generate failed
    pause
    exit /b 1
)

echo.
echo Step 3: Build Next.js application...
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ Build failed!
    echo.
    echo This is the same error that Docker is encountering.
    echo Please fix the errors above before trying Docker build.
    echo.
    pause
    exit /b 1
)

echo.
echo ================================
echo ✅ Local build successful!
echo.
echo Your app builds correctly locally.
echo You can now try: docker build -t bookreel .
echo.

pause

