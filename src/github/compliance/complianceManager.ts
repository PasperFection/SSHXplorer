import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { ComplianceWebview } from './complianceWebview';

export interface ComplianceCheck {
    id: string;
    name: string;
    description: string;
    status: 'passed' | 'failed' | 'pending';
    details?: string;
    category: 'security' | 'privacy' | 'code' | 'documentation';
    severity: 'critical' | 'high' | 'medium' | 'low';
    remediation?: string;
    lastChecked: string;
}

export interface CompliancePolicy {
    id: string;
    name: string;
    description: string;
    requirements: string[];
    category: string;
    enforced: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ComplianceReport {
    id: string;
    summary: {
        total: number;
        passed: number;
        failed: number;
        pending: number;
    };
    checks: ComplianceCheck[];
    generatedAt: string;
}

export class ComplianceManager {
    private complianceWebview: ComplianceWebview | undefined;
    private refreshInterval: NodeJS.Timer | undefined;

    constructor(
        private octokit: Octokit,
        private extensionUri: vscode.Uri
    ) {}

    public async showComplianceOverview(owner: string, repo: string): Promise<void> {
        try {
            const [checks, policies, report] = await Promise.all([
                this.getComplianceChecks(owner, repo),
                this.getCompliancePolicies(owner, repo),
                this.generateComplianceReport(owner, repo)
            ]);

            this.complianceWebview = new ComplianceWebview(
                this.extensionUri,
                {
                    owner,
                    repo,
                    checks,
                    policies,
                    report
                },
                async (action) => {
                    await this.handleComplianceAction(owner, repo, action);
                }
            );

            await this.complianceWebview.show();
            this.startAutoRefresh(owner, repo);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load compliance overview: ${error.message}`);
        }
    }

    private async getComplianceChecks(owner: string, repo: string): Promise<ComplianceCheck[]> {
        // Implement compliance checks based on repository settings and content
        const checks: ComplianceCheck[] = [];

        // Security compliance checks
        const securityChecks = await this.performSecurityChecks(owner, repo);
        checks.push(...securityChecks);

        // Code quality checks
        const codeChecks = await this.performCodeChecks(owner, repo);
        checks.push(...codeChecks);

        // Documentation checks
        const docChecks = await this.performDocumentationChecks(owner, repo);
        checks.push(...docChecks);

        // Privacy checks
        const privacyChecks = await this.performPrivacyChecks(owner, repo);
        checks.push(...privacyChecks);

        return checks;
    }

    private async performSecurityChecks(owner: string, repo: string): Promise<ComplianceCheck[]> {
        const checks: ComplianceCheck[] = [];

        // Check security settings
        try {
            const { data: repoData } = await this.octokit.repos.get({ owner, repo });

            checks.push({
                id: 'security-branch-protection',
                name: 'Branch Protection',
                description: 'Check if main branch is protected',
                status: repoData.default_branch_protection ? 'passed' : 'failed',
                category: 'security',
                severity: 'high',
                remediation: 'Enable branch protection rules for the main branch',
                lastChecked: new Date().toISOString()
            });

            checks.push({
                id: 'security-vulnerability-alerts',
                name: 'Vulnerability Alerts',
                description: 'Check if vulnerability alerts are enabled',
                status: repoData.security_and_analysis?.advanced_security?.status === 'enabled' ? 'passed' : 'failed',
                category: 'security',
                severity: 'critical',
                remediation: 'Enable vulnerability alerts in repository settings',
                lastChecked: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to check security settings:', error);
        }

        return checks;
    }

    private async performCodeChecks(owner: string, repo: string): Promise<ComplianceCheck[]> {
        const checks: ComplianceCheck[] = [];

        try {
            // Check for required files
            const requiredFiles = ['README.md', 'LICENSE', '.gitignore'];
            for (const file of requiredFiles) {
                try {
                    await this.octokit.repos.getContent({
                        owner,
                        repo,
                        path: file
                    });

                    checks.push({
                        id: `code-required-file-${file}`,
                        name: `Required File: ${file}`,
                        description: `Check if ${file} exists`,
                        status: 'passed',
                        category: 'code',
                        severity: 'medium',
                        lastChecked: new Date().toISOString()
                    });
                } catch {
                    checks.push({
                        id: `code-required-file-${file}`,
                        name: `Required File: ${file}`,
                        description: `Check if ${file} exists`,
                        status: 'failed',
                        category: 'code',
                        severity: 'medium',
                        remediation: `Add ${file} to the repository`,
                        lastChecked: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            console.error('Failed to perform code checks:', error);
        }

        return checks;
    }

    private async performDocumentationChecks(owner: string, repo: string): Promise<ComplianceCheck[]> {
        const checks: ComplianceCheck[] = [];

        try {
            // Check README.md content
            const { data: readme } = await this.octokit.repos.getReadme({
                owner,
                repo
            });

            const content = Buffer.from(readme.content, 'base64').toString();
            const sections = ['Installation', 'Usage', 'Contributing'];

            for (const section of sections) {
                checks.push({
                    id: `docs-readme-section-${section.toLowerCase()}`,
                    name: `README ${section} Section`,
                    description: `Check if README includes ${section} section`,
                    status: content.includes(`## ${section}`) ? 'passed' : 'failed',
                    category: 'documentation',
                    severity: 'medium',
                    remediation: `Add ${section} section to README.md`,
                    lastChecked: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Failed to perform documentation checks:', error);
        }

        return checks;
    }

    private async performPrivacyChecks(owner: string, repo: string): Promise<ComplianceCheck[]> {
        const checks: ComplianceCheck[] = [];

        try {
            // Check for sensitive files
            const sensitivePatterns = [
                '**/id_rsa',
                '**/id_dsa',
                '**/*.pem',
                '**/config.json',
                '**/secrets.yaml'
            ];

            for (const pattern of sensitivePatterns) {
                checks.push({
                    id: `privacy-sensitive-file-${pattern}`,
                    name: `Sensitive File Check: ${pattern}`,
                    description: `Check for potentially sensitive files matching ${pattern}`,
                    status: 'pending', // Implement actual check
                    category: 'privacy',
                    severity: 'critical',
                    remediation: 'Remove sensitive files and add to .gitignore',
                    lastChecked: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Failed to perform privacy checks:', error);
        }

        return checks;
    }

    private async getCompliancePolicies(owner: string, repo: string): Promise<CompliancePolicy[]> {
        // Return predefined compliance policies
        return [
            {
                id: 'security-policy',
                name: 'Security Policy',
                description: 'Basic security requirements for all repositories',
                requirements: [
                    'Branch protection enabled for main branch',
                    'Vulnerability alerts enabled',
                    'Code scanning enabled',
                    'Secret scanning enabled'
                ],
                category: 'security',
                enforced: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'documentation-policy',
                name: 'Documentation Policy',
                description: 'Documentation requirements for all repositories',
                requirements: [
                    'README.md with required sections',
                    'LICENSE file',
                    'Contributing guidelines',
                    'Code of conduct'
                ],
                category: 'documentation',
                enforced: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
    }

    private async generateComplianceReport(owner: string, repo: string): Promise<ComplianceReport> {
        const checks = await this.getComplianceChecks(owner, repo);

        const summary = {
            total: checks.length,
            passed: checks.filter(c => c.status === 'passed').length,
            failed: checks.filter(c => c.status === 'failed').length,
            pending: checks.filter(c => c.status === 'pending').length
        };

        return {
            id: `${owner}-${repo}-${Date.now()}`,
            summary,
            checks,
            generatedAt: new Date().toISOString()
        };
    }

    private async handleComplianceAction(owner: string, repo: string, action: any): Promise<void> {
        switch (action.type) {
            case 'runCheck':
                await this.runComplianceCheck(owner, repo, action.checkId);
                break;

            case 'enablePolicy':
                await this.enableCompliancePolicy(owner, repo, action.policyId);
                break;

            case 'generateReport':
                await this.generateAndDownloadReport(owner, repo);
                break;

            case 'refresh':
                await this.refreshCompliance(owner, repo);
                break;
        }
    }

    private async runComplianceCheck(owner: string, repo: string, checkId: string): Promise<void> {
        try {
            // Re-run specific compliance check
            const checks = await this.getComplianceChecks(owner, repo);
            const updatedCheck = checks.find(c => c.id === checkId);

            if (updatedCheck) {
                this.complianceWebview?.updateCheck(updatedCheck);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to run compliance check: ${error.message}`);
        }
    }

    private async enableCompliancePolicy(owner: string, repo: string, policyId: string): Promise<void> {
        try {
            // Enable specific compliance policy
            const policies = await this.getCompliancePolicies(owner, repo);
            const policy = policies.find(p => p.id === policyId);

            if (policy) {
                policy.enforced = true;
                this.complianceWebview?.updatePolicy(policy);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to enable compliance policy: ${error.message}`);
        }
    }

    private async generateAndDownloadReport(owner: string, repo: string): Promise<void> {
        try {
            const report = await this.generateComplianceReport(owner, repo);
            // Implement report download functionality
            vscode.window.showInformationMessage('Compliance report generated successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate compliance report: ${error.message}`);
        }
    }

    private async refreshCompliance(owner: string, repo: string): Promise<void> {
        try {
            const [checks, policies, report] = await Promise.all([
                this.getComplianceChecks(owner, repo),
                this.getCompliancePolicies(owner, repo),
                this.generateComplianceReport(owner, repo)
            ]);

            this.complianceWebview?.update({
                checks,
                policies,
                report
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to refresh compliance: ${error.message}`);
        }
    }

    private startAutoRefresh(owner: string, repo: string): void {
        // Refresh compliance overview every 15 minutes
        this.refreshInterval = setInterval(() => {
            this.refreshCompliance(owner, repo);
        }, 15 * 60 * 1000);
    }

    public dispose(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.complianceWebview?.dispose();
    }
}
