import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { IssueWebview } from './issueWebview';

export interface IssueDetails {
    title: string;
    body: string;
    assignees?: string[];
    labels?: string[];
    milestone?: number;
}

export class IssueManager {
    private issueWebview: IssueWebview | undefined;

    constructor(
        private octokit: Octokit,
        private extensionUri: vscode.Uri
    ) {}

    public async createIssue(owner: string, repo: string, details: IssueDetails): Promise<void> {
        try {
            const { data: issue } = await this.octokit.issues.create({
                owner,
                repo,
                title: details.title,
                body: details.body,
                assignees: details.assignees,
                labels: details.labels,
                milestone: details.milestone
            });

            vscode.window.showInformationMessage(`Issue created: ${issue.html_url}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create issue: ${error.message}`);
            throw error;
        }
    }

    public async showCreateIssueUI(owner: string, repo: string): Promise<void> {
        try {
            // Get repository collaborators for assignee suggestions
            const { data: collaborators } = await this.octokit.repos.listCollaborators({
                owner,
                repo
            });

            // Get repository labels
            const { data: labels } = await this.octokit.issues.listLabelsForRepo({
                owner,
                repo
            });

            // Get milestones
            const { data: milestones } = await this.octokit.issues.listMilestones({
                owner,
                repo
            });

            // Show issue creation webview
            this.issueWebview = new IssueWebview(
                this.extensionUri,
                {
                    collaborators: collaborators.map(c => c.login),
                    labels: labels.map(l => ({ name: l.name, color: l.color })),
                    milestones: milestones.map(m => ({
                        number: m.number,
                        title: m.title
                    }))
                },
                async (details) => {
                    await this.createIssue(owner, repo, details);
                }
            );

            await this.issueWebview.show();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load issue creation UI: ${error.message}`);
        }
    }

    public async listIssues(owner: string, repo: string): Promise<void> {
        try {
            const { data: issues } = await this.octokit.issues.listForRepo({
                owner,
                repo,
                state: 'open'
            });

            const items = issues.map(issue => ({
                label: `#${issue.number} ${issue.title}`,
                description: `by ${issue.user?.login} · ${issue.comments} comments`,
                detail: issue.body,
                issue: issue
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select an issue to view',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                await this.showIssueDetails(owner, repo, selected.issue.number);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to list issues: ${error.message}`);
        }
    }

    private async showIssueDetails(owner: string, repo: string, issueNumber: number): Promise<void> {
        try {
            // Get issue details
            const { data: issue } = await this.octokit.issues.get({
                owner,
                repo,
                issue_number: issueNumber
            });

            // Get issue comments
            const { data: comments } = await this.octokit.issues.listComments({
                owner,
                repo,
                issue_number: issueNumber
            });

            // Get available labels and milestones for editing
            const [{ data: labels }, { data: milestones }] = await Promise.all([
                this.octokit.issues.listLabelsForRepo({ owner, repo }),
                this.octokit.issues.listMilestones({ owner, repo })
            ]);

            // Show issue details in webview
            this.issueWebview = new IssueWebview(
                this.extensionUri,
                {
                    issue,
                    comments,
                    labels: labels.map(l => ({ name: l.name, color: l.color })),
                    milestones: milestones.map(m => ({
                        number: m.number,
                        title: m.title
                    }))
                },
                async (action) => {
                    await this.handleIssueAction(owner, repo, issueNumber, action);
                }
            );

            await this.issueWebview.show();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to show issue details: ${error.message}`);
        }
    }

    private async handleIssueAction(owner: string, repo: string, issueNumber: number, action: any): Promise<void> {
        try {
            switch (action.type) {
                case 'comment':
                    await this.octokit.issues.createComment({
                        owner,
                        repo,
                        issue_number: issueNumber,
                        body: action.body
                    });
                    vscode.window.showInformationMessage('Comment added!');
                    break;

                case 'close':
                    await this.octokit.issues.update({
                        owner,
                        repo,
                        issue_number: issueNumber,
                        state: 'closed'
                    });
                    vscode.window.showInformationMessage('Issue closed!');
                    break;

                case 'reopen':
                    await this.octokit.issues.update({
                        owner,
                        repo,
                        issue_number: issueNumber,
                        state: 'open'
                    });
                    vscode.window.showInformationMessage('Issue reopened!');
                    break;

                case 'update':
                    await this.octokit.issues.update({
                        owner,
                        repo,
                        issue_number: issueNumber,
                        ...action.details
                    });
                    vscode.window.showInformationMessage('Issue updated!');
                    break;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to perform action: ${error.message}`);
        }
    }
}
