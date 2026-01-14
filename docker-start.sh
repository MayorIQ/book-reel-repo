#!/bin/bash

# ============================================================================
# BookReel - Docker Quick Start Script
# ============================================================================
# This script helps you quickly start the BookReel application with Docker

set -e

echo "🎬 BookReel Docker Quick Start"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created!"
        echo ""
        echo "⚠️  IMPORTANT: Please edit .env and add your API keys:"
        echo "   - ELEVENLABS_API_KEY"
        echo "   - OPENAI_API_KEY"
        echo "   - PEXELS_API_KEY"
        echo "   - UNSPLASH_ACCESS_KEY"
        echo ""
        read -p "Press Enter after you've updated the .env file..."
    else
        echo "❌ Error: .env.example not found"
        exit 1
    fi
fi

echo "🔨 Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ BookReel is now running!"
    echo ""
    echo "📍 Access your application:"
    echo "   🌐 Application: http://localhost:3000"
    echo "   🗄️  Database:    localhost:5432"
    echo ""
    echo "📊 Useful commands:"
    echo "   View logs:        docker-compose logs -f"
    echo "   Stop services:    docker-compose down"
    echo "   Restart:          docker-compose restart"
    echo "   View status:      docker-compose ps"
    echo ""
    echo "🎉 Happy creating videos!"
else
    echo ""
    echo "❌ Error: Services failed to start"
    echo "Check logs with: docker-compose logs"
    exit 1
fi

