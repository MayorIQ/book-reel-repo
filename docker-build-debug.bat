@echo off
REM ============================================================================
REM Docker Build Debug Script (Windows)
REM ============================================================================
REM This script builds the Docker image with verbose output to help debug issues

echo.
echo 🔍 Docker Build Debug Mode
echo ===========================
echo.

REM Check Docker version
echo 📋 Docker Version:
docker --version
echo.

REM Check if .env exists
if exist .env (
    echo ⚠️  Warning: .env file exists. Make sure it's in .dockerignore
    echo.
)

REM Option to use simplified Dockerfile
echo Which Dockerfile would you like to use?
echo 1^) Dockerfile ^(multi-stage, optimized^)
echo 2^) Dockerfile.simple ^(single-stage, easier to debug^)
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="2" (
    set DOCKERFILE=Dockerfile.simple
    echo Using simplified Dockerfile
) else (
    set DOCKERFILE=Dockerfile
    echo Using standard Dockerfile
)
echo.

REM Build with verbose output
echo 🔨 Building Docker image...
echo This may take several minutes...
echo.

docker build --file %DOCKERFILE% --no-cache --progress=plain --tag bookreel:debug . 2>&1 | tee docker-build.log

if %errorlevel% equ 0 (
    echo.
    echo ================================
    echo ✅ Build succeeded!
    echo.
    echo Build log saved to: docker-build.log
    echo.
    echo To run the image:
    echo   docker run -p 3000:3000 bookreel:debug
) else (
    echo.
    echo ================================
    echo ❌ Build failed!
    echo.
    echo Build log saved to: docker-build.log
    echo.
    echo 🔍 Common issues:
    echo   1. TypeScript errors → Run 'npm run build' locally first
    echo   2. Missing dependencies → Check package.json
    echo   3. Prisma errors → Ensure DATABASE_URL is set
    echo   4. Memory issues → Increase Docker memory limit
    echo.
    echo 📝 Check the build log above for specific errors
)

pause

