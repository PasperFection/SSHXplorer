import * as vscode from 'vscode';
import {
    CommitActivity,
    CodeFrequency,
    PunchCard,
    RepositoryTraffic,
    ContributorStats
} from './analyticsManager';

interface AnalyticsViewOptions {
    owner: string;
    repo: string;
    commitActivity: CommitActivity[];
    codeFrequency: CodeFrequency[];
    punchCard: PunchCard[];
    traffic: RepositoryTraffic;
    contributorStats: ContributorStats[];
}

export class AnalyticsWebview {
    private panel: vscode.WebviewPanel | undefined;
    private options: AnalyticsViewOptions;

    constructor(
        private readonly extensionUri: vscode.Uri,
        options: AnalyticsViewOptions,
        private readonly onAction: (action: any) => Promise<void>
    ) {
        this.options = options;
    }

    public async show(): Promise<void> {
        this.panel = vscode.window.createWebviewPanel(
            'githubAnalytics',
            'Repository Analytics',
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

    public update(options: Partial<AnalyticsViewOptions>): void {
        this.options = { ...this.options, ...options };
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'updateData',
                data: options
            });
        }
    }

    public updateLanguages(languages: Record<string, number>): void {
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'updateLanguages',
                languages
            });
        }
    }

    public updateTopPaths(paths: any[]): void {
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'updateTopPaths',
                paths
            });
        }
    }

    public updateTopReferrers(referrers: any[]): void {
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'updateTopReferrers',
                referrers
            });
        }
    }

    public updateClones(clones: any): void {
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'updateClones',
                clones
            });
        }
    }

    private getWebviewContent(): string {
        const styleUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'github', 'style.css')
        );

        // Load Chart.js from CDN
        const chartJsUri = 'https://cdn.jsdelivr.net/npm/chart.js';

        return `<!DOCTYPE html>
        <html>
        <head>
            <link href="${styleUri}" rel="stylesheet">
            <script src="${chartJsUri}"></script>
            <title>Repository Analytics</title>
            <style>
                .analytics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 20px;
                    padding: 20px;
                }
                .chart-container {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                    padding: 15px;
                }
                .stat-card {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                    padding: 15px;
                }
                .stat-value {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 10px 0;
                }
                .stat-label {
                    color: var(--vscode-descriptionForeground);
                }
                .contributor-list {
                    margin-top: 20px;
                }
                .contributor-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 5px 0;
                }
                .contributor-avatar {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                }
                .insights-section {
                    margin-top: 20px;
                    padding: 15px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .insight-item {
                    margin: 5px 0;
                    padding: 5px 10px;
                    border-left: 2px solid var(--vscode-textLink-foreground);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Analytics for ${this.options.owner}/${this.options.repo}</h2>
                    <button class="button" onclick="refresh()">
                        Refresh
                    </button>
                </div>

                <div class="analytics-grid">
                    <div class="chart-container">
                        <h3>Commit Activity</h3>
                        <canvas id="commitActivityChart"></canvas>
                    </div>

                    <div class="chart-container">
                        <h3>Code Changes</h3>
                        <canvas id="codeFrequencyChart"></canvas>
                    </div>

                    <div class="chart-container">
                        <h3>Commit Patterns</h3>
                        <canvas id="punchCardChart"></canvas>
                    </div>

                    <div class="chart-container">
                        <h3>Traffic</h3>
                        <canvas id="trafficChart"></canvas>
                    </div>

                    <div class="stat-card">
                        <h3>Repository Stats</h3>
                        <div class="stat-grid">
                            <div>
                                <div class="stat-label">Total Commits</div>
                                <div class="stat-value" id="totalCommits">0</div>
                            </div>
                            <div>
                                <div class="stat-label">Active Contributors</div>
                                <div class="stat-value" id="activeContributors">0</div>
                            </div>
                            <div>
                                <div class="stat-label">Lines Changed</div>
                                <div class="stat-value" id="linesChanged">0</div>
                            </div>
                        </div>
                    </div>

                    <div class="chart-container">
                        <h3>Languages</h3>
                        <canvas id="languagesChart"></canvas>
                    </div>
                </div>

                <div class="insights-section">
                    <h3>Insights</h3>
                    <div id="insightsList"></div>
                </div>

                <div class="contributor-list">
                    <h3>Top Contributors</h3>
                    <div id="contributorsList"></div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                let charts = {};

                function initializeCharts(data) {
                    // Commit Activity Chart
                    charts.commitActivity = new Chart(
                        document.getElementById('commitActivityChart'),
                        {
                            type: 'line',
                            data: {
                                labels: data.commitActivity.map(week => 
                                    new Date(week.week * 1000).toLocaleDateString()),
                                datasets: [{
                                    label: 'Commits',
                                    data: data.commitActivity.map(week => week.total),
                                    borderColor: '#2ea043',
                                    tension: 0.4
                                }]
                            },
                            options: {
                                responsive: true,
                                scales: {
                                    y: {
                                        beginAtZero: true
                                    }
                                }
                            }
                        }
                    );

                    // Code Frequency Chart
                    charts.codeFrequency = new Chart(
                        document.getElementById('codeFrequencyChart'),
                        {
                            type: 'bar',
                            data: {
                                labels: data.codeFrequency.map(week =>
                                    new Date(week.week * 1000).toLocaleDateString()),
                                datasets: [
                                    {
                                        label: 'Additions',
                                        data: data.codeFrequency.map(week => week.additions),
                                        backgroundColor: '#2ea043'
                                    },
                                    {
                                        label: 'Deletions',
                                        data: data.codeFrequency.map(week => -week.deletions),
                                        backgroundColor: '#f85149'
                                    }
                                ]
                            },
                            options: {
                                responsive: true,
                                scales: {
                                    x: {
                                        stacked: true
                                    },
                                    y: {
                                        stacked: true
                                    }
                                }
                            }
                        }
                    );

                    // Traffic Chart
                    charts.traffic = new Chart(
                        document.getElementById('trafficChart'),
                        {
                            type: 'line',
                            data: {
                                labels: data.traffic.views.map(view =>
                                    new Date(view.timestamp).toLocaleDateString()),
                                datasets: [
                                    {
                                        label: 'Views',
                                        data: data.traffic.views.map(view => view.count),
                                        borderColor: '#2ea043',
                                        tension: 0.4
                                    },
                                    {
                                        label: 'Unique Visitors',
                                        data: data.traffic.views.map(view => view.uniques),
                                        borderColor: '#1f6feb',
                                        tension: 0.4
                                    }
                                ]
                            },
                            options: {
                                responsive: true,
                                scales: {
                                    y: {
                                        beginAtZero: true
                                    }
                                }
                            }
                        }
                    );

                    updateStats(data);
                    updateContributors(data.contributorStats);
                }

                function updateStats(data) {
                    const totalCommits = data.commitActivity.reduce(
                        (sum, week) => sum + week.total, 0);
                    const activeContributors = data.contributorStats.length;
                    const linesChanged = data.codeFrequency.reduce(
                        (sum, week) => sum + week.additions + week.deletions, 0);

                    document.getElementById('totalCommits').textContent = totalCommits;
                    document.getElementById('activeContributors').textContent = activeContributors;
                    document.getElementById('linesChanged').textContent = linesChanged;
                }

                function updateContributors(contributors) {
                    const list = document.getElementById('contributorsList');
                    list.innerHTML = contributors
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 10)
                        .map(contributor => \`
                            <div class="contributor-item">
                                <img class="contributor-avatar" 
                                    src="\${contributor.author.avatar_url}" 
                                    alt="\${contributor.author.login}">
                                <span>\${contributor.author.login}</span>
                                <span>\${contributor.total} commits</span>
                            </div>
                        \`).join('');
                }

                function refresh() {
                    vscode.postMessage({ type: 'refresh' });
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'updateData':
                            Object.entries(charts).forEach(([key, chart]) => {
                                chart.destroy();
                            });
                            initializeCharts(message.data);
                            break;

                        case 'updateLanguages':
                            updateLanguagesChart(message.languages);
                            break;

                        case 'updateTopPaths':
                            updateTopPathsList(message.paths);
                            break;

                        case 'updateTopReferrers':
                            updateReferrersList(message.referrers);
                            break;

                        case 'updateClones':
                            updateClonesChart(message.clones);
                            break;
                    }
                });

                // Initialize charts with initial data
                initializeCharts(${JSON.stringify(this.options)});
            </script>
        </body>
        </html>`;
    }

    public dispose(): void {
        this.panel?.dispose();
    }
}
