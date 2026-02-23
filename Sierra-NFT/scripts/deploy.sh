#!/bin/bash

# Sierra NFT Deploy Script
# Called by GitHub Actions via SSH after push to main
# Features:
#   - Guaranteed PM2 restart even on build failure (trap handler)
#   - Memory-optimized: stops PM2 before frontend build
#   - npm cache cleanup to prevent disk full

echo "=========================================="
echo "Sierra NFT Deploy - $(date)"
echo "=========================================="

APP_DIR="/home/ubuntu/Sierra-NFT"
cd "$APP_DIR"

# Guarantee PM2 services restart even if build fails
cleanup() {
  echo ""
  echo "[CLEANUP] Ensuring services are running..."
  pm2 restart sierra-backend --update-env 2>/dev/null || pm2 start "$APP_DIR/backend/dist/main.js" --name sierra-backend --cwd "$APP_DIR/backend" 2>/dev/null || true
  pm2 restart sierra-frontend --update-env 2>/dev/null || pm2 start "npm run start" --name sierra-frontend --cwd "$APP_DIR/frontend" 2>/dev/null || true
  npm cache clean --force 2>/dev/null || true
  echo "[CLEANUP] Done. Services should be running."
}
trap cleanup EXIT

# [1] Pull latest changes
echo "[1/7] Pulling latest code..."
git stash 2>/dev/null || true
git pull origin main

# [2] Install backend dependencies
echo "[2/7] Installing backend dependencies..."
cd "$APP_DIR/backend"
npm install --legacy-peer-deps

# [3] Build backend
echo "[3/7] Building backend..."
npm run build

# [4] Install frontend dependencies
echo "[4/7] Installing frontend dependencies..."
cd "$APP_DIR/frontend"
npm install --legacy-peer-deps

# [5] Stop PM2 to free memory for frontend build
echo "[5/7] Stopping services to free memory for build..."
pm2 stop sierra-backend sierra-frontend 2>/dev/null || true

# [6] Build frontend (webpack mode for siwe/ethers compat, memory limit for t3.small)
echo "[6/7] Building frontend..."
NODE_OPTIONS="--max-old-space-size=1536" npx next build --webpack

# [7] Restart PM2 (also handled by trap, but explicit for clarity)
echo "[7/7] Restarting services..."
pm2 restart sierra-backend --update-env
pm2 restart sierra-frontend --update-env

echo "=========================================="
echo "Deploy completed successfully! - $(date)"
echo "=========================================="
