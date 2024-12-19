import * as vscode from 'vscode';
import { IssueDetails } from './issueManager';

interface IssueWebviewOptions {
    collaborators?: string[];
    labels?: Array<{ name: string; color: string }>;
    milestones?: Array<{ number: number; title: string }>;
    issue?: any;
    comments?: any[];
}

export class IssueWebview {
    private panel: vscode.WebviewPanel | undefined;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly options: IssueWebviewOptions,
        private readonly onAction: (action: any) => Promise<void>
    ) {}

    public async show(): Promise<void> {
        this.panel = vscode.window.createWebviewPanel(
            'issue',
            this.options.issue ? `Issue #${this.options.issue.number}` : 'Create Issue',
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

        if (this.options.issue) {
            return this.getIssueDetailsHtml(styleUri);
        } else {
            return this.getCreateIssueHtml(styleUri);
        }
    }

    private getCreateIssueHtml(styleUri: vscode.Uri): string {
        const assigneeOptions = this.options.collaborators?.map(collaborator =>
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

        const milestoneOptions = this.options.milestones?.map(milestone =>
            `<option value="${milestone.number}">${milestone.title}</option>`
        ).join('\\n') || '';

        return `<!DOCTYPE html>
        <html>
        <head>
            <link href="${styleUri}" rel="stylesheet">
            <title>Create Issue</title>
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
                <h2>Create Issue</h2>
                <form id="issueForm">
                    <div class="form-group">
                        <label for="title">Title</label>
                        <input type="text" id="title" class="input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="body">Description</label>
                        <textarea id="body" class="input" rows="4"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="assignees">Assignees</label>
                        <select id="assignees" class="input" multiple>
                            ${assigneeOptions}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Labels</label>
                        <div class="labels-container">
                            ${labelOptions}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="milestone">Milestone</label>
                        <select id="milestone" class="input">
                            <option value="">No milestone</option>
                            ${milestoneOptions}
                        </select>
                    </div>
                    
                    <button type="submit" class="button">Create Issue</button>
                </form>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                document.getElementById('issueForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    const selectedLabels = Array.from(document.querySelectorAll('.label-option input:checked'))
                        .map(input => input.value);
                    
                    const selectedAssignees = Array.from(document.getElementById('assignees').selectedOptions)
                        .map(option => option.value);
                    
                    const milestone = document.getElementById('milestone').value;
                    
                    vscode.postMessage({
                        type: 'create',
                        details: {
                            title: document.getElementById('title').value,
                            body: document.getElementById('body').value,
                            assignees: selectedAssignees,
                            labels: selectedLabels,
                            milestone: milestone ? parseInt(milestone) : undefined
                        }
                    });
                });
            </script>
        </body>
        </html>`;
    }

    private getIssueDetailsHtml(styleUri: vscode.Uri): string {
        const issue = this.options.issue;
        const comments = this.options.comments || [];

        const commentsHtml = comments.map(comment => `
            <div class="comment">
                <div class="comment-header">
                    <span class="commenter">${comment.user.login}</span>
                    <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <div class="comment-body">${comment.body}</div>
            </div>
        `).join('\\n');

        const labelsHtml = issue.labels.map((label: any) => `
            <span class="label" style="background: #${label.color}">
                ${label.name}
            </span>
        `).join('\\n');

        return `<!DOCTYPE html>
        <html>
        <head>
            <link href="${styleUri}" rel="stylesheet">
            <title>Issue #${issue.number}</title>
            <style>
                .issue-header {
                    padding: 15px;
                    border-bottom: 1px solid var(--vscode-widget-border);
                }
                .issue-title {
                    font-size: 1.4em;
                    margin-bottom: 10px;
                }
                .issue-meta {
                    color: var(--vscode-descriptionForeground);
                }
                .comment {
                    padding: 10px;
                    margin: 10px 0;
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .comment-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                }
                .label {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 3px;
                    margin-right: 5px;
                    color: #fff;
                    font-size: 12px;
                }
                .actions {
                    margin-top: 20px;
                    display: flex;
                    gap: 10px;
                }
                .new-comment {
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="issue-header">
                    <div class="issue-title">${issue.title}</div>
                    <div class="issue-meta">
                        #${issue.number} opened by ${issue.user.login}
                        · ${issue.comments} comments
                        · ${issue.state}
                    </div>
                    <div class="issue-labels">
                        ${labelsHtml}
                    </div>
                </div>
                
                <div class="issue-body">
                    ${issue.body || 'No description provided.'}
                </div>
                
                <div class="comments">
                    <h3>Comments</h3>
                    ${commentsHtml}
                </div>
                
                <div class="new-comment">
                    <h3>Add Comment</h3>
                    <textarea id="newComment" class="input" rows="4"></textarea>
                    <button class="button" onclick="addComment()">Add Comment</button>
                </div>
                
                <div class="actions">
                    ${issue.state === 'open' ?
                        '<button class="button" onclick="closeIssue()">Close Issue</button>' :
                        '<button class="button" onclick="reopenIssue()">Reopen Issue</button>'
                    }
                    <button class="button" onclick="editIssue()">Edit Issue</button>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function addComment() {
                    const body = document.getElementById('newComment').value;
                    if (body.trim()) {
                        vscode.postMessage({
                            type: 'comment',
                            body: body
                        });
                        document.getElementById('newComment').value = '';
                    }
                }
                
                function closeIssue() {
                    vscode.postMessage({ type: 'close' });
                }
                
                function reopenIssue() {
                    vscode.postMessage({ type: 'reopen' });
                }
                
                function editIssue() {
                    vscode.postMessage({ type: 'edit' });
                }
            </script>
        </body>
        </html>`;
    }
}
