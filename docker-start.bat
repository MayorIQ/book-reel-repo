@echo off
REM ============================================================================
REM BookReel - Docker Quick Start Script (Windows)
REM ============================================================================
REM This script helps you quickly start the BookReel application with Docker

echo.
echo 🎬 BookReel Docker Quick Start
echo ================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker is not installed
    echo Please install Docker Desktop from https://docs.docker.com/desktop/install/windows-install/
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo 📝 Creating .env file from template...
    if exist .env.example (
        copy .env.example .env >nul
        echo ✅ .env file created!
        echo.
        echo ⚠️  IMPORTANT: Please edit .env and add your API keys:
        echo    - ELEVENLABS_API_KEY
        echo    - OPENAI_API_KEY
        echo    - PEXELS_API_KEY
        echo    - UNSPLASH_ACCESS_KEY
        echo.
        pause
    ) else (
        echo ❌ Error: .env.example not found
        pause
        exit /b 1
    )
)

echo 🔨 Building Docker images...
docker-compose build

echo.
echo 🚀 Starting services...
docker-compose up -d

echo.
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo.
echo ✅ BookReel is now running!
echo.
echo 📍 Access your application:
echo    🌐 Application: http://localhost:3000
echo    🗄️  Database:    localhost:5432
echo.
echo 📊 Useful commands:
echo    View logs:        docker-compose logs -f
echo    Stop services:    docker-compose down
echo    Restart:          docker-compose restart
echo    View status:      docker-compose ps
echo.
echo 🎉 Happy creating videos!
echo.

pause

