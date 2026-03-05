#!/bin/bash

# AWS Environment Switcher for Khaos Studio
# Used by Cursor Background Agents for AWS environment management

set -e

# Script metadata
SCRIPT_NAME="switch-aws-env"
VERSION="1.0.0"
AUTHOR="Khaos Forge"
DESCRIPTION="Switch between AWS environments (personal, dev, staging, prod, parent)"

# Global variables
ENVIRONMENT=""
VERBOSE=false
SHOW_CURRENT=false

# Help function
show_help() {
    cat << EOF
$SCRIPT_NAME - AWS Environment Switcher

USAGE:
    source $SCRIPT_NAME [ENVIRONMENT]
    source $SCRIPT_NAME --current
    $SCRIPT_NAME --help

DESCRIPTION:
    $DESCRIPTION
    
    This script switches between different AWS environments by setting
    appropriate credentials and region. It reads credentials from the
    .aws-accounts file and exports them as environment variables.

ENVIRONMENTS:
    personal      Switch to personal AWS account from .aws-accounts
    development    Use default AWS profile (unset explicit credentials)
    staging       Switch to staging AWS account (730335267653)
    production    Switch to production AWS account (533267373085)
    parent        Switch to parent AWS account

OPTIONS:
    --current     Show current AWS environment and identity
    -v, --verbose Enable verbose output
    -h, --help    Show this help message
    --version     Show version information

EXAMPLES:
    # Switch to staging environment
    source $SCRIPT_NAME staging
    
    # Switch to production environment
    source $SCRIPT_NAME production
    
    # Switch to personal account credentials
    source $SCRIPT_NAME personal
    
    # Switch to development (default profile)
    source $SCRIPT_NAME development
    
    # Show current environment
    source $SCRIPT_NAME --current
    
    # Show current environment (without sourcing)
    $SCRIPT_NAME --current

REQUIREMENTS:
    - .aws-accounts file in workspace root
    - AWS CLI configured
    - Appropriate AWS credentials in .aws-accounts file

.aws-accounts FILE FORMAT:
    # Development (uses default profile)
    # No credentials needed
    
    # Staging
    STAGING_AWS_ACCESS_KEY_ID="your-access-key"
    STAGING_AWS_SECRET_ACCESS_KEY="your-secret-key"
    
    # Production  
    PROD_AWS_ACCESS_KEY_ID="your-access-key"
    PROD_AWS_SECRET_ACCESS_KEY="your-secret-key"
    
    # Parent
    PARENT_AWS_ACCESS_KEY_ID="your-access-key"
    PARENT_AWS_SECRET_ACCESS_KEY="your-secret-key"
    PARENT_AWS_ACCOUNT_ID="123456789012"

EXIT CODES:
    0    Success
    1    General error
    2    .aws-accounts file not found
    3    Invalid environment
    4    AWS credentials verification failed

AUTHOR:
    $AUTHOR

VERSION:
    $VERSION

EOF
}

# Version function
show_version() {
    echo "$SCRIPT_NAME version $VERSION"
    echo "Author: $AUTHOR"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --current)
                SHOW_CURRENT=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            --version)
                show_version
                exit 0
                ;;
            personal|development|staging|production|parent)
                ENVIRONMENT="$1"
                shift
                ;;
            "")
                # No arguments - show current
                SHOW_CURRENT=true
                shift
                ;;
            *)
                error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
    fi
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check for .aws-accounts file
check_aws_accounts_file() {
    if [ ! -f ".aws-accounts" ]; then
        error ".aws-accounts file not found in workspace root"
        echo "Please create .aws-accounts file with your AWS credentials"
        echo "See --help for file format"
        exit 2
    fi
    
    if [ "$VERBOSE" = true ]; then
        log "Found .aws-accounts file"
    fi
}

# Load AWS accounts file
load_aws_accounts() {
    if [ "$VERBOSE" = true ]; then
        log "Loading AWS accounts from .aws-accounts file"
    fi
    
    # Source the .aws-accounts file
    source .aws-accounts
    
    if [ "$VERBOSE" = true ]; then
        log "AWS accounts loaded successfully"
    fi
}

# Switch to development environment
switch_to_development() {
    log "Switching to development environment"

    if [ -n "$DEV_AWS_ACCESS_KEY_ID" ] && [ -n "$DEV_AWS_SECRET_ACCESS_KEY" ]; then
        export AWS_ACCESS_KEY_ID="$DEV_AWS_ACCESS_KEY_ID"
        export AWS_SECRET_ACCESS_KEY="$DEV_AWS_SECRET_ACCESS_KEY"
        export AWS_DEFAULT_REGION="us-east-1"
        echo "🔄 Switched to DEVELOPMENT account (DEV_* credentials)"
    elif [ -n "$PERSONAL_AWS_ACCESS_KEY_ID" ] && [ -n "$PERSONAL_AWS_SECRET_ACCESS_KEY" ]; then
        export AWS_ACCESS_KEY_ID="$PERSONAL_AWS_ACCESS_KEY_ID"
        export AWS_SECRET_ACCESS_KEY="$PERSONAL_AWS_SECRET_ACCESS_KEY"
        export AWS_DEFAULT_REGION="us-east-1"
        echo "🔄 Switched to DEVELOPMENT account (PERSONAL_* credentials)"
    else
        unset AWS_ACCESS_KEY_ID
        unset AWS_SECRET_ACCESS_KEY
        unset AWS_DEFAULT_REGION
        echo "🔄 Switched to DEVELOPMENT account (using default profile)"
    fi

    local identity=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo 'Failed to verify')
    echo "🔍 Current identity: $identity"

    if [ "$identity" != "Failed to verify" ]; then
        success "Development environment activated"
    else
        warning "Could not verify AWS identity - check your credentials/profile"
    fi
}

# Switch to personal environment
switch_to_personal() {
    log "Switching to personal environment"

    if [ -z "$PERSONAL_AWS_ACCESS_KEY_ID" ] || [ -z "$PERSONAL_AWS_SECRET_ACCESS_KEY" ]; then
        error "PERSONAL_AWS_ACCESS_KEY_ID / PERSONAL_AWS_SECRET_ACCESS_KEY not set in .aws-accounts"
        exit 4
    fi

    export AWS_ACCESS_KEY_ID="$PERSONAL_AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$PERSONAL_AWS_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="us-east-1"

    echo "🔄 Switched to PERSONAL account"

    local identity=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo 'Failed to verify')
    echo "🔍 Current identity: $identity"

    if [ "$identity" != "Failed to verify" ]; then
        success "Personal environment activated"
    else
        error "Failed to verify personal credentials"
        exit 4
    fi
}

# Switch to staging environment
switch_to_staging() {
    log "Switching to staging environment"
    
    export AWS_ACCESS_KEY_ID="$STAGING_AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$STAGING_AWS_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="us-east-1"
    
    echo "🔄 Switched to STAGING account (730335267653)"
    
    # Verify identity
    local identity=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo 'Failed to verify')
    echo "🔍 Current identity: $identity"
    
    if [ "$identity" != "Failed to verify" ]; then
        success "Staging environment activated"
    else
        error "Failed to verify staging credentials"
        exit 4
    fi
}

# Switch to production environment
switch_to_production() {
    log "Switching to production environment"
    
    export AWS_ACCESS_KEY_ID="$PROD_AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$PROD_AWS_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="us-east-1"
    
    echo "🔄 Switched to PRODUCTION account (533267373085)"
    
    # Verify identity
    local identity=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo 'Failed to verify')
    echo "🔍 Current identity: $identity"
    
    if [ "$identity" != "Failed to verify" ]; then
        success "Production environment activated"
    else
        error "Failed to verify production credentials"
        exit 4
    fi
}

# Switch to parent environment
switch_to_parent() {
    log "Switching to parent environment"
    
    export AWS_ACCESS_KEY_ID="$PARENT_AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$PARENT_AWS_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="us-east-1"
    
    echo "🔄 Switched to PARENT account ($PARENT_AWS_ACCOUNT_ID)"
    
    # Verify identity
    local identity=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo 'Failed to verify')
    echo "🔍 Current identity: $identity"
    
    if [ "$identity" != "Failed to verify" ]; then
        success "Parent environment activated"
    else
        error "Failed to verify parent credentials"
        exit 4
    fi
}

# Show current environment
show_current_environment() {
    echo "📋 Current AWS Environment:"
    
    if [ -n "$AWS_ACCESS_KEY_ID" ]; then
        echo "   Using explicit credentials"
        local identity=$(aws sts get-caller-identity 2>/dev/null || echo "   Failed to get identity")
        echo "   $identity"
    else
        echo "   Using default profile"
        local identity=$(aws sts get-caller-identity 2>/dev/null || echo "   Failed to get identity")
        echo "   $identity"
    fi
}

# Main execution
main() {
    # Parse command line arguments
    parse_args "$@"
    
    # Show current environment if requested
    if [ "$SHOW_CURRENT" = true ]; then
        show_current_environment
        exit 0
    fi
    
    # Check for .aws-accounts file
    check_aws_accounts_file
    
    # Load AWS accounts
    load_aws_accounts
    
    # Switch to requested environment
    case "$ENVIRONMENT" in
        "personal")
            switch_to_personal
            ;;
        "development")
            switch_to_development
            ;;
        "staging")
            switch_to_staging
            ;;
        "production")
            switch_to_production
            ;;
        "parent")
            switch_to_parent
            ;;
        "")
            error "No environment specified"
            echo "Use --help for usage information"
            exit 1
            ;;
        *)
            error "Invalid environment: $ENVIRONMENT"
            echo "Valid environments: personal, development, staging, production, parent"
            exit 3
            ;;
    esac
}

# Run main function
main "$@"
