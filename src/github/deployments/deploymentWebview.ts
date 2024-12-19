import * as vscode from 'vscode';
import {
    Deployment,
    DeploymentStatus,
    Environment
} from './deploymentManager';

interface DeploymentViewOptions {
    owner: string;
    repo: string;
    deployments: Deployment[];
    deploymentStatuses: DeploymentStatus[][];
    environments: Environment[];
}

export class DeploymentWebview {
    private panel: vscode.WebviewPanel | undefined;
    private options: DeploymentViewOptions;

    constructor(
        private readonly extensionUri: vscode.Uri,
        options: DeploymentViewOptions,
        private readonly onAction: (action: any) => Promise<void>
    ) {
        this.options = options;
    }

    public async show(): Promise<void> {
        this.panel = vscode.window.createWebviewPanel(
            'githubDeployments',
            'Deployments',
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

    public update(options: Partial<DeploymentViewOptions>): void {
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
            <title>Deployments</title>
            <style>
                .deployment-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    padding: 20px;
                }
                .deployment-card {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                    padding: 15px;
                }
                .status-badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .status-success {
                    background: var(--vscode-testing-iconPassed);
                    color: var(--vscode-editor-background);
                }
                .status-error, .status-failure {
                    background: var(--vscode-testing-iconFailed);
                    color: var(--vscode-editor-background);
                }
                .status-pending, .status-queued {
                    background: var(--vscode-testing-iconQueued);
                    color: var(--vscode-editor-background);
                }
                .status-in_progress {
                    background: var(--vscode-progressBar-background);
                    color: var(--vscode-editor-background);
                }
                .environment-section {
                    margin-top: 20px;
                }
                .environment-card {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                    padding: 15px;
                    margin-bottom: 10px;
                }
                .deployment-actions {
                    margin-top: 10px;
                    display: flex;
                    gap: 10px;
                }
                .deployment-meta {
                    margin: 10px 0;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                .deployment-history {
                    margin-top: 10px;
                    border-top: 1px solid var(--vscode-widget-border);
                    padding-top: 10px;
                }
                .history-item {
                    margin: 5px 0;
                    padding: 5px;
                    border-radius: 4px;
                    background: var(--vscode-editor-background);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Deployments for ${this.options.owner}/${this.options.repo}</h2>
                    <div class="header-actions">
                        <button class="button" onclick="createDeployment()">
                            Create Deployment
                        </button>
                        <button class="button" onclick="createEnvironment()">
                            Create Environment
                        </button>
                        <button class="button" onclick="refresh()">
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="environment-section">
                    <h3>Environments</h3>
                    <div class="environment-grid">
                        ${this.getEnvironmentsHtml()}
                    </div>
                </div>

                <div class="deployment-section">
                    <h3>Recent Deployments</h3>
                    <div class="deployment-grid">
                        ${this.getDeploymentsHtml()}
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function createDeployment() {
                    const environments = ${JSON.stringify(this.options.environments.map(e => e.name))};
                    const env = prompt('Select environment: ' + environments.join(', '));
                    if (!env || !environments.includes(env)) {
                        alert('Invalid environment');
                        return;
                    }

                    const ref = prompt('Enter branch or commit SHA:');
                    if (!ref) return;

                    vscode.postMessage({
                        type: 'createDeployment',
                        options: {
                            ref,
                            task: 'deploy',
                            environment: env,
                            description: prompt('Enter deployment description (optional):'),
                            transient_environment: false,
                            production_environment: env === 'production'
                        }
                    });
                }

                function createEnvironment() {
                    const name = prompt('Enter environment name:');
                    if (!name) return;

                    const waitTimer = parseInt(prompt('Enter wait timer in minutes (optional):') || '0');
                    
                    vscode.postMessage({
                        type: 'createEnvironment',
                        options: {
                            name,
                            wait_timer: waitTimer * 60,
                            deployment_branch_policy: {
                                protected_branches: true,
                                custom_branch_policies: false
                            }
                        }
                    });
                }

                function deleteEnvironment(name) {
                    if (confirm(\`Are you sure you want to delete environment "\${name}"?\`)) {
                        vscode.postMessage({
                            type: 'deleteEnvironment',
                            environment_name: name
                        });
                    }
                }

                function updateDeploymentStatus(deploymentId) {
                    const states = [
                        'success',
                        'error',
                        'failure',
                        'inactive',
                        'in_progress',
                        'queued',
                        'pending'
                    ];
                    
                    const state = prompt('Enter new status: ' + states.join(', '));
                    if (!state || !states.includes(state)) {
                        alert('Invalid status');
                        return;
                    }

                    vscode.postMessage({
                        type: 'updateStatus',
                        deployment_id: deploymentId,
                        options: {
                            state,
                            description: prompt('Enter status description (optional):'),
                            environment_url: prompt('Enter environment URL (optional):'),
                            log_url: prompt('Enter log URL (optional):')
                        }
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
                    const environmentGrid = document.querySelector('.environment-grid');
                    if (data.environments) {
                        environmentGrid.innerHTML = \`${this.getEnvironmentsHtml().replace(/`/g, '\\`')}\`;
                    }

                    const deploymentGrid = document.querySelector('.deployment-grid');
                    if (data.deployments) {
                        deploymentGrid.innerHTML = \`${this.getDeploymentsHtml().replace(/`/g, '\\`')}\`;
                    }
                }
            </script>
        </body>
        </html>`;
    }

    private getEnvironmentsHtml(): string {
        return this.options.environments.map(env => `
            <div class="environment-card">
                <div class="environment-header">
                    <h4>${env.name}</h4>
                    ${env.url ? `<a href="${env.url}" target="_blank">${env.url}</a>` : ''}
                </div>
                <div class="environment-meta">
                    ${this.getEnvironmentProtectionHtml(env)}
                </div>
                <div class="environment-actions">
                    <button class="button" onclick="deleteEnvironment('${env.name}')">
                        Delete
                    </button>
                </div>
            </div>
        `).join('\\n');
    }

    private getEnvironmentProtectionHtml(env: Environment): string {
        const rules = [];

        if (env.protection_rules) {
            for (const rule of env.protection_rules) {
                if (rule.type === 'wait_timer' && rule.wait_timer) {
                    rules.push(`Wait ${rule.wait_timer / 60} minutes before deployment`);
                }
                if (rule.type === 'required_reviewers' && rule.reviewers) {
                    const reviewers = rule.reviewers
                        .map(r => r.reviewer.login)
                        .join(', ');
                    rules.push(`Required reviewers: ${reviewers}`);
                }
            }
        }

        if (env.deployment_branch_policy) {
            if (env.deployment_branch_policy.protected_branches) {
                rules.push('Protected branches only');
            }
            if (env.deployment_branch_policy.custom_branch_policies) {
                rules.push('Custom branch policies');
            }
        }

        return rules.length ? rules.join('\\n') : 'No protection rules';
    }

    private getDeploymentsHtml(): string {
        return this.options.deployments.map((deployment, index) => {
            const statuses = this.options.deploymentStatuses[index] || [];
            const latestStatus = statuses[0];

            return `
                <div class="deployment-card">
                    <div class="deployment-header">
                        <h4>Deployment to ${deployment.environment}</h4>
                        ${latestStatus ? `
                            <span class="status-badge status-${latestStatus.state}">
                                ${latestStatus.state}
                            </span>
                        ` : ''}
                    </div>
                    <div class="deployment-meta">
                        <div>Ref: ${deployment.ref}</div>
                        <div>Created by ${deployment.creator.login}</div>
                        <div>Created at ${new Date(deployment.created_at).toLocaleString()}</div>
                        ${deployment.description ? `<div>${deployment.description}</div>` : ''}
                    </div>
                    <div class="deployment-actions">
                        <button class="button" onclick="updateDeploymentStatus(${deployment.id})">
                            Update Status
                        </button>
                    </div>
                    ${this.getDeploymentHistoryHtml(statuses)}
                </div>
            `;
        }).join('\\n');
    }

    private getDeploymentHistoryHtml(statuses: DeploymentStatus[]): string {
        if (!statuses.length) return '';

        return `
            <div class="deployment-history">
                <h5>Status History</h5>
                ${statuses.map(status => `
                    <div class="history-item">
                        <span class="status-badge status-${status.state}">
                            ${status.state}
                        </span>
                        <div class="status-meta">
                            ${status.description || ''}
                            <div>
                                By ${status.creator.login}
                                at ${new Date(status.created_at).toLocaleString()}
                            </div>
                            ${status.environment_url ? `
                                <div>
                                    <a href="${status.environment_url}" target="_blank">
                                        View deployment
                                    </a>
                                </div>
                            ` : ''}
                            ${status.log_url ? `
                                <div>
                                    <a href="${status.log_url}" target="_blank">
                                        View logs
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('\\n')}
            </div>
        `;
    }

    public dispose(): void {
        this.panel?.dispose();
    }
}
