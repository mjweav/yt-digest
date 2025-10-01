#!/bin/bash

# YT-Digest Restart Script
# Improved version with static ports and better production mode

set -e  # Exit on any error

# Configuration
FRONTEND_PORT=3000
BACKEND_PORT=3001
FRONTEND_URL="http://localhost:$FRONTEND_PORT"
BACKEND_URL="http://localhost:$BACKEND_PORT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
MODE="dev"  # Default mode
FLUSH_CACHE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -flush|--flush)
      FLUSH_CACHE=true
      shift
      ;;
    -prod|--prod)
      MODE="prod"
      shift
      ;;
    -backend|--backend)
      MODE="backend-only"
      shift
      ;;
    -frontend|--frontend)
      MODE="frontend-only"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "YT-Digest Restart Script"
      echo ""
      echo "Options:"
      echo "  -prod, --prod      Start in production mode (build + serve)"
      echo "  -backend           Start only the backend server"
      echo "  -frontend          Start only the frontend server"
      echo "  -flush, --flush    Clear npm cache before starting"
      echo "  -h, --help         Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                 Development mode (default)"
      echo "  $0 -prod           Production mode"
      echo "  $0 -backend       Backend only"
      echo "  $0 -frontend      Frontend only"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}🔄 Starting YT-Digest...${NC}"

# Function to kill processes using specific ports
kill_port() {
  local port=$1
  local service_name=$2

  if lsof -ti:$port >/dev/null 2>&1; then
    echo -e "${YELLOW}   Stopping $service_name on port $port...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

# Function to check if port is available
check_port() {
  local port=$1
  local service_name=$2

  if lsof -i :$port >/dev/null 2>&1; then
    echo -e "${RED}❌ Port $port ($service_name) is still in use${NC}"
    return 1
  else
    echo -e "${GREEN}✅ Port $port ($service_name) is available${NC}"
    return 0
  fi
}

# Function to wait for service to respond
wait_for_service() {
  local url=$1
  local service_name=$2
  local max_attempts=30

  echo -e "${BLUE}⏳ Waiting for $service_name...${NC}"

  for i in $(seq 1 $max_attempts); do
    if curl -s "$url" >/dev/null 2>&1; then
      echo -e "${GREEN}✅ $service_name is responding${NC}"
      return 0
    fi

    if [ $i -eq $max_attempts ]; then
      echo -e "${RED}❌ $service_name failed to respond after $max_attempts attempts${NC}"
      return 1
    fi

    sleep 1
  done
}

# Stop existing processes
echo -e "${YELLOW}📴 Stopping existing processes...${NC}"

# Kill processes by port (most reliable method)
kill_port $FRONTEND_PORT "Frontend"
kill_port $BACKEND_PORT "Backend"

# Also kill by process patterns as backup
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*index.js" 2>/dev/null || true
pkill -f "concurrently" 2>/dev/null || true

sleep 2

# Verify ports are free
echo -e "${BLUE}🔍 Verifying ports are available...${NC}"
check_port $FRONTEND_PORT "Frontend" && check_port $BACKEND_PORT "Backend"

# Clear cache if requested
if [ "$FLUSH_CACHE" = true ]; then
  echo -e "${BLUE}🧹 Clearing npm cache...${NC}"
  npm cache clean --force

  # Remove node_modules if they exist
  [ -d "node_modules" ] && rm -rf node_modules
  [ -d "server/node_modules" ] && rm -rf server/node_modules
  [ -d "src/node_modules" ] && rm -rf src/node_modules

  echo -e "${GREEN}✅ Cache cleared${NC}"

  # Reinstall dependencies
  echo -e "${BLUE}📦 Installing dependencies...${NC}"
  npm install
fi

# Start services based on mode
case $MODE in
  "backend-only")
    echo -e "${BLUE}🚀 Starting backend server only...${NC}"
    echo -e "${BLUE}📡 Backend: $BACKEND_URL${NC}"
    npm run dev:server
    ;;

  "frontend-only")
    echo -e "${BLUE}🚀 Starting frontend server only...${NC}"
    echo -e "${BLUE}📡 Frontend: $FRONTEND_URL${NC}"
    npm run dev:frontend
    ;;

  "prod")
    echo -e "${BLUE}🔨 Building for production...${NC}"

    # Build frontend
    echo -e "${BLUE}   Building React frontend...${NC}"
    cd src && npm run build && cd ..

    # Start backend in background
    echo -e "${BLUE}🚀 Starting backend server...${NC}"
    npm run dev:server &
    BACKEND_PID=$!

    # Wait for backend to be ready
    wait_for_service "$BACKEND_URL/api/health" "Backend API"

    # Serve built frontend
    echo -e "${BLUE}🚀 Starting production frontend...${NC}"
    echo -e "${GREEN}📊 Production URLs:${NC}"
    echo -e "${GREEN}   Frontend: $FRONTEND_URL${NC}"
    echo -e "${GREEN}   Backend:  $BACKEND_URL${NC}"
    echo -e "${GREEN}   Health:   $BACKEND_URL/api/health${NC}"
    echo ""
    echo -e "${YELLOW}⏳ Application is ready!${NC}"
    echo -e "${YELLOW}   Use Ctrl+C to stop all services${NC}"

    # Start frontend server to serve built files
    cd src && npx serve -s dist -l 3000 &
    FRONTEND_PID=$!

    # Wait for both processes
    wait $BACKEND_PID $FRONTEND_PID
    ;;

  "dev"|*)
    echo -e "${BLUE}🚀 Starting development mode...${NC}"
    echo -e "${GREEN}📊 Development URLs:${NC}"
    echo -e "${GREEN}   Frontend: $FRONTEND_URL${NC}"
    echo -e "${GREEN}   Backend:  $BACKEND_URL${NC}"
    echo -e "${GREEN}   Health:   $BACKEND_URL/api/health${NC}"
    echo ""
    echo -e "${YELLOW}⏳ Starting both servers with hot reload...${NC}"

    # Start both servers concurrently
    npm run dev
    ;;
esac

echo -e "${GREEN}✅ Complete!${NC}"
