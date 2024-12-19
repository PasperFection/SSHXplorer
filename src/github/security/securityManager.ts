import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { SecurityWebview } from './securityWebview';

export interface SecurityVulnerability {
    id: number;
    number: number;
    state: 'open' | 'fixed' | 'dismissed';
    severity: 'low' | 'moderate' | 'high' | 'critical';
    summary: string;
    description: string;
    package: {
        name: string;
        ecosystem: string;
    };
    vulnerableVersionRange: string;
    firstPatchedVersion?: string;
    references: string[];
    publishedAt: string;
    updatedAt: string;
    dismissedAt?: string;
    dismissReason?: string;
    dismissComment?: string;
}

export interface SecurityAlert {
    id: number;
    affectedRange: string;
    fixedIn?: string;
    details: string;
    state: 'open' | 'fixed' | 'dismissed';
    dependencyName: string;
    manifestPath: string;
    scope: string;
    securityVulnerability: SecurityVulnerability;
    securityAdvisory: {
        ghsaId: string;
        cveId?: string;
        summary: string;
        description: string;
        severity: string;
        publishedAt: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CodeScanningAlert {
    number: number;
    state: 'open' | 'fixed' | 'dismissed';
    dismissedBy?: {
        login: string;
        avatar_url: string;
    };
    dismissedAt?: string;
    dismissReason?: string;
    rule: {
        id: string;
        severity: string;
        description: string;
    };
    tool: {
        name: string;
        version: string;
    };
    mostRecentInstance: {
        ref: string;
        state: string;
        commitSha: string;
        message: string;
        location: {
            path: string;
            startLine: number;
            endLine: number;
            startColumn?: number;
            endColumn?: number;
        };
    };
    createdAt: string;
    updatedAt: string;
}

export interface SecretScanningAlert {
    number: number;
    state: 'open' | 'resolved';
    resolution?: 'false_positive' | 'wont_fix' | 'revoked' | 'used_in_tests';
    secret_type: string;
    secret: string;
    locations: {
        path: string;
        startLine: number;
        endLine: number;
    }[];
    createdAt: string;
    updatedAt: string;
}

export class SecurityManager {
    private securityWebview: SecurityWebview | undefined;
    private refreshInterval: NodeJS.Timer | undefined;

    constructor(
        private octokit: Octokit,
        private extensionUri: vscode.Uri
    ) {}

    public async showSecurityOverview(owner: string, repo: string): Promise<void> {
        try {
            const [
                dependencyAlerts,
                codeScanningAlerts,
                secretScanningAlerts
            ] = await Promise.all([
                this.getDependencyAlerts(owner, repo),
                this.getCodeScanningAlerts(owner, repo),
                this.getSecretScanningAlerts(owner, repo)
            ]);

            this.securityWebview = new SecurityWebview(
                this.extensionUri,
                {
                    owner,
                    repo,
                    dependencyAlerts,
                    codeScanningAlerts,
                    secretScanningAlerts
                },
                async (action) => {
                    await this.handleSecurityAction(owner, repo, action);
                }
            );

            await this.securityWebview.show();
            this.startAutoRefresh(owner, repo);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load security overview: ${error.message}`);
        }
    }

    private async getDependencyAlerts(owner: string, repo: string): Promise<SecurityAlert[]> {
        const { data } = await this.octokit.repos.listVulnerabilityAlerts({
            owner,
            repo,
            state: 'open'
        });
        return data;
    }

    private async getCodeScanningAlerts(owner: string, repo: string): Promise<CodeScanningAlert[]> {
        try {
            const { data } = await this.octokit.codeScanning.listAlertsForRepo({
                owner,
                repo,
                state: 'open'
            });
            return data;
        } catch {
            return [];
        }
    }

    private async getSecretScanningAlerts(owner: string, repo: string): Promise<SecretScanningAlert[]> {
        try {
            const { data } = await this.octokit.secretScanning.listAlertsForRepo({
                owner,
                repo,
                state: 'open'
            });
            return data;
        } catch {
            return [];
        }
    }

    public async enableDependencyAlerts(owner: string, repo: string): Promise<void> {
        try {
            await this.octokit.repos.enableVulnerabilityAlerts({
                owner,
                repo
            });
            vscode.window.showInformationMessage('Dependency alerts enabled successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to enable dependency alerts: ${error.message}`);
        }
    }

    public async enableAutomatedSecurityFixes(owner: string, repo: string): Promise<void> {
        try {
            await this.octokit.repos.enableAutomatedSecurityFixes({
                owner,
                repo
            });
            vscode.window.showInformationMessage('Automated security fixes enabled successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to enable automated security fixes: ${error.message}`
            );
        }
    }

    public async dismissDependencyAlert(
        owner: string,
        repo: string,
        alertNumber: number,
        dismissReason: string,
        dismissComment?: string
    ): Promise<void> {
        try {
            await this.octokit.repos.updateVulnerabilityAlertDismissal({
                owner,
                repo,
                alert_number: alertNumber,
                dismissal_reason: dismissReason,
                dismissal_comment: dismissComment
            });
            await this.refreshSecurityOverview(owner, repo);
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to dismiss dependency alert: ${error.message}`
            );
        }
    }

    public async dismissCodeScanningAlert(
        owner: string,
        repo: string,
        alertNumber: number,
        dismissReason: string,
        dismissComment?: string
    ): Promise<void> {
        try {
            await this.octokit.codeScanning.updateAlert({
                owner,
                repo,
                alert_number: alertNumber,
                state: 'dismissed',
                dismissed_reason: dismissReason,
                dismissed_comment: dismissComment
            });
            await this.refreshSecurityOverview(owner, repo);
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to dismiss code scanning alert: ${error.message}`
            );
        }
    }

    public async resolveSecretScanningAlert(
        owner: string,
        repo: string,
        alertNumber: number,
        resolution: string
    ): Promise<void> {
        try {
            await this.octokit.secretScanning.updateAlert({
                owner,
                repo,
                alert_number: alertNumber,
                state: 'resolved',
                resolution
            });
            await this.refreshSecurityOverview(owner, repo);
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to resolve secret scanning alert: ${error.message}`
            );
        }
    }

    public async enableCodeScanning(owner: string, repo: string): Promise<void> {
        try {
            // Create a new workflow file for code scanning
            const workflowContent = `
name: "CodeQL"

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: [ 'javascript' ]

    steps:
    - name: Checkout repository
      uses: actions/checkout@v2

    - name: Initialize CodeQL
      uses: github/codeql-action/init@v2
      with:
        languages: \${{ matrix.language }}

    - name: Autobuild
      uses: github/codeql-action/autobuild@v2

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2
`;

            await this.octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: '.github/workflows/codeql-analysis.yml',
                message: 'Enable CodeQL scanning',
                content: Buffer.from(workflowContent).toString('base64')
            });

            vscode.window.showInformationMessage('CodeQL scanning enabled successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to enable code scanning: ${error.message}`);
        }
    }

    public async enableSecretScanning(owner: string, repo: string): Promise<void> {
        try {
            await this.octokit.repos.enableSecretScanning({
                owner,
                repo
            });
            vscode.window.showInformationMessage('Secret scanning enabled successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to enable secret scanning: ${error.message}`);
        }
    }

    private async handleSecurityAction(owner: string, repo: string, action: any): Promise<void> {
        switch (action.type) {
            case 'enableDependencyAlerts':
                await this.enableDependencyAlerts(owner, repo);
                break;

            case 'enableAutomatedFixes':
                await this.enableAutomatedSecurityFixes(owner, repo);
                break;

            case 'enableCodeScanning':
                await this.enableCodeScanning(owner, repo);
                break;

            case 'enableSecretScanning':
                await this.enableSecretScanning(owner, repo);
                break;

            case 'dismissDependencyAlert':
                await this.dismissDependencyAlert(
                    owner,
                    repo,
                    action.alertNumber,
                    action.dismissReason,
                    action.dismissComment
                );
                break;

            case 'dismissCodeScanningAlert':
                await this.dismissCodeScanningAlert(
                    owner,
                    repo,
                    action.alertNumber,
                    action.dismissReason,
                    action.dismissComment
                );
                break;

            case 'resolveSecretAlert':
                await this.resolveSecretScanningAlert(
                    owner,
                    repo,
                    action.alertNumber,
                    action.resolution
                );
                break;

            case 'refresh':
                await this.refreshSecurityOverview(owner, repo);
                break;
        }
    }

    private async refreshSecurityOverview(owner: string, repo: string): Promise<void> {
        try {
            const [
                dependencyAlerts,
                codeScanningAlerts,
                secretScanningAlerts
            ] = await Promise.all([
                this.getDependencyAlerts(owner, repo),
                this.getCodeScanningAlerts(owner, repo),
                this.getSecretScanningAlerts(owner, repo)
            ]);

            this.securityWebview?.update({
                dependencyAlerts,
                codeScanningAlerts,
                secretScanningAlerts
            });
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to refresh security overview: ${error.message}`
            );
        }
    }

    private startAutoRefresh(owner: string, repo: string): void {
        // Refresh security overview every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.refreshSecurityOverview(owner, repo);
        }, 5 * 60 * 1000);
    }

    public dispose(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.securityWebview?.dispose();
    }
}
