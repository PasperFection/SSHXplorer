import * as vscode from 'vscode';
import {
    Release,
    ReleaseMetrics
} from './releaseManager';

interface ReleaseViewOptions {
    owner: string;
    repo: string;
    releases: Release[];
    metrics: ReleaseMetrics;
}

export class ReleaseWebview {
    private panel: vscode.WebviewPanel | undefined;
    private options: ReleaseViewOptions;

    constructor(
        private readonly extensionUri: vscode.Uri,
        options: ReleaseViewOptions,
        private readonly onAction: (action: any) => Promise<void>
    ) {
        this.options = options;
    }

    public async show(): Promise<void> {
        this.panel = vscode.window.createWebviewPanel(
            'githubReleases',
            'Release Management',
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

    public update(options: Partial<ReleaseViewOptions>): void {
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
            <title>Release Management</title>
            <style>
                .release-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    padding: 20px;
                }
                .release-card {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                    padding: 15px;
                }
                .release-item {
                    margin: 10px 0;
                    padding: 10px;
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .badge-draft {
                    background: var(--vscode-testing-iconQueued);
                    color: var(--vscode-editor-background);
                }
                .badge-prerelease {
                    background: var(--vscode-testing-iconSkipped);
                    color: var(--vscode-editor-background);
                }
                .badge-published {
                    background: var(--vscode-testing-iconPassed);
                    color: var(--vscode-editor-background);
                }
                .asset-list {
                    margin-left: 20px;
                }
                .asset-item {
                    margin: 5px 0;
                    padding: 5px;
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .metric-value {
                    font-size: 24px;
                    font-weight: bold;
                }
                .chart-container {
                    height: 300px;
                    margin: 20px 0;
                }
                .author-avatar {
                    width: 24px;
                    height: 24px;
                    border-radius: 12px;
                    margin-right: 8px;
                    vertical-align: middle;
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
                    <h2>Release Management for ${this.options.owner}/${this.options.repo}</h2>
                    <div class="header-actions">
                        <button class="button" onclick="createRelease()">
                            Create Release
                        </button>
                        <button class="button" onclick="refresh()">
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="release-grid">
                    <div class="release-card">
                        <h3>Overview</h3>
                        <div>
                            <div class="metric-item">
                                <div class="metric-label">Total Releases</div>
                                <div class="metric-value">${this.options.metrics.totalReleases}</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">Total Downloads</div>
                                <div class="metric-value">${this.options.metrics.totalDownloads}</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">Average Downloads/Release</div>
                                <div class="metric-value">
                                    ${Math.round(this.options.metrics.averageDownloadsPerRelease)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="release-card">
                        <h3>Release Timeline</h3>
                        <div class="chart-container">
                            <canvas id="timelineChart"></canvas>
                        </div>
                    </div>

                    <div class="release-card">
                        <h3>Release Frequency</h3>
                        <div>
                            <div class="metric-item">
                                <div class="metric-label">Daily</div>
                                <div class="metric-value">
                                    ${this.options.metrics.releaseFrequency.daily}
                                </div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">Weekly</div>
                                <div class="metric-value">
                                    ${this.options.metrics.releaseFrequency.weekly}
                                </div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">Monthly</div>
                                <div class="metric-value">
                                    ${this.options.metrics.releaseFrequency.monthly}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="release-card">
                        <h3>Most Popular Release</h3>
                        <div>
                            <div class="metric-item">
                                <div class="metric-label">Name</div>
                                <div class="metric-value">
                                    ${this.options.metrics.mostPopularRelease.name}
                                </div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">Downloads</div>
                                <div class="metric-value">
                                    ${this.options.metrics.mostPopularRelease.downloads}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="releases">
                    <h3>Releases</h3>
                    ${this.getReleasesHtml()}
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function createRelease() {
                    vscode.postMessage({
                        type: 'createRelease',
                        release: {
                            tagName: prompt('Enter tag name:'),
                            name: prompt('Enter release name:'),
                            body: prompt('Enter release notes:'),
                            draft: confirm('Create as draft?'),
                            prerelease: confirm('Mark as pre-release?')
                        }
                    });
                }

                function editRelease(releaseId) {
                    const release = ${JSON.stringify(this.options.releases)}
                        .find(r => r.id === releaseId);

                    vscode.postMessage({
                        type: 'editRelease',
                        release: {
                            id: releaseId,
                            tagName: prompt('Enter tag name:', release.tagName),
                            name: prompt('Enter release name:', release.name),
                            body: prompt('Enter release notes:', release.body),
                            draft: confirm('Create as draft?'),
                            prerelease: confirm('Mark as pre-release?')
                        }
                    });
                }

                function deleteRelease(releaseId) {
                    if (confirm('Are you sure you want to delete this release?')) {
                        vscode.postMessage({
                            type: 'deleteRelease',
                            releaseId
                        });
                    }
                }

                function publishRelease(releaseId) {
                    vscode.postMessage({
                        type: 'publishRelease',
                        releaseId
                    });
                }

                function uploadAsset(releaseId) {
                    vscode.postMessage({
                        type: 'uploadAsset',
                        releaseId,
                        asset: {
                            name: prompt('Enter asset name:'),
                            label: prompt('Enter asset label (optional):'),
                            contentType: prompt('Enter content type:'),
                            data: null // File selection will be handled by VS Code
                        }
                    });
                }

                function deleteAsset(assetId) {
                    if (confirm('Are you sure you want to delete this asset?')) {
                        vscode.postMessage({
                            type: 'deleteAsset',
                            assetId
                        });
                    }
                }

                function downloadAsset(downloadUrl) {
                    vscode.postMessage({
                        type: 'downloadAsset',
                        downloadUrl
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
                            data.metrics.totalReleases;
                        document.querySelector('.metric-value:nth-child(2)').textContent = 
                            data.metrics.totalDownloads;
                        document.querySelector('.metric-value:nth-child(3)').textContent = 
                            Math.round(data.metrics.averageDownloadsPerRelease);

                        // Update timeline chart
                        updateTimelineChart(data.metrics.timelineData);

                        // Update release frequency
                        document.querySelector('.metric-value:nth-child(4)').textContent = 
                            data.metrics.releaseFrequency.daily;
                        document.querySelector('.metric-value:nth-child(5)').textContent = 
                            data.metrics.releaseFrequency.weekly;
                        document.querySelector('.metric-value:nth-child(6)').textContent = 
                            data.metrics.releaseFrequency.monthly;

                        // Update most popular release
                        document.querySelector('.metric-value:nth-child(7)').textContent = 
                            data.metrics.mostPopularRelease.name;
                        document.querySelector('.metric-value:nth-child(8)').textContent = 
                            data.metrics.mostPopularRelease.downloads;
                    }

                    if (data.releases) {
                        // Update releases list
                        const releasesContainer = document.querySelector('.releases');
                        releasesContainer.innerHTML = \`
                            <h3>Releases</h3>
                            ${this.getReleasesHtml().replace(/`/g, '\\`')}
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
                                label: 'Releases',
                                data: ${JSON.stringify(this.options.metrics.timelineData.releases)},
                                borderColor: '#4CAF50',
                                backgroundColor: 'rgba(76, 175, 80, 0.1)'
                            },
                            {
                                label: 'Downloads',
                                data: ${JSON.stringify(this.options.metrics.timelineData.downloads)},
                                borderColor: '#2196F3',
                                backgroundColor: 'rgba(33, 150, 243, 0.1)'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });

                function updateTimelineChart(data) {
                    timelineChart.data.labels = data.labels;
                    timelineChart.data.datasets[0].data = data.releases;
                    timelineChart.data.datasets[1].data = data.downloads;
                    timelineChart.update();
                }

                function formatBytes(bytes) {
                    const units = ['B', 'KB', 'MB', 'GB'];
                    let size = bytes;
                    let unit = 0;
                    while (size >= 1024 && unit < units.length - 1) {
                        size /= 1024;
                        unit++;
                    }
                    return \`\${size.toFixed(1)} \${units[unit]}\`;
                }
            </script>
        </body>
        </html>`;
    }

    private getReleasesHtml(): string {
        return this.options.releases.map(release => `
            <div class="release-item">
                <div class="release-header">
                    <img class="author-avatar" src="${release.author.avatarUrl}" alt="${release.author.login}" />
                    <span class="badge badge-${release.draft ? 'draft' : release.prerelease ? 'prerelease' : 'published'}">
                        ${release.draft ? 'Draft' : release.prerelease ? 'Pre-release' : 'Published'}
                    </span>
                    <h4>${release.name}</h4>
                </div>
                <div class="release-meta">
                    <div>Tag: ${release.tagName}</div>
                    <div>Author: ${release.author.login}</div>
                    <div>Created: ${new Date(release.createdAt).toLocaleString()}</div>
                    ${release.publishedAt ? `
                        <div>Published: ${new Date(release.publishedAt).toLocaleString()}</div>
                    ` : ''}
                </div>
                <div class="release-body">
                    ${release.body}
                </div>
                <div class="release-stats">
                    <div>Downloads: ${release.stats.downloads}</div>
                    <div>Size: ${formatBytes(release.stats.size)}</div>
                </div>
                <div class="asset-list">
                    <h5>Assets</h5>
                    ${release.assets.map(asset => `
                        <div class="asset-item">
                            <div class="asset-name">${asset.name}</div>
                            ${asset.label ? `<div class="asset-label">${asset.label}</div>` : ''}
                            <div class="asset-meta">
                                Size: ${formatBytes(asset.size)}
                                · Downloads: ${asset.downloadCount}
                                · Type: ${asset.contentType}
                            </div>
                            <div class="asset-actions">
                                <button class="button" onclick="downloadAsset('${asset.downloadUrl}')">
                                    Download
                                </button>
                                <button class="button" onclick="deleteAsset(${asset.id})">
                                    Delete
                                </button>
                            </div>
                        </div>
                    `).join('\\n')}
                    <button class="button" onclick="uploadAsset(${release.id})">
                        Upload Asset
                    </button>
                </div>
                <div class="release-actions">
                    <button class="button" onclick="editRelease(${release.id})">
                        Edit
                    </button>
                    <button class="button" onclick="deleteRelease(${release.id})">
                        Delete
                    </button>
                    ${release.draft ? `
                        <button class="button" onclick="publishRelease(${release.id})">
                            Publish
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('\\n');
    }

    public dispose(): void {
        this.panel?.dispose();
    }
}

function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit++;
    }
    return `${size.toFixed(1)} ${units[unit]}`;
}
