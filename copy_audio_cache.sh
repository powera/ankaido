#!/bin/bash

# Script to copy Lithuanian audio cache files to remote server
# Usage: ./copy_audio_cache.sh [options]

set -e  # Exit on any error

# Configuration
LOCAL_DIR="/Users/powera/repo/trakaido/lithuanian-audio-cache"
REMOTE_USER="atacama"
REMOTE_HOST="137.184.45.132"
REMOTE_DIR="/home/atacama/trakaido"
RSYNC_OPTIONS="-avz --progress --human-readable"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [options]

Options:
    -h, --help          Show this help message
    -n, --dry-run       Show what would be copied without actually doing it
    -d, --delete        Delete files on remote that don't exist locally
    -v, --verbose       Extra verbose output
    --exclude PATTERN   Exclude files matching pattern
    --local-dir PATH    Override local directory path
    --remote-dir PATH   Override remote directory path

Examples:
    $0                           # Basic copy
    $0 --dry-run                # Preview what will be copied
    $0 --delete                 # Sync and delete extra remote files
    $0 --exclude "*.tmp"        # Exclude temporary files
    $0 --local-dir /path/to/audio --remote-dir /remote/path

Remote target: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}
EOF
}

# Parse command line arguments
DRY_RUN=false
DELETE_EXTRA=false
EXTRA_VERBOSE=false
EXCLUDE_PATTERNS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -n|--dry-run)
            DRY_RUN=true
            RSYNC_OPTIONS="$RSYNC_OPTIONS --dry-run"
            shift
            ;;
        -d|--delete)
            DELETE_EXTRA=true
            RSYNC_OPTIONS="$RSYNC_OPTIONS --delete"
            shift
            ;;
        -v|--verbose)
            EXTRA_VERBOSE=true
            RSYNC_OPTIONS="$RSYNC_OPTIONS --verbose"
            shift
            ;;
        --exclude)
            EXCLUDE_PATTERNS+=("$2")
            RSYNC_OPTIONS="$RSYNC_OPTIONS --exclude=$2"
            shift 2
            ;;
        --local-dir)
            LOCAL_DIR="$2"
            shift 2
            ;;
        --remote-dir)
            REMOTE_DIR="$2"
            shift 2
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validation functions
check_local_directory() {
    if [[ ! -d "$LOCAL_DIR" ]]; then
        print_error "Local directory does not exist: $LOCAL_DIR"
        exit 1
    fi
    
    if [[ ! -r "$LOCAL_DIR" ]]; then
        print_error "Cannot read local directory: $LOCAL_DIR"
        exit 1
    fi
    
    # Count files to give user an idea of what's being copied
    local file_count=$(find "$LOCAL_DIR" -type f -name "*.mp3" 2>/dev/null | wc -l)
    print_status "Found $file_count MP3 files in local directory"
    
    if [[ $file_count -eq 0 ]]; then
        print_warning "No MP3 files found in $LOCAL_DIR"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
}

check_remote_connectivity() {
    print_status "Testing SSH connectivity to ${REMOTE_USER}@${REMOTE_HOST}..."
    
    if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "${REMOTE_USER}@${REMOTE_HOST}" "echo 'Connection successful'" 2>/dev/null; then
        print_error "Cannot connect to remote server"
        print_error "Please ensure:"
        print_error "  1. SSH key is set up for ${REMOTE_USER}@${REMOTE_HOST}"
        print_error "  2. Remote server is accessible"
        print_error "  3. User has permission to access ${REMOTE_DIR}"
        exit 1
    fi
    
    print_success "SSH connection verified"
}

check_remote_directory() {
    print_status "Checking remote directory structure..."
    
    # Create remote directory if it doesn't exist
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p '$REMOTE_DIR'" || {
        print_error "Failed to create remote directory: $REMOTE_DIR"
        exit 1
    }
    
    # Check if we can write to remote directory
    if ! ssh "${REMOTE_USER}@${REMOTE_HOST}" "test -w '$REMOTE_DIR'"; then
        print_error "Cannot write to remote directory: $REMOTE_DIR"
        exit 1
    fi
    
    print_success "Remote directory is accessible and writable"
}

show_summary() {
    echo
    print_status "=== COPY SUMMARY ==="
    print_status "Local directory:  $LOCAL_DIR"
    print_status "Remote target:    ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
    print_status "Rsync options:    $RSYNC_OPTIONS"
    
    if [[ ${#EXCLUDE_PATTERNS[@]} -gt 0 ]]; then
        print_status "Exclude patterns: ${EXCLUDE_PATTERNS[*]}"
    fi
    
    if [[ $DRY_RUN == true ]]; then
        print_warning "DRY RUN MODE - No files will actually be copied"
    fi
    
    if [[ $DELETE_EXTRA == true ]]; then
        print_warning "DELETE MODE - Extra files on remote will be removed"
    fi
    
    echo
}

perform_copy() {
    print_status "Starting file transfer..."
    echo
    
    # Use rsync to copy files
    # Note: trailing slash on LOCAL_DIR means copy contents, not the directory itself
    if rsync $RSYNC_OPTIONS "$LOCAL_DIR/" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"; then
        echo
        if [[ $DRY_RUN == true ]]; then
            print_success "Dry run completed successfully"
        else
            print_success "File transfer completed successfully"
        fi
    else
        echo
        print_error "File transfer failed"
        exit 1
    fi
}

show_post_copy_info() {
    if [[ $DRY_RUN == false ]]; then
        echo
        print_status "=== POST-COPY VERIFICATION ==="
        
        # Show remote file count
        remote_file_count=$(ssh "${REMOTE_USER}@${REMOTE_HOST}" "find '$REMOTE_DIR' -type f -name '*.mp3' 2>/dev/null | wc -l" 2>/dev/null || echo "unknown")
        print_status "MP3 files on remote server: $remote_file_count"
        
        # Show directory structure on remote
        print_status "Remote directory structure:"
        ssh "${REMOTE_USER}@${REMOTE_HOST}" "ls -la '$REMOTE_DIR'" 2>/dev/null || print_warning "Could not list remote directory"
        
        echo
        print_success "All operations completed!"
        print_status "Audio files are now available at: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
    fi
}

# Main execution
main() {
    print_status "Lithuanian Audio Cache Copy Script"
    print_status "=================================="
    
    # Run all checks
    check_local_directory
    check_remote_connectivity
    check_remote_directory
    
    # Show summary and get confirmation
    show_summary
    
    if [[ $DRY_RUN == false ]]; then
        read -p "Proceed with file transfer? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Transfer cancelled by user"
            exit 0
        fi
    fi
    
    # Perform the copy
    perform_copy
    
    # Show results
    show_post_copy_info
}

# Run main function
main "$@"
