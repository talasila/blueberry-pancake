#!/usr/bin/env bash

# restart-local.sh
# Shutdown and restart both frontend and backend development servers

# Don't exit on error for kill operations
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Ports
BACKEND_PORT=3001
FRONTEND_PORT=3000

echo -e "${BLUE}🔄 Restarting local development servers...${NC}\n"

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local name=$2
    
    echo -e "${YELLOW}Checking for processes on port ${port} (${name})...${NC}"
    
    # Find all processes using the port (can be multiple)
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        echo -e "${GREEN}  ✅ Port ${port} is already free${NC}"
        return 0
    fi
    
    # Handle multiple PIDs (one per line)
    local pid_count=$(echo "$pids" | wc -l | tr -d ' ')
    echo -e "${YELLOW}  Found ${pid_count} process(es) on port ${port}: $(echo $pids | tr '\n' ' ')${NC}"
    
    # Get current user to only kill our own processes
    local current_user=$(whoami)
    local killed_count=0
    local failed_count=0
    
    # Kill each PID individually
    for pid in $pids; do
        # Check if process exists and is owned by current user
        if ps -p "$pid" >/dev/null 2>&1; then
            local process_user=$(ps -o user= -p "$pid" 2>/dev/null | tr -d ' ')
            
            if [ "$process_user" = "$current_user" ]; then
                echo -e "${YELLOW}    Killing process ${pid} (owned by ${process_user})...${NC}"
                kill -9 "$pid" 2>/dev/null
                if [ $? -eq 0 ]; then
                    killed_count=$((killed_count + 1))
                else
                    failed_count=$((failed_count + 1))
                    echo -e "${RED}    ⚠️  Failed to kill process ${pid}${NC}"
                fi
            else
                echo -e "${YELLOW}    ⚠️  Process ${pid} is owned by ${process_user}, skipping (not owned by ${current_user})${NC}"
                failed_count=$((failed_count + 1))
            fi
        fi
    done
    
    # Wait for processes to terminate
    sleep 2
    
    # Verify port is free
    local remaining_pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -z "$remaining_pids" ]; then
        echo -e "${GREEN}  ✅ Port ${port} is now free (killed ${killed_count} process(es))${NC}"
        return 0
    else
        local remaining_count=$(echo "$remaining_pids" | wc -l | tr -d ' ')
        echo -e "${YELLOW}  ⚠️  Port ${port} still has ${remaining_count} process(es) running: $(echo $remaining_pids | tr '\n' ' ')${NC}"
        echo -e "${YELLOW}  💡 These may be owned by another user or require elevated permissions${NC}"
        
        # Don't fail if we killed at least one process
        if [ $killed_count -gt 0 ]; then
            return 0
        else
            return 1
        fi
    fi
}

# Function to kill processes by pattern
kill_by_pattern() {
    local pattern=$1
    local name=$2
    
    echo -e "${YELLOW}Checking for ${name} processes...${NC}"
    
    # Find processes matching the pattern
    local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}  Found ${name} processes: ${pids}${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}  ✅ ${name} processes terminated${NC}"
    else
        echo -e "${GREEN}  ✅ No ${name} processes found${NC}"
    fi
}

# Step 1: Kill existing servers
echo -e "${BLUE}Step 1: Shutting down existing servers...${NC}\n"

# Kill by port (most reliable)
kill_port $BACKEND_PORT "backend" || true
kill_port $FRONTEND_PORT "frontend" || true

# Also kill by process pattern (backup method)
kill_by_pattern "node.*server\.js" "backend server"
kill_by_pattern "vite" "frontend server"

# Give processes time to fully terminate
sleep 2

# Re-check ports one more time
backend_free=true
frontend_free=true

if lsof -ti:$BACKEND_PORT >/dev/null 2>&1; then
    backend_free=false
fi

if lsof -ti:$FRONTEND_PORT >/dev/null 2>&1; then
    frontend_free=false
fi

if [ "$backend_free" = "true" ] && [ "$frontend_free" = "true" ]; then
    echo -e "\n${GREEN}✅ All existing servers stopped${NC}\n"
else
    echo -e "\n${YELLOW}⚠️  Some processes may still be running on ports${NC}"
    if [ "$backend_free" = "false" ]; then
        echo -e "${YELLOW}  Port ${BACKEND_PORT} (backend) is still in use${NC}"
    fi
    if [ "$frontend_free" = "false" ]; then
        echo -e "${YELLOW}  Port ${FRONTEND_PORT} (frontend) is still in use${NC}"
    fi
    echo -e "${YELLOW}  Attempting to start servers anyway...${NC}\n"
fi

# Step 2: Check dependencies
echo -e "${BLUE}Step 2: Checking dependencies...${NC}\n"

cd "$PROJECT_ROOT" || exit 1

# Check if node_modules exist
if [ ! -d "$PROJECT_ROOT/backend/node_modules" ]; then
    echo -e "${YELLOW}  Backend dependencies not found. Installing...${NC}"
    cd "$PROJECT_ROOT/backend"
    npm install
    cd "$PROJECT_ROOT"
fi

if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo -e "${YELLOW}  Frontend dependencies not found. Installing...${NC}"
    cd "$PROJECT_ROOT/frontend"
    npm install
    cd "$PROJECT_ROOT"
fi

echo -e "${GREEN}✅ Dependencies checked${NC}\n"

# Step 3: Start servers
echo -e "${BLUE}Step 3: Starting servers...${NC}\n"

# Re-enable exit on error for server startup
set -e

# Set NODE_CONFIG_DIR to point to project root config directory
export NODE_CONFIG_DIR="$PROJECT_ROOT/config"

# Start backend
echo -e "${YELLOW}Starting backend server on port ${BACKEND_PORT}...${NC}"
cd "$PROJECT_ROOT/backend"
NODE_CONFIG_DIR="$PROJECT_ROOT/config" npm run dev > "$PROJECT_ROOT/backend.log" 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}  ✅ Backend started (PID: ${BACKEND_PID})${NC}"
echo -e "  📝 Logs: ${PROJECT_ROOT}/backend.log"

# Wait a moment for backend to start
sleep 2

# Start frontend
echo -e "${YELLOW}Starting frontend server on port ${FRONTEND_PORT}...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run dev > "$PROJECT_ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}  ✅ Frontend started (PID: ${FRONTEND_PID})${NC}"
echo -e "  📝 Logs: ${PROJECT_ROOT}/frontend.log"

# Wait a moment for servers to initialize
sleep 3

# Step 4: Verify servers are running
echo -e "\n${BLUE}Step 4: Verifying servers are running...${NC}\n"

# Check backend
if lsof -ti:$BACKEND_PORT >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on http://localhost:${BACKEND_PORT}${NC}"
else
    echo -e "${RED}❌ Backend failed to start. Check logs: ${PROJECT_ROOT}/backend.log${NC}"
fi

# Check frontend
if lsof -ti:$FRONTEND_PORT >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on http://localhost:${FRONTEND_PORT}${NC}"
else
    echo -e "${RED}❌ Frontend failed to start. Check logs: ${PROJECT_ROOT}/frontend.log${NC}"
fi

echo -e "\n${GREEN}🎉 Restart complete!${NC}\n"
echo -e "${BLUE}Backend:${NC}  http://localhost:${BACKEND_PORT}"
echo -e "${BLUE}Frontend:${NC} http://localhost:${FRONTEND_PORT}"
echo -e "\n${YELLOW}To view logs:${NC}"
echo -e "  Backend:  tail -f ${PROJECT_ROOT}/backend.log"
echo -e "  Frontend: tail -f ${PROJECT_ROOT}/frontend.log"
echo -e "\n${YELLOW}To stop servers:${NC}"
echo -e "  Run this script again, or:"
echo -e "  kill ${BACKEND_PID} ${FRONTEND_PID}"
