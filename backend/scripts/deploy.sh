#!/bin/bash

# APHELION Backend Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-development}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$TIMESTAMP"

echo "🚀 Deploying APHELION Backend ($ENVIRONMENT environment)"
echo "======================================================"

# Function to print colored output
print_status() {
    if [ "$1" = "success" ]; then
        echo -e "✅ $2"
    elif [ "$1" = "error" ]; then
        echo -e "❌ $2"
    elif [ "$1" = "info" ]; then
        echo -e "ℹ️  $2"
    elif [ "$1" = "warning" ]; then
        echo -e "⚠️  $2"
    else
        echo -e "📝 $2"
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_status "error" "Must be run from project root directory"
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    print_status "error" "Invalid environment: $ENVIRONMENT. Must be development, staging, or production"
    exit 1
fi

print_status "info" "Deploying to $ENVIRONMENT environment"

# Create backup directory
mkdir -p "$BACKUP_DIR"
print_status "success" "Created backup directory: $BACKUP_DIR"

# Backup current environment file if it exists
if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/.env.backup"
    print_status "success" "Backed up .env file"
fi

# Backup current package files
cp package.json package-lock.json "$BACKUP_DIR/" 2>/dev/null || true
print_status "success" "Backed up package files"

# Load environment-specific configuration
case "$ENVIRONMENT" in
    development)
        ENV_FILE=".env.development"
        DOCKER_COMPOSE_FILE="docker-compose.yml"
        ;;
    staging)
        ENV_FILE=".env.staging"
        DOCKER_COMPOSE_FILE="docker-compose.staging.yml"
        ;;
    production)
        ENV_FILE=".env.production"
        DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
        ;;
esac

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    print_status "warning" "Environment file $ENV_FILE not found, using .env.example"
    ENV_FILE=".env.example"
fi

# Copy environment file
cp "$ENV_FILE" .env
print_status "success" "Copied $ENV_FILE to .env"

# Update dependencies
print_status "info" "Updating dependencies..."
npm ci --only=production
print_status "success" "Dependencies updated"

# Build TypeScript
print_status "info" "Building TypeScript..."
npm run build
print_status "success" "TypeScript build completed"

# Run tests (skip for production if tests take too long)
if [ "$ENVIRONMENT" != "production" ]; then
    print_status "info" "Running tests..."
    npm test
    print_status "success" "Tests passed"
fi

# Docker deployment
if command -v docker &> /dev/null && [ -f "$DOCKER_COMPOSE_FILE" ]; then
    print_status "info" "Starting Docker deployment..."
    
    # Stop existing containers
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Build and start new containers
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --build
    
    # Wait for services to be healthy
    print_status "info" "Waiting for services to be healthy..."
    sleep 30
    
    # Run database migrations
    print_status "info" "Running database migrations..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec backend npm run db:migrate 2>/dev/null || \
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec backend npx typeorm migration:run 2>/dev/null || \
    print_status "warning" "Could not run migrations automatically"
    
    print_status "success" "Docker deployment completed"
else
    print_status "warning" "Docker not available or compose file not found, skipping Docker deployment"
    
    # Traditional deployment
    print_status "info" "Starting traditional deployment..."
    
    # Stop existing process if running with PM2
    if command -v pm2 &> /dev/null; then
        print_status "info" "Stopping existing PM2 process..."
        pm2 stop aphelion-backend 2>/dev/null || true
        pm2 delete aphelion-backend 2>/dev/null || true
    fi
    
    # Start the application
    if command -v pm2 &> /dev/null; then
        print_status "info" "Starting with PM2..."
        pm2 start dist/index.js --name "aphelion-backend" --env "$ENVIRONMENT"
        pm2 save
        print_status "success" "Application started with PM2"
    else
        print_status "info" "Starting application..."
        nohup node dist/index.js > app.log 2>&1 &
        echo $! > app.pid
        print_status "success" "Application started (PID: $(cat app.pid))"
    fi
fi

# Health check
print_status "info" "Performing health check..."
sleep 5

if command -v curl &> /dev/null; then
    PORT=$(grep -E "^PORT=" .env | cut -d'=' -f2 || echo "3000")
    HEALTH_URL="http://localhost:$PORT/health"
    
    if curl -s -f "$HEALTH_URL" > /dev/null; then
        print_status "success" "Health check passed: $HEALTH_URL"
    else
        print_status "error" "Health check failed: $HEALTH_URL"
        exit 1
    fi
else
    print_status "warning" "curl not available, skipping health check"
fi

# Cleanup old backups (keep last 5)
print_status "info" "Cleaning up old backups..."
cd backups && ls -t | tail -n +6 | xargs rm -rf 2>/dev/null || true
cd ..
print_status "success" "Backup cleanup completed"

# Deployment summary
print_status "success" "🚀 Deployment to $ENVIRONMENT completed successfully!"
echo ""
echo "📊 Deployment Summary:"
echo "---------------------"
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $TIMESTAMP"
echo "Backup: $BACKUP_DIR"
echo ""

if [ "$ENVIRONMENT" = "production" ]; then
    echo "🔒 Production Deployment Notes:"
    echo "------------------------------"
    echo "1. Verify SSL certificates are configured"
    echo "2. Check monitoring and alerting"
    echo "3. Review security settings"
    echo "4. Test backup and recovery procedures"
    echo ""
fi

echo "📋 Next Steps:"
echo "--------------"
echo "1. Monitor application logs"
echo "2. Verify all services are running"
echo "3. Test API endpoints"
echo "4. Update documentation if needed"
echo ""

exit 0