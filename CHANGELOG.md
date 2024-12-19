# Changelog

All notable changes to the SSHXplorer extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Integration
  - Remote repository management
  - Repository cloning support
  - Branch management capabilities
  - Commit and push functionality
  - Pull request integration
    - Create and manage pull requests
    - Review system with approve/request changes
    - Comment threading
    - Merge capabilities
  - Issue tracking system
    - Create and manage issues
    - Label and milestone support
    - Assignee management
    - Comment system
  - Code Review System
    - Inline code comments
    - Side-by-side diff view
    - Comment threading
    - Review suggestions
    - File change navigation
    - Comment resolution tracking
    - Syntax-aware diff highlighting
  - Repository Settings Management
    - General repository settings
    - Branch protection rules
    - Collaborator management
    - Merge settings configuration
    - Issue/Wiki/Project toggles
    - Default branch selection
    - Team access control
  - GitHub Actions Integration
    - Workflow management
    - Run history tracking
    - Job monitoring
    - Step-by-step progress
    - Artifact handling
    - Run cancellation
    - Status notifications
    - Real-time updates
  - Project Board Integration
    - Project creation and management
    - Column customization
    - Card creation and editing
    - Drag-and-drop card movement
    - Issue and PR integration
    - Note cards support
    - Real-time updates
    - Multi-project support
  - Repository Analytics
    - Commit activity tracking
    - Code frequency analysis
    - Contributor statistics
    - Traffic insights
    - Language breakdown
    - Performance metrics
    - Real-time updates
    - Custom insights
    - Top paths analysis
    - Clone statistics
    - Referrer tracking
  - Deployment Management
    - Environment creation and configuration
    - Deployment tracking
    - Status updates
    - Protection rules
    - Wait timers
    - Required reviewers
    - Branch policies
    - Real-time monitoring
    - Deployment history
    - Status badges
    - Log integration
  - Security Features
    - Dependency scanning
    - Code scanning (CodeQL)
    - Secret scanning
    - Automated fixes
    - Vulnerability alerts
    - Security advisories
    - Protection rules
    - Real-time monitoring
    - Alert dismissal
    - Fix suggestions
    - Severity tracking
  - Merge conflict resolution tools
  - GitHub authentication system
  - File system integration with Git operations
- Advanced Security Scanner Features
  - Comprehensive security scanning capabilities
    - [ ] Sensitive file detection
    - [ ] Code pattern vulnerability scanning
    - [ ] Dependency vulnerability checks
    - [ ] File integrity hash generation
  - Security Report Generation
    - [ ] Detailed HTML-based security report
    - [ ] Color-coded severity levels
    - [ ] Actionable recommendations
    - [ ] Categorization of security issues
  - Enhanced Security Commands
    - [ ] Comprehensive security scan
    - [ ] Sensitive file scan
    - [ ] Code pattern vulnerability scan
    - [ ] Dependency vulnerability scan
    - [ ] File integrity check
  - Configurable Security Scanning
    - [ ] Customizable security check types
    - [ ] Severity-based filtering
    - [ ] Category-based filtering
  - Security Hashing
    - [ ] SHA-256 content hash generation
    - [ ] File integrity tracking
    - [ ] Change detection mechanism

### Enhanced
- UI Components
  - Added GitHub view in explorer
  - Interactive repository management interface
  - Real-time Git status monitoring
  - Status bar integration for sync status
  - Theme-aware styling for GitHub components
  - Advanced merge conflict resolution UI
    - Side-by-side diff view
    - One-click conflict resolution
    - Custom resolution editor
    - Syntax highlighting for conflicts
  - Repository synchronization
    - Automatic stash/pop of changes
    - Branch-aware sync operations
    - Conflict detection and handling
    - Progress indicators for sync operations
  - Pull Request UI
    - Rich text editor for descriptions
    - Reviewer selection interface
    - Label management
    - Status indicators
  - Issue Management UI
    - Milestone integration
    - Label filtering
    - Assignee management
    - Comment threading
  - Code Review UI
    - Inline comment decorations
    - Review summary panel
    - File change statistics
    - Comment resolution UI
    - Syntax highlighting in diffs
    - Review status indicators
  - Repository Settings UI
    - Interactive settings panel
    - Branch protection editor
    - Collaborator management interface
    - Team access control panel
    - Merge settings configuration
    - Repository feature toggles
  - GitHub Actions UI
    - Workflow visualization
    - Run history timeline
    - Job progress tracking
    - Step status indicators
    - Artifact download interface
    - Real-time status updates
    - Error reporting
    - Log streaming
  - Project Board UI
    - Kanban board layout
    - Drag-and-drop interface
    - Card previews
    - Column management
    - Quick actions menu
    - Real-time synchronization
    - Progress tracking
    - Filter and search
  - Analytics Dashboard
    - Interactive charts
    - Real-time metrics
    - Custom date ranges
    - Contributor insights
    - Performance trends
    - Traffic visualization
    - Language distribution
    - Activity heatmap
    - Auto-refresh support
    - Export capabilities
  - Deployment Dashboard
    - Environment overview
    - Status tracking
    - Protection rules
    - Deployment history
    - Real-time updates
    - Log integration
    - Quick actions
    - Environment URLs
    - Status badges
    - Review requirements
  - Security Dashboard
    - Vulnerability overview
    - Alert management
    - Severity indicators
    - Fix suggestions
    - Code navigation
    - Alert dismissal
    - Real-time updates
    - Status tracking
    - Quick actions
    - Protection rules
  - Security Dashboard
    - [ ] Improved vulnerability detection logic
    - [ ] More comprehensive scanning techniques
    - [ ] Real-time security issue tracking
    - [ ] Advanced filtering and sorting of security issues
    - [ ] Integration with VS Code's problem matcher
    - [ ] Performance optimizations for large codebases

### Fixed
- File system watcher performance optimizations
- Debounced Git status checks
- Improved error handling for Git operations
- Merge conflict marker detection
- Stash management during sync operations
- Branch switching safety checks
- Pull request state management
- Issue comment synchronization
- Code review comment threading
- Diff view performance
- Comment decoration rendering
- Review state persistence
- Branch protection rule validation
- Settings persistence
- Team access synchronization
- Workflow status monitoring
- Job progress tracking
- Artifact handling
- Log streaming performance
- Project board synchronization
- Card drag-and-drop handling
- Column reordering
- Project state persistence
- Analytics data caching
- Chart rendering optimization
- Real-time update throttling
- Traffic data aggregation
- Contributor stats calculation
- Language detection accuracy
- Clone tracking reliability
- Environment protection rules
- Deployment status updates
- Wait timer calculations
- Review requirement checks
- Branch policy enforcement
- Log URL validation
- Security alert detection
- Vulnerability scanning
- CodeQL analysis
- Secret detection
- Alert state management
- Fix suggestion accuracy
- Protection rule validation
- Alert dismissal handling
- Security Scanning
  - [ ] Resolved false-positive detection in dependency scanning
  - [ ] Improved error handling during security scans
  - [ ] Enhanced file reading and parsing mechanisms
  - [ ] More robust pattern matching for vulnerabilities
  - [ ] Consistent severity and category classification

## [2.1.0] - 2024-01-15

### Added
- Comprehensive Security Scanner
  - Detect sensitive files across workspace
  - Scan code for potential security vulnerabilities
  - Interactive security report with severity levels
  - Configurable security checks
- New command: `sshxplorer.runSecurityScan`
- Configuration option for customizing security scan checks

### Improved
- Enhanced error handling in security scanning
- More robust file and code pattern detection
- Progress tracking for security scan
- Cancellable security scan

### Fixed
- Various TypeScript compilation warnings
- Dependency and type definition updates

## [2.0.0] - 2024-12-19

### Added
- GitHub Integration
  - Repository cloning and syncing
  - Pull request management
  - Merge conflict resolution
  - Branch management
  - Secure authentication flow
  - Real-time repository change events
  - Automated stash handling
  - Type-safe operations
  - Enhanced error handling
  - Improved session management

### Changed
- Improved error handling across all operations
- Enhanced type safety throughout the codebase
- Updated authentication flow to use VS Code's API
- Optimized git operations with proper parameter handling
- Improved session management and security

### Fixed
- Authentication token handling in GitHub integration
- Git command parameter type errors
- Stash operation handling in repository sync
- Session clearing during logout

### Security
- Improved session management
- Enhanced token handling
- Updated authentication flow security
- Added proper error handling for sensitive operations

## [1.0.0] - 2024-12-01

### Added
- SSH Connection Management
  - Connection pooling
  - Auto-reconnect functionality
  - Credential management
  - IP filtering
- File Operations
  - Basic CRUD operations
  - Bulk file operations
  - Compression support
  - Progress tracking
- User Interface
  - Custom views
  - Context menus
  - Keyboard shortcuts
  - Status bar integration
  - Theme support
- Monitoring & Analytics
  - Performance metrics
  - Usage tracking
  - Error monitoring
  - Resource usage tracking

### Security
- Secure credential storage
- SSH key management
- Certificate validation
- IP filtering
- Security logging

## [0.2.0] - 2024-12-18

### Added
- Comprehensive test suite with unit and integration tests
- File caching system for improved performance
- Large file handling support with streaming and progress indicators
- Advanced error handling and logging system
- Memory optimization for large file operations
- Detailed logging with multiple log levels
- Progress indicators for long-running operations

### Changed
- Improved file system provider with caching
- Enhanced error messages with detailed context
- Better type safety throughout the codebase
- Optimized memory usage for large file operations

### Security
- Added additional error checks
- Improved error handling for sensitive operations
- Enhanced logging for security-related events

## [0.1.0] - 2024-12-18

### Added
- Initial release of SSHXplorer
- Basic SSH connection functionality with support for both key-based and password authentication
- File explorer for remote directories with VS Code theme integration
- Integrated terminal support
- Multi-workspace support
- Status bar indicator for SSH connection status
- Quick connect functionality with connection management
- Auto-reconnect feature on connection loss
- Comprehensive error handling and logging

### Security
- Secure key management implementation
- Support for SSH key authentication
- Secure password storage
- Type-safe implementation with TypeScript

### Technical
- Full TypeScript support with strict type checking
- Integration with VS Code's native file system API
- Webpack bundling for optimal performance
- Support for VS Code themes and icons
- Compatible with Windsurf, Cursor, and other VS Code-based IDEs
