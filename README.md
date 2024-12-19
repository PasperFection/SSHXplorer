# SSHXplorer

A powerful VS Code extension for seamless SSH file management and GitHub integration.

## Features

### SSH File Management
- 🔒 Secure SSH connections with connection pooling and auto-reconnect
- 📁 Full file system operations (create, read, update, delete)
- 📦 Bulk file operations with progress tracking
- 🗜️ Built-in file compression support
- 🔑 Secure credential management
- 🛡️ IP filtering and security logging

### GitHub Integration (New in 2.0.0)
- 🔄 Repository cloning and syncing
- 🔀 Pull request management
- 🤝 Interactive merge conflict resolution
- 🌿 Branch management
- 🔐 Secure authentication via VS Code API
- ⚡ Real-time repository change events
- 📝 Automated stash handling
- 🛡️ Type-safe operations with enhanced error handling
- 🔒 Improved session management

### User Interface
- 🎨 Modern, customizable interface
- 📱 Responsive design
- ⌨️ Intuitive keyboard shortcuts
- 📊 Status bar integration
- 🎯 Context-aware menus
- 🌈 Theme support

### Performance & Monitoring
- 📈 Real-time performance metrics
- 📊 Resource usage monitoring
- 🔍 Error tracking and logging
- 📱 Usage analytics
- ⚡ Optimized for large files

## Requirements

- VS Code 1.60.0 or higher
- SSH client installed on your system
- Git 2.30.0 or higher (for GitHub integration)
- Node.js 14.0.0 or higher

## Installation

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P`
3. Type `ext install sshxplorer`
4. Press Enter

## Getting Started

1. Open the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "SSHXplorer: Connect" and press Enter
3. Enter your SSH server details
4. Start managing your remote files!

### GitHub Integration Setup

1. Open the command palette
2. Type "SSHXplorer: Sign in to GitHub" and press Enter
3. Follow the authentication flow
4. Start using GitHub features!

## Configuration

### SSH Settings
- `sshxplorer.connections`: Predefined SSH connections
- `sshxplorer.defaultPort`: Default SSH port (22)
- `sshxplorer.timeout`: Connection timeout in milliseconds
- `sshxplorer.keepalive`: Keep-alive interval

### GitHub Settings
- `sshxplorer.github.enabled`: Enable GitHub integration
- `sshxplorer.github.defaultBranch`: Default branch for new repositories
- `sshxplorer.github.autoSync`: Enable automatic repository syncing
- `sshxplorer.github.stashBeforeSync`: Automatically stash changes before sync

### Performance Settings
- `sshxplorer.maxConcurrentOperations`: Maximum concurrent operations
- `sshxplorer.compressionLevel`: Default compression level (0-9)
- `sshxplorer.bufferSize`: Buffer size for file operations

## Security

- 🔐 Secure credential storage using VS Code's built-in secret storage
- 🔒 SSH key management with passphrase support
- 🛡️ Certificate validation
- 🔍 IP filtering capabilities
- 📝 Comprehensive security logging
- 🔐 Secure GitHub token handling
- 🛡️ Enhanced session management

## Security Features 🛡️

SSHXplorer provides comprehensive security scanning and monitoring capabilities to help you maintain the security of your projects.

### Security Scanning Commands

- **Comprehensive Security Scan** (`sshxplorer.security.comprehensiveScan`)
  - Performs an in-depth security analysis of your entire workspace
  - Detects sensitive files, code vulnerabilities, and dependency issues
  - Generates a detailed HTML report with actionable insights

- **Sensitive File Scan** (`sshxplorer.security.sensitiveFileScan`)
  - Identifies potentially sensitive files in your project
  - Scans for files containing credentials, tokens, or other confidential information
  - Helps prevent accidental exposure of sensitive data

- **Code Pattern Vulnerability Scan** (`sshxplorer.security.codePatternScan`)
  - Analyzes source code for potential security vulnerabilities
  - Detects dangerous code patterns like `eval()`, potential XSS risks
  - Provides recommendations for code improvements

- **Dependency Vulnerability Scan** (`sshxplorer.security.dependencyScan`)
  - Checks project dependencies for known security vulnerabilities
  - Identifies outdated or potentially risky packages
  - Suggests updates to mitigate security risks

- **File Integrity Check** (`sshxplorer.security.fileIntegrity`)
  - Generates a SHA-256 hash for file content
  - Helps track file changes and detect unauthorized modifications
  - Easily copy hash for verification

### Configuration Options

You can customize security scanning in your VS Code settings:

```json
"sshxplorer.security.autoFix": true,
"sshxplorer.securityScan.enabledChecks": [
  "sensitiveFiles", 
  "codePatterns", 
  "dependencies", 
  "comprehensiveScan", 
  "fileIntegrity"
]
```

### Access Methods

1. **Command Palette**: 
   - Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
   - Type the security command name

2. **Security View**:
   - Click on the SSHXplorer icon in the Activity Bar
   - Navigate to the Security tab
   - Use the scan buttons in the view title

3. **Context Menus**:
   - Right-click on files in the Explorer or Editor
   - Select "Check File Integrity" from the context menu

### Best Practices

- Regularly run comprehensive security scans
- Address vulnerabilities promptly
- Keep dependencies up to date
- Use the file integrity check for critical files

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Testing

See [TEST_CHECKLIST.md](TEST_CHECKLIST.md) for our comprehensive test coverage.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for release history and latest updates.

## Support

- 📚 [Documentation](https://github.com/PasperFection/sshxplorer/wiki)
- 🐛 [Issue Tracker](https://github.com/PasperFection/sshxplorer/issues)
- 💬 [Discussions](https://github.com/PasperFection/sshxplorer/discussions)

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

**Note**: For the latest updates and features, always check the [CHANGELOG.md](CHANGELOG.md).
