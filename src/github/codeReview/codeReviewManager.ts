import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { CodeReviewWebview } from './codeReviewWebview';
import { DiffViewProvider } from './diffViewProvider';

export interface ReviewComment {
    path: string;
    position: number;
    body: string;
    line?: number;
    side?: 'LEFT' | 'RIGHT';
    startLine?: number;
    endLine?: number;
}

export class CodeReviewManager {
    private reviewWebview: CodeReviewWebview | undefined;
    private diffProvider: DiffViewProvider;
    private reviewDecorations: vscode.TextEditorDecorationType[];
    private commentThreads: Map<string, vscode.CommentThread[]>;

    constructor(
        private octokit: Octokit,
        private extensionUri: vscode.Uri,
        private context: vscode.ExtensionContext
    ) {
        this.diffProvider = new DiffViewProvider(extensionUri);
        this.reviewDecorations = [];
        this.commentThreads = new Map();
        this.registerCommentController();
    }

    private registerCommentController() {
        const commentController = vscode.comments.createCommentController(
            'sshxplorer.codeReview',
            'Code Review Comments'
        );
        this.context.subscriptions.push(commentController);

        commentController.commentingRangeProvider = {
            provideCommentingRanges: (document: vscode.TextDocument) => {
                // Allow comments on any line of code
                return [new vscode.Range(0, 0, document.lineCount - 1, 0)];
            }
        };
    }

    public async startReview(owner: string, repo: string, pullNumber: number): Promise<void> {
        try {
            // Get pull request details
            const { data: pr } = await this.octokit.pulls.get({
                owner,
                repo,
                pull_number: pullNumber
            });

            // Get the changed files
            const { data: files } = await this.octokit.pulls.listFiles({
                owner,
                repo,
                pull_number: pullNumber
            });

            // Get existing review comments
            const { data: comments } = await this.octokit.pulls.listReviewComments({
                owner,
                repo,
                pull_number: pullNumber
            });

            // Show the review interface
            this.reviewWebview = new CodeReviewWebview(
                this.extensionUri,
                {
                    pullRequest: pr,
                    files,
                    comments
                },
                async (action) => {
                    await this.handleReviewAction(owner, repo, pullNumber, action);
                }
            );

            await this.reviewWebview.show();

            // Create diff views for changed files
            await this.showFileDiffs(files);

            // Add existing comments to the files
            await this.showExistingComments(comments);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start code review: ${error.message}`);
        }
    }

    private async showFileDiffs(files: any[]): Promise<void> {
        for (const file of files) {
            const diffUri = this.diffProvider.createDiffDocument(file);
            await vscode.workspace.openTextDocument(diffUri);
        }
    }

    private async showExistingComments(comments: any[]): Promise<void> {
        // Group comments by file
        const commentsByFile = new Map<string, any[]>();
        comments.forEach(comment => {
            const fileComments = commentsByFile.get(comment.path) || [];
            fileComments.push(comment);
            commentsByFile.set(comment.path, fileComments);
        });

        // Add comment threads for each file
        for (const [path, fileComments] of commentsByFile.entries()) {
            const uri = vscode.Uri.file(path);
            const document = await vscode.workspace.openTextDocument(uri);
            const threads: vscode.CommentThread[] = [];

            for (const comment of fileComments) {
                const range = new vscode.Range(
                    comment.line - 1,
                    0,
                    comment.line - 1,
                    0
                );

                const thread = vscode.comments.createCommentThread(uri, range, [
                    this.createComment(comment)
                ]);

                threads.push(thread);
            }

            this.commentThreads.set(path, threads);
        }
    }

    private createComment(comment: any): vscode.Comment {
        return {
            body: new vscode.MarkdownString(comment.body),
            author: {
                name: comment.user.login,
                iconPath: vscode.Uri.parse(comment.user.avatar_url)
            },
            timestamp: new Date(comment.created_at),
            mode: vscode.CommentMode.Preview
        };
    }

    public async addReviewComment(
        owner: string,
        repo: string,
        pullNumber: number,
        comment: ReviewComment
    ): Promise<void> {
        try {
            const { data: newComment } = await this.octokit.pulls.createReviewComment({
                owner,
                repo,
                pull_number: pullNumber,
                body: comment.body,
                commit_id: comment.commit_id,
                path: comment.path,
                position: comment.position,
                line: comment.line,
                side: comment.side,
                start_line: comment.startLine,
                start_side: comment.side
            });

            // Add the new comment to the UI
            const uri = vscode.Uri.file(comment.path);
            const range = new vscode.Range(
                comment.line! - 1,
                0,
                comment.line! - 1,
                0
            );

            const thread = vscode.comments.createCommentThread(uri, range, [
                this.createComment(newComment)
            ]);

            const threads = this.commentThreads.get(comment.path) || [];
            threads.push(thread);
            this.commentThreads.set(comment.path, threads);

            vscode.window.showInformationMessage('Comment added successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add comment: ${error.message}`);
        }
    }

    public async submitReview(
        owner: string,
        repo: string,
        pullNumber: number,
        event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
        body?: string
    ): Promise<void> {
        try {
            await this.octokit.pulls.createReview({
                owner,
                repo,
                pull_number: pullNumber,
                event,
                body
            });

            vscode.window.showInformationMessage(`Review submitted: ${event}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to submit review: ${error.message}`);
        }
    }

    private async handleReviewAction(owner: string, repo: string, pullNumber: number, action: any): Promise<void> {
        switch (action.type) {
            case 'addComment':
                await this.addReviewComment(owner, repo, pullNumber, action.comment);
                break;

            case 'submitReview':
                await this.submitReview(
                    owner,
                    repo,
                    pullNumber,
                    action.event,
                    action.body
                );
                break;

            case 'resolveThread':
                await this.resolveCommentThread(owner, repo, pullNumber, action.threadId);
                break;
        }
    }

    private async resolveCommentThread(owner: string, repo: string, pullNumber: number, threadId: string): Promise<void> {
        try {
            await this.octokit.pulls.updateReviewComment({
                owner,
                repo,
                pull_number: pullNumber,
                comment_id: parseInt(threadId),
                body: '✅ Resolved'
            });

            // Update UI to show resolved state
            const thread = Array.from(this.commentThreads.values())
                .flat()
                .find(t => t.threadId === threadId);

            if (thread) {
                thread.collapsibleState = vscode.CommentThreadCollapsibleState.Collapsed;
                thread.canReply = false;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to resolve comment thread: ${error.message}`);
        }
    }

    public dispose() {
        this.reviewDecorations.forEach(d => d.dispose());
        this.diffProvider.dispose();
        Array.from(this.commentThreads.values())
            .flat()
            .forEach(thread => thread.dispose());
    }
}
