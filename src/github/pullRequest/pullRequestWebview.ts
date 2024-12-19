import * as vscode from 'vscode';
import { PullRequestDetails } from './pullRequestManager';

interface PRWebviewOptions {
    branches?: string[];
    collaborators?: string[];
    labels?: Array<{ name: string; color: string }>;
    pullRequest?: any;
    reviews?: any[];
    comments?: any[];
}

export class PullRequestWebview {
    showPullRequestDetails(arg0: { reviews: { id: number; node_id: string; user: import("@octokit/openapi-types").components["schemas"]["nullable-simple-user"]; body: string; state: string; html_url: string; pull_request_url: string; _links: { html: { href: string; }; pull_request: { href: string; }; }; submitted_at?: string; commit_id: string; body_html?: string; body_text?: string; author_association: import("@octokit/openapi-types").components["schemas"]["author-association"]; }[]; comments: { id: number; node_id: string; url: string; body?: string; body_text?: string; body_html?: string; html_url: string; user: import("@octokit/openapi-types").components["schemas"]["nullable-simple-user"]; created_at: string; updated_at: string; issue_url: string; author_association: import("@octokit/openapi-types").components["schemas"]["author-association"]; performed_via_github_app?: import("@octokit/openapi-types").components["schemas"]["nullable-integration"]; reactions?: import("@octokit/openapi-types").components["schemas"]["reaction-rollup"]; }[]; url: string; id: number; node_id: string; html_url: string; diff_url: string; patch_url: string; issue_url: string; commits_url: string; review_comments_url: string; review_comment_url: string; comments_url: string; statuses_url: string; number: number; state: "open" | "closed"; locked: boolean; title: string; user: import("@octokit/openapi-types").components["schemas"]["nullable-simple-user"]; body: string | null; labels: { id: number; node_id: string; url: string; name: string; description: string | null; color: string; default: boolean; }[]; milestone: import("@octokit/openapi-types").components["schemas"]["nullable-milestone"]; active_lock_reason?: string | null; created_at: string; updated_at: string; closed_at: string | null; merged_at: string | null; merge_commit_sha: string | null; assignee: import("@octokit/openapi-types").components["schemas"]["nullable-simple-user"]; assignees?: import("@octokit/openapi-types").components["schemas"]["simple-user"][] | null; requested_reviewers?: import("@octokit/openapi-types").components["schemas"]["simple-user"][] | null; requested_teams?: import("@octokit/openapi-types").components["schemas"]["team-simple"][] | null; head: { label: string; ref: string; repo: { archive_url: string; assignees_url: string; blobs_url: string; branches_url: string; collaborators_url: string; comments_url: string; commits_url: string; compare_url: string; contents_url: string; contributors_url: string; deployments_url: string; description: string | null; downloads_url: string; events_url: string; fork: boolean; forks_url: string; full_name: string; git_commits_url: string; git_refs_url: string; git_tags_url: string; hooks_url: string; html_url: string; id: number; node_id: string; issue_comment_url: string; issue_events_url: string; issues_url: string; keys_url: string; labels_url: string; languages_url: string; merges_url: string; milestones_url: string; name: string; notifications_url: string; owner: { avatar_url: string; events_url: string; followers_url: string; following_url: string; gists_url: string; gravatar_id: string | null; html_url: string; id: number; node_id: string; login: string; organizations_url: string; received_events_url: string; repos_url: string; site_admin: boolean; starred_url: string; subscriptions_url: string; type: string; url: string; }; private: boolean; pulls_url: string; releases_url: string; stargazers_url: string; statuses_url: string; subscribers_url: string; subscription_url: string; tags_url: string; teams_url: string; trees_url: string; url: string; clone_url: string; default_branch: string; forks: number; forks_count: number; git_url: string; has_downloads: boolean; has_issues: boolean; has_projects: boolean; has_wiki: boolean; has_pages: boolean; homepage: string | null; language: string | null; master_branch?: string; archived: boolean; disabled: boolean; visibility?: string; mirror_url: string | null; open_issues: number; open_issues_count: number; permissions?: { admin: boolean; maintain?: boolean; push: boolean; triage?: boolean; pull: boolean; }; temp_clone_token?: string; allow_merge_commit?: boolean; allow_squash_merge?: boolean; allow_rebase_merge?: boolean; license: { key: string; name: string; url: string | null; spdx_id: string | null; node_id: string; } | null; pushed_at: string; size: number; ssh_url: string; stargazers_count: number; svn_url: string; topics?: string[]; watchers: number; watchers_count: number; created_at: string; updated_at: string; allow_forking?: boolean; is_template?: boolean; } | null; sha: string; user: { avatar_url: string; events_url: string; followers_url: string; following_url: string; gists_url: string; gravatar_id: string | null; html_url: string; id: number; node_id: string; login: string; organizations_url: string; received_events_url: string; repos_url: string; site_admin: boolean; starred_url: string; subscriptions_url: string; type: string; url: string; }; }; base: { label: string; ref: string; repo: { archive_url: string; assignees_url: string; blobs_url: string; branches_url: string; collaborators_url: string; comments_url: string; commits_url: string; compare_url: string; contents_url: string; contributors_url: string; deployments_url: string; description: string | null; downloads_url: string; events_url: string; fork: boolean; forks_url: string; full_name: string; git_commits_url: string; git_refs_url: string; git_tags_url: string; hooks_url: string; html_url: string; id: number; is_template?: boolean; node_id: string; issue_comment_url: string; issue_events_url: string; issues_url: string; keys_url: string; labels_url: string; languages_url: string; merges_url: string; milestones_url: string; name: string; notifications_url: string; owner: { avatar_url: string; events_url: string; followers_url: string; following_url: string; gists_url: string; gravatar_id: string | null; html_url: string; id: number; node_id: string; login: string; organizations_url: string; received_events_url: string; repos_url: string; site_admin: boolean; starred_url: string; subscriptions_url: string; type: string; url: string; }; private: boolean; pulls_url: string; releases_url: string; stargazers_url: string; statuses_url: string; subscribers_url: string; subscription_url: string; tags_url: string; teams_url: string; trees_url: string; url: string; clone_url: string; default_branch: string; forks: number; forks_count: number; git_url: string; has_downloads: boolean; has_issues: boolean; has_projects: boolean; has_wiki: boolean; has_pages: boolean; homepage: string | null; language: string | null; master_branch?: string; archived: boolean; disabled: boolean; visibility?: string; mirror_url: string | null; open_issues: number; open_issues_count: number; permissions?: { admin: boolean; maintain?: boolean; push: boolean; triage?: boolean; pull: boolean; }; temp_clone_token?: string; allow_merge_commit?: boolean; allow_squash_merge?: boolean; allow_rebase_merge?: boolean; license: import("@octokit/openapi-types").components["schemas"]["nullable-license-simple"]; pushed_at: string; size: number; ssh_url: string; stargazers_count: number; svn_url: string; topics?: string[]; watchers: number; watchers_count: number; created_at: string; updated_at: string; allow_forking?: boolean; }; sha: string; user: { avatar_url: string; events_url: string; followers_url: string; following_url: string; gists_url: string; gravatar_id: string | null; html_url: string; id: number; node_id: string; login: string; organizations_url: string; received_events_url: string; repos_url: string; site_admin: boolean; starred_url: string; subscriptions_url: string; type: string; url: string; }; }; _links: { comments: import("@octokit/openapi-types").components["schemas"]["link"]; commits: import("@octokit/openapi-types").components["schemas"]["link"]; statuses: import("@octokit/openapi-types").components["schemas"]["link"]; html: import("@octokit/openapi-types").components["schemas"]["link"]; issue: import("@octokit/openapi-types").components["schemas"]["link"]; review_comments: import("@octokit/openapi-types").components["schemas"]["link"]; review_comment: import("@octokit/openapi-types").components["schemas"]["link"]; self: import("@octokit/openapi-types").components["schemas"]["link"]; }; author_association: import("@octokit/openapi-types").components["schemas"]["author-association"]; auto_merge: import("@octokit/openapi-types").components["schemas"]["auto-merge"]; draft?: boolean; merged: boolean; mergeable: boolean | null; rebaseable?: boolean | null; mergeable_state: string; merged_by: import("@octokit/openapi-types").components["schemas"]["nullable-simple-user"]; review_comments: number; maintainer_can_modify: boolean; commits: number; additions: number; deletions: number; changed_files: number; }) {
        throw new Error('Method not implemented.');
    }
    dispose() {
        throw new Error('Method not implemented.');
    }
    private panel: vscode.WebviewPanel | undefined;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly options: PRWebviewOptions,
        private readonly onAction: (action: any) => Promise<void>
    ) {}

    public async show(): Promise<void> {
        this.panel = vscode.window.createWebviewPanel(
            'pullRequest',
            this.options.pullRequest ? `PR #${this.options.pullRequest.number}` : 'Create Pull Request',
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
                if (message.type === 'create') {
                    this.panel?.dispose();
                }
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
        });
    }

    private getWebviewContent(): string {
        const styleUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'github', 'style.css')
        );

        if (this.options.pullRequest) {
            return this.getPullRequestDetailsHtml(styleUri);
        } else {
            return this.getCreatePullRequestHtml(styleUri);
        }
    }

    private getCreatePullRequestHtml(styleUri: vscode.Uri): string {
        const branchOptions = this.options.branches?.map(branch => 
            `<option value="${branch}">${branch}</option>`
        ).join('\\n') || '';

        const reviewerOptions = this.options.collaborators?.map(collaborator =>
            `<option value="${collaborator}">${collaborator}</option>`
        ).join('\\n') || '';

        const labelOptions = this.options.labels?.map(label =>
            `<div class="label-option">
                <input type="checkbox" id="label-${label.name}" value="${label.name}">
                <label for="label-${label.name}">
                    <span class="label-color" style="background: #${label.color}"></span>
                    ${label.name}
                </label>
            </div>`
        ).join('\\n') || '';

        return `<!DOCTYPE html>
        <html>
        <head>
            <link href="${styleUri}" rel="stylesheet">
            <title>Create Pull Request</title>
            <style>
                .form-group {
                    margin-bottom: 15px;
                }
                .label-option {
                    display: flex;
                    align-items: center;
                    margin: 5px 0;
                }
                .label-color {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border-radius: 3px;
                    margin-right: 5px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Create Pull Request</h2>
                <form id="prForm">
                    <div class="form-group">
                        <label for="title">Title</label>
                        <input type="text" id="title" class="input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="description" class="input" rows="4"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="baseBranch">Base Branch</label>
                        <select id="baseBranch" class="input" required>
                            ${branchOptions}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="headBranch">Head Branch</label>
                        <select id="headBranch" class="input" required>
                            ${branchOptions}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="reviewers">Reviewers</label>
                        <select id="reviewers" class="input" multiple>
                            ${reviewerOptions}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Labels</label>
                        <div class="labels-container">
                            ${labelOptions}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="draft">
                            Create as draft
                        </label>
                    </div>
                    
                    <button type="submit" class="button">Create Pull Request</button>
                </form>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                document.getElementById('prForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    const selectedLabels = Array.from(document.querySelectorAll('.label-option input:checked'))
                        .map(input => input.value);
                    
                    const selectedReviewers = Array.from(document.getElementById('reviewers').selectedOptions)
                        .map(option => option.value);
                    
                    vscode.postMessage({
                        type: 'create',
                        details: {
                            title: document.getElementById('title').value,
                            description: document.getElementById('description').value,
                            baseBranch: document.getElementById('baseBranch').value,
                            headBranch: document.getElementById('headBranch').value,
                            reviewers: selectedReviewers,
                            labels: selectedLabels,
                            draft: document.getElementById('draft').checked
                        }
                    });
                });
            </script>
        </body>
        </html>`;
    }

    private getPullRequestDetailsHtml(styleUri: vscode.Uri): string {
        const pr = this.options.pullRequest;
        const reviews = this.options.reviews || [];
        const comments = this.options.comments || [];

        const reviewsHtml = reviews.map(review => `
            <div class="review">
                <div class="review-header">
                    <span class="reviewer">${review.user.login}</span>
                    <span class="review-state ${review.state.toLowerCase()}">${review.state}</span>
                </div>
                ${review.body ? `<div class="review-body">${review.body}</div>` : ''}
            </div>
        `).join('\\n');

        const commentsHtml = comments.map(comment => `
            <div class="comment">
                <div class="comment-header">
                    <span class="commenter">${comment.user.login}</span>
                    <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <div class="comment-body">${comment.body}</div>
            </div>
        `).join('\\n');

        return `<!DOCTYPE html>
        <html>
        <head>
            <link href="${styleUri}" rel="stylesheet">
            <title>Pull Request #${pr.number}</title>
            <style>
                .pr-header {
                    padding: 15px;
                    border-bottom: 1px solid var(--vscode-widget-border);
                }
                .pr-title {
                    font-size: 1.4em;
                    margin-bottom: 10px;
                }
                .pr-meta {
                    color: var(--vscode-descriptionForeground);
                }
                .review, .comment {
                    padding: 10px;
                    margin: 10px 0;
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .review-header, .comment-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                }
                .review-state {
                    padding: 2px 6px;
                    border-radius: 3px;
                }
                .review-state.approved {
                    background: var(--vscode-testing-iconPassed);
                }
                .review-state.changes_requested {
                    background: var(--vscode-testing-iconFailed);
                }
                .actions {
                    margin-top: 20px;
                    display: flex;
                    gap: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="pr-header">
                    <div class="pr-title">${pr.title}</div>
                    <div class="pr-meta">
                        #${pr.number} opened by ${pr.user.login}
                        · ${pr.commits} commits
                        · ${pr.changed_files} files changed
                    </div>
                </div>
                
                <div class="pr-body">
                    ${pr.body || 'No description provided.'}
                </div>
                
                <div class="reviews">
                    <h3>Reviews</h3>
                    ${reviewsHtml || 'No reviews yet.'}
                </div>
                
                <div class="comments">
                    <h3>Comments</h3>
                    ${commentsHtml || 'No comments yet.'}
                </div>
                
                <div class="actions">
                    <button class="button" onclick="approve()">Approve</button>
                    <button class="button" onclick="requestChanges()">Request Changes</button>
                    <button class="button" onclick="merge()">Merge</button>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function approve() {
                    vscode.postMessage({ type: 'approve' });
                }
                
                function requestChanges() {
                    vscode.postMessage({ type: 'requestChanges' });
                }
                
                function merge() {
                    vscode.postMessage({ type: 'merge' });
                }
            </script>
        </body>
        </html>`;
    }
}
