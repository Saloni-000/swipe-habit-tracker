#!/bin/bash
echo "📦 Installing dependencies..."
npm install

echo "📁 Setting up PostgreSQL schema..."
cp prisma/schema.postgresql.prisma prisma/schema.prisma

echo "🔨 Generating Prisma client..."
npx prisma generate

echo "✅ Build complete!"