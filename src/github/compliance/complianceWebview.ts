import * as vscode from 'vscode';
import {
    ComplianceCheck,
    CompliancePolicy,
    ComplianceReport
} from './complianceManager';

interface ComplianceViewOptions {
    owner: string;
    repo: string;
    checks: ComplianceCheck[];
    policies: CompliancePolicy[];
    report: ComplianceReport;
}

export class ComplianceWebview {
    private panel: vscode.WebviewPanel | undefined;
    private options: ComplianceViewOptions;

    constructor(
        private readonly extensionUri: vscode.Uri,
        options: ComplianceViewOptions,
        private readonly onAction: (action: any) => Promise<void>
    ) {
        this.options = options;
    }

    public async show(): Promise<void> {
        this.panel = vscode.window.createWebviewPanel(
            'githubCompliance',
            'Compliance Overview',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.html = this.getWebviewContent();

        this.panel.webview.onDidReceiveMessage(async message => {
            try {
                await this.onAction(message);
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
        });
    }

    public update(options: Partial<ComplianceViewOptions>): void {
        this.options = { ...this.options, ...options };
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'updateData',
                data: options
            });
        }
    }

    public updateCheck(check: ComplianceCheck): void {
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'updateCheck',
                check
            });
        }
    }

    public updatePolicy(policy: CompliancePolicy): void {
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'updatePolicy',
                policy
            });
        }
    }

    private getWebviewContent(): string {
        const styleUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'github', 'style.css')
        );

        return `<!DOCTYPE html>
        <html>
        <head>
            <link href="${styleUri}" rel="stylesheet">
            <title>Compliance Overview</title>
            <style>
                .compliance-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    padding: 20px;
                }
                .compliance-card {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                    padding: 15px;
                }
                .check-card {
                    margin: 10px 0;
                    padding: 10px;
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .severity-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .severity-critical {
                    background: var(--vscode-testing-iconFailed);
                    color: var(--vscode-editor-background);
                }
                .severity-high {
                    background: #ff6b6b;
                    color: var(--vscode-editor-background);
                }
                .severity-medium {
                    background: #ffd93d;
                    color: var(--vscode-editor-foreground);
                }
                .severity-low {
                    background: var(--vscode-testing-iconSkipped);
                    color: var(--vscode-editor-background);
                }
                .status-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .status-passed {
                    background: var(--vscode-testing-iconPassed);
                    color: var(--vscode-editor-background);
                }
                .status-failed {
                    background: var(--vscode-testing-iconFailed);
                    color: var(--vscode-editor-background);
                }
                .status-pending {
                    background: var(--vscode-testing-iconQueued);
                    color: var(--vscode-editor-background);
                }
                .progress-bar {
                    height: 8px;
                    border-radius: 4px;
                    background: var(--vscode-progressBar-background);
                    margin: 10px 0;
                }
                .progress-value {
                    height: 100%;
                    border-radius: 4px;
                    background: var(--vscode-testing-iconPassed);
                }
                .policy-card {
                    margin: 10px 0;
                    padding: 10px;
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .requirement-list {
                    margin: 10px 0;
                    padding-left: 20px;
                }
                .meta-info {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin: 5px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Compliance Overview for ${this.options.owner}/${this.options.repo}</h2>
                    <div class="header-actions">
                        <button class="button" onclick="generateReport()">
                            Generate Report
                        </button>
                        <button class="button" onclick="refresh()">
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="compliance-summary">
                    <h3>Compliance Status</h3>
                    <div class="progress-bar">
                        <div class="progress-value" style="width: ${
                            (this.options.report.summary.passed / this.options.report.summary.total) * 100
                        }%"></div>
                    </div>
                    <div class="summary-stats">
                        <span>Total: ${this.options.report.summary.total}</span>
                        <span>Passed: ${this.options.report.summary.passed}</span>
                        <span>Failed: ${this.options.report.summary.failed}</span>
                        <span>Pending: ${this.options.report.summary.pending}</span>
                    </div>
                </div>

                <div class="compliance-grid">
                    <div class="compliance-card">
                        <h3>Security Checks</h3>
                        ${this.getComplianceChecksHtml('security')}
                    </div>

                    <div class="compliance-card">
                        <h3>Code Quality Checks</h3>
                        ${this.getComplianceChecksHtml('code')}
                    </div>

                    <div class="compliance-card">
                        <h3>Documentation Checks</h3>
                        ${this.getComplianceChecksHtml('documentation')}
                    </div>

                    <div class="compliance-card">
                        <h3>Privacy Checks</h3>
                        ${this.getComplianceChecksHtml('privacy')}
                    </div>
                </div>

                <div class="compliance-policies">
                    <h3>Compliance Policies</h3>
                    ${this.getCompliancePoliciesHtml()}
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function runCheck(checkId) {
                    vscode.postMessage({
                        type: 'runCheck',
                        checkId
                    });
                }

                function enablePolicy(policyId) {
                    vscode.postMessage({
                        type: 'enablePolicy',
                        policyId
                    });
                }

                function generateReport() {
                    vscode.postMessage({
                        type: 'generateReport'
                    });
                }

                function refresh() {
                    vscode.postMessage({
                        type: 'refresh'
                    });
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'updateData':
                            updateContent(message.data);
                            break;

                        case 'updateCheck':
                            updateCheck(message.check);
                            break;

                        case 'updatePolicy':
                            updatePolicy(message.policy);
                            break;
                    }
                });

                function updateContent(data) {
                    if (data.report) {
                        const progressValue = (data.report.summary.passed / data.report.summary.total) * 100;
                        document.querySelector('.progress-value').style.width = \`\${progressValue}%\`;
                        
                        const stats = document.querySelector('.summary-stats');
                        stats.innerHTML = \`
                            <span>Total: \${data.report.summary.total}</span>
                            <span>Passed: \${data.report.summary.passed}</span>
                            <span>Failed: \${data.report.summary.failed}</span>
                            <span>Pending: \${data.report.summary.pending}</span>
                        \`;
                    }

                    if (data.checks) {
                        const categories = ['security', 'code', 'documentation', 'privacy'];
                        categories.forEach(category => {
                            const container = document.querySelector(
                                \`.compliance-card:has(h3:contains('\${category.charAt(0).toUpperCase() + category.slice(1)} Checks'))\`
                            );
                            if (container) {
                                container.innerHTML = \`
                                    <h3>\${category.charAt(0).toUpperCase() + category.slice(1)} Checks</h3>
                                    ${this.getComplianceChecksHtml('').replace(/`/g, '\\`')}
                                \`;
                            }
                        });
                    }

                    if (data.policies) {
                        const policiesContainer = document.querySelector('.compliance-policies');
                        policiesContainer.innerHTML = \`
                            <h3>Compliance Policies</h3>
                            ${this.getCompliancePoliciesHtml().replace(/`/g, '\\`')}
                        \`;
                    }
                }

                function updateCheck(check) {
                    const checkElement = document.querySelector(\`[data-check-id="\${check.id}"]\`);
                    if (checkElement) {
                        checkElement.outerHTML = \`
                            <div class="check-card" data-check-id="\${check.id}">
                                <div class="check-header">
                                    <span class="severity-badge severity-\${check.severity}">
                                        \${check.severity}
                                    </span>
                                    <span class="status-badge status-\${check.status}">
                                        \${check.status}
                                    </span>
                                    <h4>\${check.name}</h4>
                                </div>
                                <div class="check-details">
                                    <div>\${check.description}</div>
                                    \${check.remediation ? \`
                                        <div class="remediation">
                                            Remediation: \${check.remediation}
                                        </div>
                                    \` : ''}
                                </div>
                                <div class="check-meta">
                                    Last checked: \${new Date(check.lastChecked).toLocaleString()}
                                </div>
                                <div class="check-actions">
                                    <button class="button" onclick="runCheck('\${check.id}')">
                                        Run Check
                                    </button>
                                </div>
                            </div>
                        \`;
                    }
                }

                function updatePolicy(policy) {
                    const policyElement = document.querySelector(\`[data-policy-id="\${policy.id}"]\`);
                    if (policyElement) {
                        policyElement.outerHTML = \`
                            <div class="policy-card" data-policy-id="\${policy.id}">
                                <h4>\${policy.name}</h4>
                                <div>\${policy.description}</div>
                                <ul class="requirement-list">
                                    \${policy.requirements.map(req => \`
                                        <li>\${req}</li>
                                    \`).join('')}
                                </ul>
                                <div class="meta-info">
                                    Category: \${policy.category}
                                    · Status: \${policy.enforced ? 'Enforced' : 'Not Enforced'}
                                </div>
                                \${!policy.enforced ? \`
                                    <button class="button" onclick="enablePolicy('\${policy.id}')">
                                        Enable Policy
                                    </button>
                                \` : ''}
                            </div>
                        \`;
                    }
                }
            </script>
        </body>
        </html>`;
    }

    private getComplianceChecksHtml(category: string): string {
        const checks = this.options.checks.filter(check => check.category === category);

        if (checks.length === 0) {
            return '<p>No checks found for this category.</p>';
        }

        return checks.map(check => `
            <div class="check-card" data-check-id="${check.id}">
                <div class="check-header">
                    <span class="severity-badge severity-${check.severity}">
                        ${check.severity}
                    </span>
                    <span class="status-badge status-${check.status}">
                        ${check.status}
                    </span>
                    <h4>${check.name}</h4>
                </div>
                <div class="check-details">
                    <div>${check.description}</div>
                    ${check.remediation ? `
                        <div class="remediation">
                            Remediation: ${check.remediation}
                        </div>
                    ` : ''}
                </div>
                <div class="check-meta">
                    Last checked: ${new Date(check.lastChecked).toLocaleString()}
                </div>
                <div class="check-actions">
                    <button class="button" onclick="runCheck('${check.id}')">
                        Run Check
                    </button>
                </div>
            </div>
        `).join('\\n');
    }

    private getCompliancePoliciesHtml(): string {
        return this.options.policies.map(policy => `
            <div class="policy-card" data-policy-id="${policy.id}">
                <h4>${policy.name}</h4>
                <div>${policy.description}</div>
                <ul class="requirement-list">
                    ${policy.requirements.map(req => `
                        <li>${req}</li>
                    `).join('\\n')}
                </ul>
                <div class="meta-info">
                    Category: ${policy.category}
                    · Status: ${policy.enforced ? 'Enforced' : 'Not Enforced'}
                </div>
                ${!policy.enforced ? `
                    <button class="button" onclick="enablePolicy('${policy.id}')">
                        Enable Policy
                    </button>
                ` : ''}
            </div>
        `).join('\\n');
    }

    public dispose(): void {
        this.panel?.dispose();
    }
}
