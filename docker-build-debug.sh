#!/bin/bash

# ============================================================================
# Docker Build Debug Script
# ============================================================================
# This script builds the Docker image with verbose output to help debug issues

echo "🔍 Docker Build Debug Mode"
echo "==========================="
echo ""

# Check Docker version
echo "📋 Docker Version:"
docker --version
echo ""

# Show build context size
echo "📦 Build Context Size:"
du -sh . 2>/dev/null || echo "Unable to calculate"
echo ""

# Check for large files that should be ignored
echo "🔎 Checking for large files..."
find . -type f -size +50M 2>/dev/null | grep -v node_modules | grep -v .next | head -5
echo ""

# Check if .env exists (shouldn't be copied to Docker)
if [ -f .env ]; then
    echo "⚠️  Warning: .env file exists. Make sure it's in .dockerignore"
fi
echo ""

# Option to use simplified Dockerfile
echo "Which Dockerfile would you like to use?"
echo "1) Dockerfile (multi-stage, optimized)"
echo "2) Dockerfile.simple (single-stage, easier to debug)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "2" ]; then
    DOCKERFILE="Dockerfile.simple"
    echo "Using simplified Dockerfile"
else
    DOCKERFILE="Dockerfile"
    echo "Using standard Dockerfile"
fi
echo ""

# Build with verbose output and no cache
echo "🔨 Building Docker image..."
echo "This may take several minutes..."
echo ""

docker build \
    --file "$DOCKERFILE" \
    --no-cache \
    --progress=plain \
    --tag bookreel:debug \
    . 2>&1 | tee docker-build.log

BUILD_EXIT_CODE=$?

echo ""
echo "================================"

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ Build succeeded!"
    echo ""
    echo "Build log saved to: docker-build.log"
    echo ""
    echo "To run the image:"
    echo "  docker run -p 3000:3000 bookreel:debug"
else
    echo "❌ Build failed!"
    echo ""
    echo "Build log saved to: docker-build.log"
    echo ""
    echo "🔍 Common issues:"
    echo "  1. TypeScript errors → Run 'npm run build' locally first"
    echo "  2. Missing dependencies → Check package.json"
    echo "  3. Prisma errors → Ensure DATABASE_URL is set"
    echo "  4. Memory issues → Increase Docker memory limit"
    echo ""
    echo "📝 Check the build log above for specific errors"
fi

exit $BUILD_EXIT_CODE

