import * as vscode from 'vscode';
import { RepoSettings } from './repoSettingsManager';

interface RepoSettingsOptions {
    settings: RepoSettings;
    collaborators: any[];
    teams: any[];
}

export class RepoSettingsWebview {
    private panel: vscode.WebviewPanel | undefined;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private options: RepoSettingsOptions,
        private readonly onAction: (action: any) => Promise<void>
    ) {}

    public async show(): Promise<void> {
        this.panel = vscode.window.createWebviewPanel(
            'repoSettings',
            'Repository Settings',
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
                if (message.type === 'updateSettings') {
                    vscode.window.showInformationMessage('Settings updated successfully!');
                }
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
        });
    }

    public updateSettings(settings: RepoSettings) {
        this.options.settings = settings;
        if (this.panel) {
            this.panel.webview.html = this.getWebviewContent();
        }
    }

    private getWebviewContent(): string {
        const styleUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'github', 'style.css')
        );

        const settings = this.options.settings;
        const collaborators = this.options.collaborators;
        const teams = this.options.teams;

        const branchesHtml = settings.branches.map(branch => `
            <div class="branch-settings" data-branch="${branch.name}">
                <div class="branch-header">
                    <h3>${branch.name}</h3>
                    ${branch.name === settings.default_branch ? 
                        '<span class="badge">Default Branch</span>' : ''}
                </div>
                
                <div class="protection-settings">
                    <label>
                        <input type="checkbox" class="protection-toggle" 
                            ${branch.protected ? 'checked' : ''}>
                        Branch Protection
                    </label>
                    
                    ${branch.protected ? this.getBranchProtectionHtml(branch) : ''}
                </div>
            </div>
        `).join('\\n');

        const collaboratorsHtml = collaborators.map(collab => `
            <div class="collaborator-item">
                <img src="${collab.avatar_url}" class="avatar" alt="${collab.login}">
                <span>${collab.login}</span>
                <span class="permission">${collab.permissions.admin ? 'Admin' : 
                    collab.permissions.maintain ? 'Maintain' : 
                    collab.permissions.push ? 'Write' : 'Read'}</span>
            </div>
        `).join('\\n');

        return `<!DOCTYPE html>
        <html>
        <head>
            <link href="${styleUri}" rel="stylesheet">
            <title>Repository Settings</title>
            <style>
                .settings-section {
                    margin-bottom: 20px;
                    padding: 15px;
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .branch-settings {
                    margin: 10px 0;
                    padding: 10px;
                    background: var(--vscode-editor-background);
                    border-radius: 4px;
                }
                .branch-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .badge {
                    background: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 12px;
                }
                .protection-settings {
                    margin-top: 10px;
                    padding-left: 20px;
                }
                .collaborator-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 5px;
                }
                .avatar {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                }
                .permission {
                    color: var(--vscode-descriptionForeground);
                    font-size: 12px;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                .checkbox-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Repository Settings</h2>
                
                <div class="settings-section">
                    <h3>General Settings</h3>
                    <div class="form-group">
                        <label for="repoName">Repository Name</label>
                        <input type="text" id="repoName" class="input" 
                            value="${settings.name}">
                    </div>
                    
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="description" class="input" rows="3"
                            >${settings.description || ''}</textarea>
                    </div>
                    
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" id="hasIssues" 
                                ${settings.has_issues ? 'checked' : ''}>
                            Enable Issues
                        </label>
                        
                        <label>
                            <input type="checkbox" id="hasProjects" 
                                ${settings.has_projects ? 'checked' : ''}>
                            Enable Projects
                        </label>
                        
                        <label>
                            <input type="checkbox" id="hasWiki" 
                                ${settings.has_wiki ? 'checked' : ''}>
                            Enable Wiki
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Merge Settings</h3>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" id="allowSquash" 
                                ${settings.allow_squash_merge ? 'checked' : ''}>
                            Allow Squash Merging
                        </label>
                        
                        <label>
                            <input type="checkbox" id="allowMerge" 
                                ${settings.allow_merge_commit ? 'checked' : ''}>
                            Allow Merge Commits
                        </label>
                        
                        <label>
                            <input type="checkbox" id="allowRebase" 
                                ${settings.allow_rebase_merge ? 'checked' : ''}>
                            Allow Rebase Merging
                        </label>
                        
                        <label>
                            <input type="checkbox" id="deleteBranchOnMerge" 
                                ${settings.delete_branch_on_merge ? 'checked' : ''}>
                            Automatically Delete Head Branches
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Branch Settings</h3>
                    ${branchesHtml}
                </div>
                
                <div class="settings-section">
                    <h3>Collaborators and Teams</h3>
                    ${collaboratorsHtml}
                </div>
                
                <div class="actions">
                    <button class="button" onclick="saveSettings()">Save Settings</button>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function saveSettings() {
                    const settings = {
                        name: document.getElementById('repoName').value,
                        description: document.getElementById('description').value,
                        has_issues: document.getElementById('hasIssues').checked,
                        has_projects: document.getElementById('hasProjects').checked,
                        has_wiki: document.getElementById('hasWiki').checked,
                        allow_squash_merge: document.getElementById('allowSquash').checked,
                        allow_merge_commit: document.getElementById('allowMerge').checked,
                        allow_rebase_merge: document.getElementById('allowRebase').checked,
                        delete_branch_on_merge: document.getElementById('deleteBranchOnMerge').checked
                    };

                    vscode.postMessage({
                        type: 'updateSettings',
                        settings: settings
                    });
                }

                // Handle branch protection toggles
                document.querySelectorAll('.protection-toggle').forEach(toggle => {
                    toggle.addEventListener('change', (e) => {
                        const branch = e.target.closest('.branch-settings').dataset.branch;
                        if (e.target.checked) {
                            vscode.postMessage({
                                type: 'updateBranchProtection',
                                branch: branch,
                                protection: {
                                    required_status_checks: {
                                        strict: true,
                                        contexts: []
                                    },
                                    enforce_admins: true,
                                    required_pull_request_reviews: {
                                        dismiss_stale_reviews: true,
                                        require_code_owner_reviews: true,
                                        required_approving_review_count: 1
                                    },
                                    required_linear_history: true,
                                    allow_force_pushes: false,
                                    allow_deletions: false
                                }
                            });
                        } else {
                            vscode.postMessage({
                                type: 'deleteBranchProtection',
                                branch: branch
                            });
                        }
                    });
                });
            </script>
        </body>
        </html>`;
    }

    private getBranchProtectionHtml(branch: any): string {
        const protection = branch.protection;
        if (!protection) return '';

        return `
            <div class="protection-rules">
                <div class="form-group">
                    <label>Required Reviews</label>
                    <input type="number" class="input" value="${
                        protection.required_pull_request_reviews?.required_approving_review_count || 0
                    }" min="0" max="6">
                </div>
                
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" ${
                            protection.required_pull_request_reviews?.dismiss_stale_reviews ? 'checked' : ''
                        }>
                        Dismiss Stale Reviews
                    </label>
                    
                    <label>
                        <input type="checkbox" ${
                            protection.required_pull_request_reviews?.require_code_owner_reviews ? 'checked' : ''
                        }>
                        Require Code Owner Reviews
                    </label>
                    
                    <label>
                        <input type="checkbox" ${
                            protection.enforce_admins ? 'checked' : ''
                        }>
                        Include Administrators
                    </label>
                </div>
            </div>
        `;
    }

    public dispose() {
        this.panel?.dispose();
    }
}
