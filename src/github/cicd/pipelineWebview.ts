import * as vscode from 'vscode';
import {
    WorkflowRun,
    PipelineMetrics
} from './pipelineManager';

interface PipelineViewOptions {
    owner: string;
    repo: string;
    runs: WorkflowRun[];
    metrics: PipelineMetrics;
}

export class PipelineWebview {
    private panel: vscode.WebviewPanel | undefined;
    private options: PipelineViewOptions;

    constructor(
        private readonly extensionUri: vscode.Uri,
        options: PipelineViewOptions,
        private readonly onAction: (action: any) => Promise<void>
    ) {
        this.options = options;
    }

    public async show(): Promise<void> {
        this.panel = vscode.window.createWebviewPanel(
            'githubPipeline',
            'Pipeline Analytics',
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

    public update(options: Partial<PipelineViewOptions>): void {
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
        const chartJsUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'chart.js')
        );

        return `<!DOCTYPE html>
        <html>
        <head>
            <link href="${styleUri}" rel="stylesheet">
            <script src="${chartJsUri}"></script>
            <title>Pipeline Analytics</title>
            <style>
                .pipeline-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    padding: 20px;
                }
                .pipeline-card {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                    padding: 15px;
                }
                .run-card {
                    margin: 10px 0;
                    padding: 10px;
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .status-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .status-success {
                    background: var(--vscode-testing-iconPassed);
                    color: var(--vscode-editor-background);
                }
                .status-failure {
                    background: var(--vscode-testing-iconFailed);
                    color: var(--vscode-editor-background);
                }
                .status-pending {
                    background: var(--vscode-testing-iconQueued);
                    color: var(--vscode-editor-background);
                }
                .job-list {
                    margin-left: 20px;
                }
                .step-list {
                    margin-left: 40px;
                }
                .metric-value {
                    font-size: 24px;
                    font-weight: bold;
                }
                .chart-container {
                    height: 300px;
                    margin: 20px 0;
                }
                .branch-list {
                    margin: 10px 0;
                }
                .failure-list {
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Pipeline Analytics for ${this.options.owner}/${this.options.repo}</h2>
                    <div class="header-actions">
                        <button class="button" onclick="refresh()">
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="pipeline-grid">
                    <div class="pipeline-card">
                        <h3>Overview</h3>
                        <div>
                            <div class="metric-item">
                                <div class="metric-label">Total Runs</div>
                                <div class="metric-value">${this.options.metrics.totalRuns}</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">Success Rate</div>
                                <div class="metric-value">${this.options.metrics.successRate.toFixed(1)}%</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">Average Duration</div>
                                <div class="metric-value">${formatDuration(this.options.metrics.averageDuration)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="pipeline-card">
                        <h3>Timeline</h3>
                        <div class="chart-container">
                            <canvas id="timelineChart"></canvas>
                        </div>
                    </div>

                    <div class="pipeline-card">
                        <h3>Branch Coverage</h3>
                        <div class="branch-list">
                            ${Object.entries(this.options.metrics.branchCoverage)
                                .map(([branch, count]) => `
                                    <div class="branch-item">
                                        <span>${branch}</span>
                                        <span class="count">${count} runs</span>
                                    </div>
                                `).join('\\n')
                            }
                        </div>
                    </div>

                    <div class="pipeline-card">
                        <h3>Common Failures</h3>
                        <div class="failure-list">
                            ${Object.entries(this.options.metrics.commonFailures)
                                .map(([job, count]) => `
                                    <div class="failure-item">
                                        <span>${job}</span>
                                        <span class="count">${count} failures</span>
                                    </div>
                                `).join('\\n')
                            }
                        </div>
                    </div>
                </div>

                <div class="pipeline-runs">
                    <h3>Recent Workflow Runs</h3>
                    ${this.getWorkflowRunsHtml()}
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function rerunWorkflow(runId) {
                    vscode.postMessage({
                        type: 'rerunWorkflow',
                        runId
                    });
                }

                function cancelWorkflow(runId) {
                    vscode.postMessage({
                        type: 'cancelWorkflow',
                        runId
                    });
                }

                function viewLogs(runId, jobId) {
                    vscode.postMessage({
                        type: 'viewLogs',
                        runId,
                        jobId
                    });
                }

                function refresh() {
                    vscode.postMessage({
                        type: 'refresh'
                    });
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'updateData') {
                        updateContent(message.data);
                    }
                });

                function updateContent(data) {
                    if (data.metrics) {
                        // Update overview metrics
                        document.querySelector('.metric-value:nth-child(1)').textContent = 
                            data.metrics.totalRuns;
                        document.querySelector('.metric-value:nth-child(2)').textContent = 
                            \`\${data.metrics.successRate.toFixed(1)}%\`;
                        document.querySelector('.metric-value:nth-child(3)').textContent = 
                            formatDuration(data.metrics.averageDuration);

                        // Update timeline chart
                        updateTimelineChart(data.metrics.timelineData);

                        // Update branch coverage
                        const branchList = document.querySelector('.branch-list');
                        branchList.innerHTML = Object.entries(data.metrics.branchCoverage)
                            .map(([branch, count]) => \`
                                <div class="branch-item">
                                    <span>\${branch}</span>
                                    <span class="count">\${count} runs</span>
                                </div>
                            \`).join('\\n');

                        // Update common failures
                        const failureList = document.querySelector('.failure-list');
                        failureList.innerHTML = Object.entries(data.metrics.commonFailures)
                            .map(([job, count]) => \`
                                <div class="failure-item">
                                    <span>\${job}</span>
                                    <span class="count">\${count} failures</span>
                                </div>
                            \`).join('\\n');
                    }

                    if (data.runs) {
                        // Update workflow runs
                        const runsContainer = document.querySelector('.pipeline-runs');
                        runsContainer.innerHTML = \`
                            <h3>Recent Workflow Runs</h3>
                            ${this.getWorkflowRunsHtml().replace(/`/g, '\\`')}
                        \`;
                    }
                }

                // Initialize timeline chart
                const timelineCtx = document.getElementById('timelineChart').getContext('2d');
                const timelineChart = new Chart(timelineCtx, {
                    type: 'line',
                    data: {
                        labels: ${JSON.stringify(this.options.metrics.timelineData.labels)},
                        datasets: [
                            {
                                label: 'Success',
                                data: ${JSON.stringify(this.options.metrics.timelineData.success)},
                                borderColor: '#4CAF50',
                                backgroundColor: 'rgba(76, 175, 80, 0.1)'
                            },
                            {
                                label: 'Failure',
                                data: ${JSON.stringify(this.options.metrics.timelineData.failure)},
                                borderColor: '#F44336',
                                backgroundColor: 'rgba(244, 67, 54, 0.1)'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });

                function updateTimelineChart(data) {
                    timelineChart.data.labels = data.labels;
                    timelineChart.data.datasets[0].data = data.success;
                    timelineChart.data.datasets[1].data = data.failure;
                    timelineChart.update();
                }

                function formatDuration(ms) {
                    const seconds = Math.floor(ms / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);

                    if (hours > 0) {
                        return \`\${hours}h \${minutes % 60}m\`;
                    } else if (minutes > 0) {
                        return \`\${minutes}m \${seconds % 60}s\`;
                    } else {
                        return \`\${seconds}s\`;
                    }
                }
            </script>
        </body>
        </html>`;
    }

    private getWorkflowRunsHtml(): string {
        return this.options.runs.map(run => `
            <div class="run-card">
                <div class="run-header">
                    <span class="status-badge status-${run.conclusion}">
                        ${run.conclusion}
                    </span>
                    <h4>${run.name}</h4>
                </div>
                <div class="run-meta">
                    <div>Branch: ${run.branch}</div>
                    <div>Commit: ${run.commit.substring(0, 7)}</div>
                    <div>Started: ${new Date(run.startedAt).toLocaleString()}</div>
                    ${run.completedAt ? `
                        <div>Completed: ${new Date(run.completedAt).toLocaleString()}</div>
                        <div>Duration: ${formatDuration(run.duration)}</div>
                    ` : ''}
                </div>
                <div class="job-list">
                    ${run.jobs.map(job => `
                        <div class="job-item">
                            <span class="status-badge status-${job.conclusion}">
                                ${job.conclusion}
                            </span>
                            <span>${job.name}</span>
                            <button class="button" onclick="viewLogs(${run.id}, ${job.id})">
                                View Logs
                            </button>
                            <div class="step-list">
                                ${job.steps.map(step => `
                                    <div class="step-item">
                                        <span class="status-badge status-${step.conclusion}">
                                            ${step.conclusion}
                                        </span>
                                        <span>${step.name}</span>
                                    </div>
                                `).join('\\n')}
                            </div>
                        </div>
                    `).join('\\n')}
                </div>
                <div class="run-actions">
                    ${run.status === 'completed' ? `
                        <button class="button" onclick="rerunWorkflow(${run.id})">
                            Rerun
                        </button>
                    ` : `
                        <button class="button" onclick="cancelWorkflow(${run.id})">
                            Cancel
                        </button>
                    `}
                </div>
            </div>
        `).join('\\n');
    }

    public dispose(): void {
        this.panel?.dispose();
    }
}

function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}
