import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { minimatch } from 'minimatch';

export interface SecurityIssue {
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    category: 'File' | 'Code' | 'Dependency' | 'Configuration';
    description: string;
    file?: string;
    line?: number;
    recommendation?: string;
}

export class SecurityScanner {
    private context: vscode.ExtensionContext;
    private configuration: vscode.WorkspaceConfiguration;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.configuration = vscode.workspace.getConfiguration('sshxplorer');
    }

    public getConfiguredPatterns(): { 
        sensitiveFiles: string[], 
        sensitiveContent: RegExp[], 
        codeVulnerabilities: Array<{pattern: RegExp, severity: 'Low'|'Medium'|'High'|'Critical', description: string}>,
        vulnerableDependencies: Array<{name: string, version: string, reason: string}>,
        excludePaths: string[],
        severityThreshold: 'Low'|'Medium'|'High'|'Critical'
    } {
        return {
            sensitiveFiles: this.configuration.get('security.sensitiveFilePatterns', []),
            sensitiveContent: (this.configuration.get('security.sensitiveContentPatterns', []) || [])
                .map(pattern => new RegExp(pattern, 'i')),
            codeVulnerabilities: (this.configuration.get('security.codeVulnerabilityPatterns', []) || [])
                .map(vuln => ({
                    pattern: new RegExp(vuln.pattern),
                    severity: vuln.severity as 'Low'|'Medium'|'High'|'Critical',
                    description: vuln.description
                })),
            vulnerableDependencies: this.configuration.get('security.vulnerableDependencies', []),
            excludePaths: this.configuration.get('security.scanExcludePaths', []),
            severityThreshold: this.configuration.get('security.reportSeverityThreshold', 'Medium') as 'Low'|'Medium'|'High'|'Critical'
        };
    }

    public shouldScanPath(fullPath: string, excludePaths: string[]): boolean {
        return !excludePaths.some(excludePath => 
            minimatch(fullPath, excludePath, { dot: true })
        );
    }

    public scanSensitiveFiles(rootPath: string): SecurityIssue[] {
        const { sensitiveFiles, excludePaths } = this.getConfiguredPatterns();
        const issues: SecurityIssue[] = [];

        const findSensitiveFiles = (dir: string) => {
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    if (this.shouldScanPath(fullPath, excludePaths)) {
                        findSensitiveFiles(fullPath);
                    }
                } else if (stat.isFile()) {
                    const fileName = path.basename(fullPath);
                    if (sensitiveFiles.some(pattern => minimatch(fileName, pattern))) {
                        issues.push({
                            severity: 'High',
                            category: 'File',
                            description: `Sensitive file detected: ${fileName}`,
                            file: fullPath
                        });
                    }
                }
            }
        };

        findSensitiveFiles(rootPath);
        return issues;
    }

    public scanCodePatterns(rootPath: string): SecurityIssue[] {
        const { codeVulnerabilities, excludePaths } = this.getConfiguredPatterns();
        const issues: SecurityIssue[] = [];

        const scanCodeFiles = (dir: string) => {
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    if (this.shouldScanPath(fullPath, excludePaths)) {
                        scanCodeFiles(fullPath);
                    }
                } else if (stat.isFile() && ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.html'].includes(path.extname(fullPath))) {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    
                    for (const vuln of codeVulnerabilities) {
                        const matches = content.match(vuln.pattern);
                        if (matches) {
                            issues.push({
                                severity: vuln.severity,
                                category: 'Code',
                                description: vuln.description,
                                file: fullPath
                            });
                        }
                    }
                }
            }
        };

        scanCodeFiles(rootPath);
        return issues;
    }

    public scanDependencies(rootPath: string): SecurityIssue[] {
        const { vulnerableDependencies } = this.getConfiguredPatterns();
        const issues: SecurityIssue[] = [];

        const findPackageFiles = (dir: string) => {
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    findPackageFiles(fullPath);
                } else if (file === 'package.json') {
                    try {
                        const packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
                        const dependencies = { 
                            ...packageJson.dependencies, 
                            ...packageJson.devDependencies 
                        };

                        for (const dep of vulnerableDependencies) {
                            if (dependencies[dep.name]) {
                                const version = dependencies[dep.name];
                                // Basic version comparison (can be enhanced)
                                issues.push({
                                    severity: 'High',
                                    category: 'Dependency',
                                    description: `Vulnerable dependency: ${dep.name} (${version}) - ${dep.reason}`,
                                    file: fullPath
                                });
                            }
                        }
                    } catch (error) {
                        console.error(`Error parsing package.json at ${fullPath}:`, error);
                    }
                }
            }
        };

        findPackageFiles(rootPath);
        return issues;
    }

    public performComprehensiveScan(): SecurityIssue[] {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        const allIssues: SecurityIssue[] = [];
        for (const folder of workspaceFolders) {
            const folderPath = folder.uri.fsPath;
            allIssues.push(
                ...this.scanSensitiveFiles(folderPath),
                ...this.scanCodePatterns(folderPath),
                ...this.scanDependencies(folderPath)
            );
        }

        return allIssues;
    }

    public generateSecurityHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    public async displaySecurityReport(issues: SecurityIssue[]): Promise<void> {
        const { severityThreshold } = this.getConfiguredPatterns();
        const filteredIssues = issues.filter(issue => {
            const severityOrder = ['Low', 'Medium', 'High', 'Critical'];
            return severityOrder.indexOf(issue.severity) >= severityOrder.indexOf(severityThreshold);
        });

        if (filteredIssues.length === 0) {
            await vscode.window.showInformationMessage('No significant security issues found.');
            return;
        }

        // Create a new output channel for security report
        const channel = vscode.window.createOutputChannel('SSHXplorer Security Report');
        channel.clear();
        channel.appendLine('=== SSHXplorer Security Scan Report ===');
        channel.appendLine(`Total Issues: ${filteredIssues.length}\n`);

        // Group issues by severity and category
        const groupedIssues: { [key: string]: SecurityIssue[] } = {};
        filteredIssues.forEach(issue => {
            const key = `${issue.severity} - ${issue.category}`;
            if (!groupedIssues[key]) {
                groupedIssues[key] = [];
            }
            groupedIssues[key].push(issue);
        });

        // Output grouped issues
        for (const [group, groupIssues] of Object.entries(groupedIssues)) {
            channel.appendLine(`${group}:`);
            groupIssues.forEach(issue => {
                channel.appendLine(`  - ${issue.description}`);
                if (issue.file) {
                    channel.appendLine(`    File: ${issue.file}`);
                }
            });
            channel.appendLine('');
        }

        channel.show();

        // Optional: Create a quick pick for detailed actions
        const actions = await vscode.window.showQuickPick([
            'View Full Report', 
            'Open Security Settings', 
            'Ignore for Now'
        ], { 
            title: 'Security Issues Found',
            placeHolder: `${filteredIssues.length} security issues detected. What would you like to do?`
        });

        switch (actions) {
            case 'View Full Report':
                channel.show();
                break;
            case 'Open Security Settings':
                await vscode.commands.executeCommand('workbench.action.openSettings', 'sshxplorer.security');
                break;
        }
    }
}
