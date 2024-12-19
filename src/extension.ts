import * as vscode from 'vscode';
import { Client } from 'ssh2';
import { SSHFileSystemProvider } from './fileSystemProvider';
import { ConnectionManager } from './connectionManager';
import { RemoteExplorer } from './remoteExplorer';
import { TutorialManager } from './tutorial/tutorialManager';
import { SecurityScanner, SecurityIssue } from './security/securityScanner';

export function activate(context: vscode.ExtensionContext) {
    const connectionManager = new ConnectionManager(context);
    const fileSystemProvider = new SSHFileSystemProvider(connectionManager);
    const remoteExplorer = new RemoteExplorer(connectionManager);
    const tutorialManager = new TutorialManager(context);
    const securityScanner = new SecurityScanner(context);

    // Register the SSH filesystem provider
    context.subscriptions.push(
        vscode.workspace.registerFileSystemProvider('ssh', fileSystemProvider, {
            isCaseSensitive: true,
            isReadonly: false
        })
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('sshxplorer.connect', async () => {
            try {
                const connection = await connectionManager.promptForConnection();
                if (connection) {
                    await connectionManager.connect(connection);
                    vscode.window.showInformationMessage(`Connected to ${connection.host}`);
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Connection failed: ${error.message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sshxplorer.disconnect', async () => {
            await connectionManager.disconnect();
            vscode.window.showInformationMessage('SSH connection closed');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sshxplorer.startTutorial', () => {
            tutorialManager.startTutorial();
        })
    );

    // Additional commands
    context.subscriptions.push(
        vscode.commands.registerCommand('sshxplorer.configure', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'sshxplorer');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sshxplorer.security.scan', async () => {
            try {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Performing Security Scan',
                    cancellable: true
                }, async (progress, token) => {
                    token.onCancellationRequested(() => {
                        vscode.window.showInformationMessage('Security scan was cancelled');
                    });

                    progress.report({ increment: 10, message: 'Initializing scan...' });
                    const issues = await securityScanner.performComprehensiveScan();
                    
                    progress.report({ increment: 50, message: 'Scan complete, generating report...' });
                    await securityScanner.displaySecurityReport(issues);

                    progress.report({ increment: 100, message: 'Security report generated' });

                    // Notify based on severity
                    const criticalIssues = issues.filter(i => i.severity === 'Critical').length;
                    const highIssues = issues.filter(i => i.severity === 'High').length;

                    if (criticalIssues > 0) {
                        vscode.window.showWarningMessage(`Security Scan found ${criticalIssues} Critical and ${highIssues} High-severity issues!`);
                    } else if (highIssues > 0) {
                        vscode.window.showInformationMessage(`Security Scan found ${highIssues} High-severity issues`);
                    } else {
                        vscode.window.showInformationMessage('No significant security issues found');
                    }
                });
            } catch (error: any) {
                vscode.window.showErrorMessage(`Security scan failed: ${error.message}`);
            }
        })
    );

    const runSecurityScanCommand = vscode.commands.registerCommand('sshxplorer.runSecurityScan', async () => {
        try {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Running Security Scan',
                cancellable: true
            }, async (progress, token) => {
                token.onCancellationRequested(() => {
                    vscode.window.showInformationMessage('Security scan was cancelled');
                });

                progress.report({ increment: 10, message: 'Scanning workspace...' });
                
                const issues = await securityScanner.performComprehensiveScan();
                
                progress.report({ increment: 90, message: 'Scan complete' });

                if (issues.length === 0) {
                    vscode.window.showInformationMessage('No security issues found!');
                } else {
                    await securityScanner.displaySecurityReport(issues);
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    context.subscriptions.push(runSecurityScanCommand);

    // Comprehensive Security Scan Command
    const runComprehensiveScanCommand = vscode.commands.registerCommand('sshxplorer.security.comprehensiveScan', async () => {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Running Comprehensive Security Scan',
                cancellable: true
            }, async (progress, token) => {
                token.onCancellationRequested(() => {
                    vscode.window.showInformationMessage('Security scan was cancelled');
                });

                progress.report({ increment: 10, message: 'Scanning workspace...' });
                
                const issues = securityScanner.performComprehensiveScan();
                
                progress.report({ increment: 90, message: 'Scan complete' });

                if (issues.length === 0) {
                    vscode.window.showInformationMessage('No security issues found!');
                } else {
                    await securityScanner.displaySecurityReport(issues);
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Sensitive File Scan Command
    const runSensitiveFileScanCommand = vscode.commands.registerCommand('sshxplorer.security.sensitiveFileScan', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folder found');
            return;
        }

        const issues: SecurityIssue[] = [];
        for (const folder of workspaceFolders) {
            const folderPath = folder.uri.fsPath;
            const fileIssues = securityScanner.scanSensitiveFiles(folderPath);
            issues.push(...fileIssues);
        }

        if (issues.length === 0) {
            vscode.window.showInformationMessage('No sensitive files detected');
        } else {
            await securityScanner.displaySecurityReport(issues);
        }
    });

    // Code Pattern Vulnerability Scan Command
    const runCodePatternScanCommand = vscode.commands.registerCommand('sshxplorer.security.codePatternScan', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folder found');
            return;
        }

        const issues: SecurityIssue[] = [];
        for (const folder of workspaceFolders) {
            const folderPath = folder.uri.fsPath;
            const codeIssues = securityScanner.scanCodePatterns(folderPath);
            issues.push(...codeIssues);
        }

        if (issues.length === 0) {
            vscode.window.showInformationMessage('No code pattern vulnerabilities detected');
        } else {
            await securityScanner.displaySecurityReport(issues);
        }
    });

    // Dependency Vulnerability Scan Command
    const runDependencyScanCommand = vscode.commands.registerCommand('sshxplorer.security.dependencyScan', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folder found');
            return;
        }

        const issues: SecurityIssue[] = [];
        for (const folder of workspaceFolders) {
            const folderPath = folder.uri.fsPath;
            const dependencyIssues = securityScanner.scanDependencies(folderPath);
            issues.push(...dependencyIssues);
        }

        if (issues.length === 0) {
            vscode.window.showInformationMessage('No dependency vulnerabilities detected');
        } else {
            await securityScanner.displaySecurityReport(issues);
        }
    });

    // File Content Integrity Check Command
    const checkFileIntegrityCommand = vscode.commands.registerCommand('sshxplorer.security.fileIntegrity', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active text editor');
            return;
        }

        const document = editor.document;
        const content = document.getText();
        const hash = securityScanner.generateSecurityHash(content);

        vscode.window.showInformationMessage(`File Integrity Hash: ${hash}`, 'Copy Hash')
            .then(selection => {
                if (selection === 'Copy Hash') {
                    vscode.env.clipboard.writeText(hash);
                }
            });
    });

    // Register all security-related commands
    context.subscriptions.push(
        runComprehensiveScanCommand,
        runSensitiveFileScanCommand,
        runCodePatternScanCommand,
        runDependencyScanCommand,
        checkFileIntegrityCommand
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sshxplorer.analytics.show', () => {
            // Placeholder for analytics view
            vscode.window.showInformationMessage('Showing repository analytics');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sshxplorer.releases.create', async () => {
            try {
                // Placeholder for release creation
                vscode.window.showInformationMessage('Creating new release...');
            } catch (error: any) {
                vscode.window.showErrorMessage(`Release creation failed: ${error.message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sshxplorer.compliance.check', async () => {
            try {
                // Placeholder for compliance check
                vscode.window.showInformationMessage('Running compliance check...');
            } catch (error: any) {
                vscode.window.showErrorMessage(`Compliance check failed: ${error.message}`);
            }
        })
    );

    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.command = 'sshxplorer.connect';
    context.subscriptions.push(statusBarItem);

    // Update status bar based on connection state
    connectionManager.onDidChangeConnection(() => {
        const connection = connectionManager.getCurrentConnection();
        if (connection) {
            statusBarItem.text = `$(remote) ${connection.host}`;
            statusBarItem.tooltip = 'Click to manage SSH connection';
        } else {
            statusBarItem.text = '$(remote) Connect SSH';
            statusBarItem.tooltip = 'Click to connect to remote SSH';
        }
        statusBarItem.show();
    });

    // Auto-reconnect feature
    connectionManager.onDidDisconnect(async (error) => {
        if (error) {
            const reconnect = await vscode.window.showWarningMessage(
                'SSH connection lost. Would you like to reconnect?',
                'Yes',
                'No'
            );
            if (reconnect === 'Yes') {
                const connection = connectionManager.getLastConnection();
                if (connection) {
                    await connectionManager.connect(connection);
                }
            }
        }
    });
}

export function deactivate() {
    // Clean up resources
}
