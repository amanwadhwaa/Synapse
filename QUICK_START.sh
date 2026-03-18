#!/bin/bash

# Synapse - Quick Start Setup Script
# This script sets up and runs the entire Synapse application

echo "================================"
echo "Synapse - Quick Start Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}>>> $1${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Install root dependencies
print_section "Installing root dependencies..."
npm install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Root dependencies installed"
else
    echo "Error installing root dependencies"
    exit 1
fi

# Step 2: Install and build shared package
print_section "Setting up shared package..."
cd shared
npm install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Shared dependencies installed"
fi
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Shared package built"
else
    echo "Error building shared package"
    exit 1
fi
cd ..

# Step 3: Install server dependencies
print_section "Installing server dependencies..."
cd server
npm install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Server dependencies installed"
else
    echo "Error installing server dependencies"
    exit 1
fi
cd ..

# Step 4: Install client dependencies
print_section "Installing client dependencies..."
cd client
npm install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Client dependencies installed"
else
    echo "Error installing client dependencies"
    exit 1
fi
cd ..

# Step 5: Generate Prisma client
print_section "Generating Prisma client..."
npx prisma generate --schema=./prisma/schema.prisma > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Prisma client generated"
else
    echo "Error generating Prisma client"
    exit 1
fi

# Step 6: Run database migrations
print_section "Running database migrations..."
npx prisma migrate dev --schema=./prisma/schema.prisma --skip-generate > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Database migrations completed"
else
    echo "Error running migrations (this may be ok if schema is already in sync)"
fi

# Success message
echo ""
echo -e "${GREEN}================================"
echo "✓ Setup completed successfully!"
echo "================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "Open three terminal windows and run:"
echo ""
echo "  Terminal 1 (Backend Server):"
echo "    cd server"
echo "    npm run dev"
echo ""
echo "  Terminal 2 (Frontend Client):"
echo "    cd client"
echo "    npm run dev"
echo ""
echo "  Terminal 3 (Optional - Shared package watcher):"
echo "    cd shared"
echo "    npm run dev"
echo ""
echo -e "${YELLOW}Then visit:${NC} http://localhost:5173"
echo ""
