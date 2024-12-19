import * as vscode from 'vscode';

interface CodeReviewOptions {
    pullRequest: any;
    files: any[];
    comments: any[];
}

export class CodeReviewWebview {
    private panel: vscode.WebviewPanel | undefined;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly options: CodeReviewOptions,
        private readonly onAction: (action: any) => Promise<void>
    ) {}

    public async show(): Promise<void> {
        this.panel = vscode.window.createWebviewPanel(
            'codeReview',
            `Review PR #${this.options.pullRequest.number}`,
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.extensionUri]
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

    private getWebviewContent(): string {
        const styleUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'github', 'style.css')
        );

        const pr = this.options.pullRequest;
        const files = this.options.files;
        const comments = this.options.comments;

        const filesHtml = files.map(file => `
            <div class="file-entry" data-path="${file.filename}">
                <div class="file-header">
                    <span class="file-name">${file.filename}</span>
                    <span class="file-stats">
                        <span class="additions">+${file.additions}</span>
                        <span class="deletions">-${file.deletions}</span>
                        <span class="changes">${file.changes} changes</span>
                    </span>
                </div>
                <div class="file-comments">
                    ${this.getFileCommentsHtml(file.filename, comments)}
                </div>
            </div>
        `).join('\\n');

        return `<!DOCTYPE html>
        <html>
        <head>
            <link href="${styleUri}" rel="stylesheet">
            <title>Code Review</title>
            <style>
                .review-header {
                    padding: 15px;
                    border-bottom: 1px solid var(--vscode-widget-border);
                    margin-bottom: 20px;
                }
                .file-entry {
                    margin-bottom: 15px;
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .file-header {
                    padding: 10px;
                    background: var(--vscode-editor-background);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .file-stats {
                    font-size: 12px;
                }
                .additions {
                    color: var(--vscode-gitDecoration-addedResourceForeground);
                    margin-right: 8px;
                }
                .deletions {
                    color: var(--vscode-gitDecoration-deletedResourceForeground);
                    margin-right: 8px;
                }
                .changes {
                    color: var(--vscode-gitDecoration-modifiedResourceForeground);
                }
                .file-comments {
                    padding: 10px;
                }
                .comment {
                    margin: 10px 0;
                    padding: 8px;
                    background: var(--vscode-editor-background);
                    border-radius: 4px;
                }
                .comment-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                    font-size: 12px;
                }
                .review-actions {
                    margin-top: 20px;
                    padding: 15px;
                    border-top: 1px solid var(--vscode-widget-border);
                }
                .review-comment-input {
                    width: 100%;
                    min-height: 100px;
                    margin: 10px 0;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 8px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="review-header">
                    <h2>Reviewing Pull Request #${pr.number}</h2>
                    <div>${pr.title}</div>
                    <div class="pr-meta">
                        ${pr.changed_files} files changed
                        · ${pr.additions} additions
                        · ${pr.deletions} deletions
                    </div>
                </div>

                <div class="files-section">
                    <h3>Changed Files</h3>
                    ${filesHtml}
                </div>

                <div class="review-actions">
                    <h3>Submit Review</h3>
                    <textarea id="reviewComment" class="review-comment-input" 
                        placeholder="Leave a review comment..."></textarea>
                    <div class="button-group">
                        <button class="button" onclick="submitReview('APPROVE')">
                            Approve
                        </button>
                        <button class="button" onclick="submitReview('REQUEST_CHANGES')">
                            Request Changes
                        </button>
                        <button class="button" onclick="submitReview('COMMENT')">
                            Comment
                        </button>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function submitReview(event) {
                    const comment = document.getElementById('reviewComment').value;
                    vscode.postMessage({
                        type: 'submitReview',
                        event: event,
                        body: comment
                    });
                }

                // Handle file clicks to open diffs
                document.querySelectorAll('.file-entry').forEach(file => {
                    file.addEventListener('click', () => {
                        vscode.postMessage({
                            type: 'openFile',
                            path: file.dataset.path
                        });
                    });
                });
            </script>
        </body>
        </html>`;
    }

    private getFileCommentsHtml(filename: string, comments: any[]): string {
        const fileComments = comments.filter(c => c.path === filename);
        if (fileComments.length === 0) {
            return '';
        }

        return fileComments.map(comment => `
            <div class="comment">
                <div class="comment-header">
                    <span class="commenter">${comment.user.login}</span>
                    <span class="comment-line">Line ${comment.line}</span>
                </div>
                <div class="comment-body">${comment.body}</div>
            </div>
        `).join('\\n');
    }

    public dispose() {
        this.panel?.dispose();
    }
}
