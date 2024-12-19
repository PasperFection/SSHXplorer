import * as vscode from 'vscode';
import {
    SecurityAlert,
    CodeScanningAlert,
    SecretScanningAlert
} from './securityManager';

interface SecurityViewOptions {
    owner: string;
    repo: string;
    dependencyAlerts: SecurityAlert[];
    codeScanningAlerts: CodeScanningAlert[];
    secretScanningAlerts: SecretScanningAlert[];
}

export class SecurityWebview {
    private panel: vscode.WebviewPanel | undefined;
    private options: SecurityViewOptions;

    constructor(
        private readonly extensionUri: vscode.Uri,
        options: SecurityViewOptions,
        private readonly onAction: (action: any) => Promise<void>
    ) {
        this.options = options;
    }

    public async show(): Promise<void> {
        this.panel = vscode.window.createWebviewPanel(
            'githubSecurity',
            'Security Overview',
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

    public update(options: Partial<SecurityViewOptions>): void {
        this.options = { ...this.options, ...options };
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'updateData',
                data: options
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
            <title>Security Overview</title>
            <style>
                .security-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    padding: 20px;
                }
                .security-card {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                    padding: 15px;
                }
                .alert-card {
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
                .severity-moderate {
                    background: #ffd93d;
                    color: var(--vscode-editor-foreground);
                }
                .severity-low {
                    background: var(--vscode-testing-iconSkipped);
                    color: var(--vscode-editor-background);
                }
                .alert-meta {
                    margin: 5px 0;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                .alert-actions {
                    margin-top: 10px;
                    display: flex;
                    gap: 10px;
                }
                .security-summary {
                    margin-bottom: 20px;
                    padding: 15px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .summary-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 5px 0;
                }
                .summary-count {
                    font-size: 24px;
                    font-weight: bold;
                }
                .location-link {
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                    cursor: pointer;
                }
                .location-link:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Security Overview for ${this.options.owner}/${this.options.repo}</h2>
                    <div class="header-actions">
                        <button class="button" onclick="enableSecurity()">
                            Enable Security Features
                        </button>
                        <button class="button" onclick="refresh()">
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="security-summary">
                    <h3>Summary</h3>
                    <div class="summary-item">
                        <div class="summary-count">${this.options.dependencyAlerts.length}</div>
                        <div>Dependency Vulnerabilities</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-count">${this.options.codeScanningAlerts.length}</div>
                        <div>Code Scanning Alerts</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-count">${this.options.secretScanningAlerts.length}</div>
                        <div>Secret Scanning Alerts</div>
                    </div>
                </div>

                <div class="security-grid">
                    <div class="security-card">
                        <h3>Dependency Vulnerabilities</h3>
                        ${this.getDependencyAlertsHtml()}
                    </div>

                    <div class="security-card">
                        <h3>Code Scanning Alerts</h3>
                        ${this.getCodeScanningAlertsHtml()}
                    </div>

                    <div class="security-card">
                        <h3>Secret Scanning Alerts</h3>
                        ${this.getSecretScanningAlertsHtml()}
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function enableSecurity() {
                    const features = [
                        'Dependency Alerts',
                        'Automated Security Fixes',
                        'Code Scanning',
                        'Secret Scanning'
                    ];
                    
                    const selected = prompt(
                        'Select security features to enable (comma-separated):\\n' +
                        features.map((f, i) => \`\${i + 1}. \${f}\`).join('\\n')
                    );

                    if (!selected) return;

                    const selectedFeatures = selected.split(',').map(s => s.trim());
                    
                    selectedFeatures.forEach(feature => {
                        switch (feature) {
                            case '1':
                                vscode.postMessage({ type: 'enableDependencyAlerts' });
                                break;
                            case '2':
                                vscode.postMessage({ type: 'enableAutomatedFixes' });
                                break;
                            case '3':
                                vscode.postMessage({ type: 'enableCodeScanning' });
                                break;
                            case '4':
                                vscode.postMessage({ type: 'enableSecretScanning' });
                                break;
                        }
                    });
                }

                function dismissDependencyAlert(alertNumber) {
                    const reasons = [
                        'fix_started',
                        'no_bandwidth',
                        'tolerable_risk',
                        'inaccurate'
                    ];

                    const reason = prompt(
                        'Select dismissal reason:\\n' +
                        reasons.map((r, i) => \`\${i + 1}. \${r}\`).join('\\n')
                    );

                    if (!reason || !reasons[parseInt(reason) - 1]) return;

                    const comment = prompt('Enter dismissal comment (optional):');

                    vscode.postMessage({
                        type: 'dismissDependencyAlert',
                        alertNumber,
                        dismissReason: reasons[parseInt(reason) - 1],
                        dismissComment: comment
                    });
                }

                function dismissCodeScanningAlert(alertNumber) {
                    const reasons = [
                        'false_positive',
                        'won\\'t_fix',
                        'used_in_tests'
                    ];

                    const reason = prompt(
                        'Select dismissal reason:\\n' +
                        reasons.map((r, i) => \`\${i + 1}. \${r}\`).join('\\n')
                    );

                    if (!reason || !reasons[parseInt(reason) - 1]) return;

                    const comment = prompt('Enter dismissal comment (optional):');

                    vscode.postMessage({
                        type: 'dismissCodeScanningAlert',
                        alertNumber,
                        dismissReason: reasons[parseInt(reason) - 1],
                        dismissComment: comment
                    });
                }

                function resolveSecretAlert(alertNumber) {
                    const resolutions = [
                        'false_positive',
                        'wont_fix',
                        'revoked',
                        'used_in_tests'
                    ];

                    const resolution = prompt(
                        'Select resolution:\\n' +
                        resolutions.map((r, i) => \`\${i + 1}. \${r}\`).join('\\n')
                    );

                    if (!resolution || !resolutions[parseInt(resolution) - 1]) return;

                    vscode.postMessage({
                        type: 'resolveSecretAlert',
                        alertNumber,
                        resolution: resolutions[parseInt(resolution) - 1]
                    });
                }

                function refresh() {
                    vscode.postMessage({ type: 'refresh' });
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'updateData') {
                        updateContent(message.data);
                    }
                });

                function updateContent(data) {
                    // Update summary counts
                    const summaryItems = document.querySelectorAll('.summary-count');
                    if (data.dependencyAlerts) {
                        summaryItems[0].textContent = data.dependencyAlerts.length;
                    }
                    if (data.codeScanningAlerts) {
                        summaryItems[1].textContent = data.codeScanningAlerts.length;
                    }
                    if (data.secretScanningAlerts) {
                        summaryItems[2].textContent = data.secretScanningAlerts.length;
                    }

                    // Update alert sections
                    const securityCards = document.querySelectorAll('.security-card');
                    if (data.dependencyAlerts) {
                        securityCards[0].innerHTML = \`
                            <h3>Dependency Vulnerabilities</h3>
                            ${this.getDependencyAlertsHtml().replace(/`/g, '\\`')}
                        \`;
                    }
                    if (data.codeScanningAlerts) {
                        securityCards[1].innerHTML = \`
                            <h3>Code Scanning Alerts</h3>
                            ${this.getCodeScanningAlertsHtml().replace(/`/g, '\\`')}
                        \`;
                    }
                    if (data.secretScanningAlerts) {
                        securityCards[2].innerHTML = \`
                            <h3>Secret Scanning Alerts</h3>
                            ${this.getSecretScanningAlertsHtml().replace(/`/g, '\\`')}
                        \`;
                    }
                }
            </script>
        </body>
        </html>`;
    }

    private getDependencyAlertsHtml(): string {
        if (this.options.dependencyAlerts.length === 0) {
            return '<p>No dependency vulnerabilities found.</p>';
        }

        return this.options.dependencyAlerts.map(alert => `
            <div class="alert-card">
                <div class="alert-header">
                    <span class="severity-badge severity-${alert.securityVulnerability.severity}">
                        ${alert.securityVulnerability.severity}
                    </span>
                    <h4>${alert.securityVulnerability.package.name}</h4>
                </div>
                <div class="alert-meta">
                    <div>${alert.securityVulnerability.summary}</div>
                    <div>Vulnerable versions: ${alert.affectedRange}</div>
                    ${alert.fixedIn ? `<div>Fixed in: ${alert.fixedIn}</div>` : ''}
                    <div>Manifest: ${alert.manifestPath}</div>
                </div>
                <div class="alert-actions">
                    <button class="button" onclick="dismissDependencyAlert(${alert.id})">
                        Dismiss
                    </button>
                </div>
            </div>
        `).join('\\n');
    }

    private getCodeScanningAlertsHtml(): string {
        if (this.options.codeScanningAlerts.length === 0) {
            return '<p>No code scanning alerts found.</p>';
        }

        return this.options.codeScanningAlerts.map(alert => `
            <div class="alert-card">
                <div class="alert-header">
                    <span class="severity-badge severity-${alert.rule.severity}">
                        ${alert.rule.severity}
                    </span>
                    <h4>${alert.rule.description}</h4>
                </div>
                <div class="alert-meta">
                    <div>Tool: ${alert.tool.name} v${alert.tool.version}</div>
                    <div class="location-link" onclick="vscode.postMessage({
                        command: 'openFile',
                        file: '${alert.mostRecentInstance.location.path}',
                        line: ${alert.mostRecentInstance.location.startLine}
                    })">
                        ${alert.mostRecentInstance.location.path}:${alert.mostRecentInstance.location.startLine}
                    </div>
                    <div>Message: ${alert.mostRecentInstance.message}</div>
                </div>
                <div class="alert-actions">
                    <button class="button" onclick="dismissCodeScanningAlert(${alert.number})">
                        Dismiss
                    </button>
                </div>
            </div>
        `).join('\\n');
    }

    private getSecretScanningAlertsHtml(): string {
        if (this.options.secretScanningAlerts.length === 0) {
            return '<p>No secret scanning alerts found.</p>';
        }

        return this.options.secretScanningAlerts.map(alert => `
            <div class="alert-card">
                <div class="alert-header">
                    <h4>${alert.secret_type}</h4>
                </div>
                <div class="alert-meta">
                    <div>Locations:</div>
                    ${alert.locations.map(location => `
                        <div class="location-link" onclick="vscode.postMessage({
                            command: 'openFile',
                            file: '${location.path}',
                            line: ${location.startLine}
                        })">
                            ${location.path}:${location.startLine}
                        </div>
                    `).join('\\n')}
                </div>
                <div class="alert-actions">
                    <button class="button" onclick="resolveSecretAlert(${alert.number})">
                        Resolve
                    </button>
                </div>
            </div>
        `).join('\\n');
    }

    public dispose(): void {
        this.panel?.dispose();
    }
}
