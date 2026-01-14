#!/bin/bash

# ============================================================================
# Test Local Build Before Docker
# ============================================================================

set -e

echo ""
echo "🧪 Testing Local Build"
echo "====================="
echo ""

echo "Step 1: Install dependencies..."
npm install

echo ""
echo "Step 2: Generate Prisma client..."
npx prisma generate

echo ""
echo "Step 3: Build Next.js application..."
npm run build

echo ""
echo "================================"
echo "✅ Local build successful!"
echo ""
echo "Your app builds correctly locally."
echo "You can now try: docker build -t bookreel ."
echo ""

