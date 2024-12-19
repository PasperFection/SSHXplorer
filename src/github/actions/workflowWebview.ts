import * as vscode from 'vscode';
import { Workflow, WorkflowRun, Job } from './workflowManager';

interface WorkflowViewOptions {
    workflows: Workflow[];
    runs: WorkflowRun[];
    owner: string;
    repo: string;
}

export class WorkflowWebview {
    private panel: vscode.WebviewPanel | undefined;
    private options: WorkflowViewOptions;

    constructor(
        private readonly extensionUri: vscode.Uri,
        options: WorkflowViewOptions,
        private readonly onAction: (action: any) => Promise<void>
    ) {
        this.options = options;
    }

    public async show(): Promise<void> {
        this.panel = vscode.window.createWebviewPanel(
            'githubActions',
            'GitHub Actions',
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

    public update(options: Partial<WorkflowViewOptions>): void {
        this.options = { ...this.options, ...options };
        if (this.panel) {
            this.panel.webview.html = this.getWebviewContent();
        }
    }

    public updateRuns(runs: WorkflowRun[]): void {
        this.options.runs = runs;
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'updateRuns',
                runs: runs
            });
        }
    }

    public showJobs(jobs: Job[]): void {
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'showJobs',
                jobs: jobs
            });
        }
    }

    private getWebviewContent(): string {
        const styleUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'github', 'style.css')
        );

        const workflowsHtml = this.options.workflows.map(workflow => `
            <div class="workflow-item" data-id="${workflow.id}">
                <div class="workflow-header">
                    <h3>${workflow.name}</h3>
                    <div class="workflow-meta">
                        <span class="filename">${workflow.path}</span>
                        <span class="state ${workflow.state}">${workflow.state}</span>
                    </div>
                </div>
                <div class="workflow-actions">
                    <button class="button" onclick="triggerWorkflow(${workflow.id})">
                        Run workflow
                    </button>
                    <button class="button" onclick="viewWorkflowRuns(${workflow.id})">
                        View runs
                    </button>
                </div>
            </div>
        `).join('\\n');

        const runsHtml = this.options.runs.map(run => `
            <div class="run-item" data-id="${run.id}">
                <div class="run-header">
                    <div class="run-info">
                        <span class="run-name">${run.name}</span>
                        <span class="run-branch">${run.head_branch}</span>
                        <span class="run-event">${run.event}</span>
                    </div>
                    <div class="run-status ${run.status} ${run.conclusion || ''}">
                        ${this.getStatusIcon(run.status, run.conclusion)}
                        ${run.status}${run.conclusion ? ` - ${run.conclusion}` : ''}
                    </div>
                </div>
                <div class="run-meta">
                    <span>Started: ${new Date(run.created_at).toLocaleString()}</span>
                    ${run.updated_at ? 
                        `<span>Updated: ${new Date(run.updated_at).toLocaleString()}</span>` : 
                        ''}
                </div>
                <div class="run-actions">
                    <button class="button" onclick="viewJobs(${run.id})">
                        View jobs
                    </button>
                    ${run.status === 'in_progress' ? `
                        <button class="button" onclick="cancelRun(${run.id})">
                            Cancel
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('\\n');

        return `<!DOCTYPE html>
        <html>
        <head>
            <link href="${styleUri}" rel="stylesheet">
            <title>GitHub Actions</title>
            <style>
                .workflow-item, .run-item {
                    margin: 10px 0;
                    padding: 15px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .workflow-header, .run-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                .workflow-meta, .run-meta {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                .workflow-actions, .run-actions {
                    margin-top: 10px;
                    display: flex;
                    gap: 8px;
                }
                .state, .run-status {
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 12px;
                }
                .state.active {
                    background: var(--vscode-testing-iconPassed);
                    color: var(--vscode-testing-runAction);
                }
                .run-status {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .run-status.in_progress {
                    color: var(--vscode-testing-iconUnset);
                }
                .run-status.completed.success {
                    color: var(--vscode-testing-iconPassed);
                }
                .run-status.completed.failure {
                    color: var(--vscode-testing-iconFailed);
                }
                .run-branch, .run-event {
                    background: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 12px;
                    margin-left: 8px;
                }
                .jobs-view {
                    display: none;
                    margin-top: 20px;
                }
                .job-item {
                    margin: 10px 0;
                    padding: 10px;
                    background: var(--vscode-editor-background);
                    border-radius: 4px;
                }
                .step-item {
                    margin: 5px 0;
                    padding: 5px 10px;
                    border-left: 2px solid var(--vscode-widget-border);
                }
                .step-item.success {
                    border-left-color: var(--vscode-testing-iconPassed);
                }
                .step-item.failure {
                    border-left-color: var(--vscode-testing-iconFailed);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>GitHub Actions</h2>
                    <div class="repo-info">
                        ${this.options.owner}/${this.options.repo}
                    </div>
                    <button class="button" onclick="refresh()">
                        Refresh
                    </button>
                </div>

                <div class="workflows-section">
                    <h3>Workflows</h3>
                    ${workflowsHtml}
                </div>

                <div class="runs-section">
                    <h3>Recent Runs</h3>
                    ${runsHtml}
                </div>

                <div id="jobsView" class="jobs-view">
                    <h3>Jobs</h3>
                    <div id="jobsList"></div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function triggerWorkflow(workflowId) {
                    vscode.postMessage({
                        type: 'trigger',
                        workflow_id: workflowId,
                        ref: 'main'  // Could make this configurable
                    });
                }

                function viewWorkflowRuns(workflowId) {
                    vscode.postMessage({
                        type: 'viewRuns',
                        workflow_id: workflowId
                    });
                }

                function viewJobs(runId) {
                    vscode.postMessage({
                        type: 'viewJobs',
                        run_id: runId
                    });
                }

                function cancelRun(runId) {
                    vscode.postMessage({
                        type: 'cancel',
                        run_id: runId
                    });
                }

                function refresh() {
                    vscode.postMessage({ type: 'refresh' });
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'updateRuns':
                            updateRunsList(message.runs);
                            break;
                        case 'showJobs':
                            showJobsList(message.jobs);
                            break;
                    }
                });

                function updateRunsList(runs) {
                    // Implementation to update runs list dynamically
                }

                function showJobsList(jobs) {
                    const jobsView = document.getElementById('jobsView');
                    const jobsList = document.getElementById('jobsList');
                    
                    jobsList.innerHTML = jobs.map(job => \`
                        <div class="job-item">
                            <div class="job-header">
                                <span class="job-name">\${job.name}</span>
                                <span class="job-status \${job.conclusion || job.status}">
                                    \${job.status}\${job.conclusion ? \` - \${job.conclusion}\` : ''}
                                </span>
                            </div>
                            <div class="job-steps">
                                \${job.steps.map(step => \`
                                    <div class="step-item \${step.conclusion || step.status}">
                                        <span class="step-name">\${step.name}</span>
                                        <span class="step-status">
                                            \${step.status}\${step.conclusion ? \` - \${step.conclusion}\` : ''}
                                        </span>
                                    </div>
                                \`).join('')}
                            </div>
                        </div>
                    \`).join('');
                    
                    jobsView.style.display = 'block';
                }
            </script>
        </body>
        </html>`;
    }

    private getStatusIcon(status: string, conclusion?: string): string {
        switch (status) {
            case 'in_progress':
                return '$(sync~spin)';
            case 'completed':
                switch (conclusion) {
                    case 'success':
                        return '$(check)';
                    case 'failure':
                        return '$(x)';
                    case 'cancelled':
                        return '$(circle-slash)';
                    default:
                        return '$(circle-outline)';
                }
            default:
                return '$(circle-outline)';
        }
    }

    public dispose(): void {
        this.panel?.dispose();
    }
}
