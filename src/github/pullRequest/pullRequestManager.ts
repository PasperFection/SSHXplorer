import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { GitHubManager } from '../githubManager';

interface PullRequestComment {
    id: number;
    body: string;
    user: {
        login: string;
    };
    created_at: string;
}

export class PullRequestManager {
    constructor(private githubManager: GitHubManager) {}

    async getPullRequests(owner: string, repo: string): Promise<any[]> {
        try {
            const octokit = this.githubManager.octokit;
            if (!octokit) {
                throw new Error('GitHub client not initialized');
            }

            const response = await octokit.pulls.list({
                owner,
                repo,
                state: 'open'
            });
            return response.data;
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to fetch pull requests: ${error.message}`);
            }
            return [];
        }
    }

    async createPullRequest(owner: string, repo: string, title: string, body: string, head: string, base: string): Promise<void> {
        try {
            const octokit = this.githubManager.octokit;
            if (!octokit) {
                throw new Error('GitHub client not initialized');
            }

            await octokit.pulls.create({
                owner,
                repo,
                title,
                body,
                head,
                base
            });
            vscode.window.showInformationMessage('Pull request created successfully');
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to create pull request: ${error.message}`);
            }
        }
    }

    async getPullRequestComments(owner: string, repo: string, pullNumber: number): Promise<PullRequestComment[]> {
        try {
            const octokit = this.githubManager.octokit;
            if (!octokit) {
                throw new Error('GitHub client not initialized');
            }

            const [issueComments, reviewComments] = await Promise.all([
                octokit.issues.listComments({
                    owner,
                    repo,
                    issue_number: pullNumber
                }),
                octokit.pulls.listReviewComments({
                    owner,
                    repo,
                    pull_number: pullNumber
                })
            ]);

            return [
                ...issueComments.data.map(comment => ({
                    id: comment.id,
                    body: comment.body || '',
                    user: { login: comment.user?.login || 'unknown' },
                    created_at: comment.created_at
                })),
                ...reviewComments.data.map(comment => ({
                    id: comment.id,
                    body: comment.body || '',
                    user: { login: comment.user?.login || 'unknown' },
                    created_at: comment.created_at
                }))
            ];
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to fetch pull request comments: ${error.message}`);
            }
            return [];
        }
    }

    async addComment(owner: string, repo: string, pullNumber: number, body: string): Promise<void> {
        try {
            const octokit = this.githubManager.octokit;
            if (!octokit) {
                throw new Error('GitHub client not initialized');
            }

            await octokit.issues.createComment({
                owner,
                repo,
                issue_number: pullNumber,
                body
            });
            vscode.window.showInformationMessage('Comment added successfully');
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to add comment: ${error.message}`);
            }
        }
    }

    async mergePullRequest(owner: string, repo: string, pullNumber: number): Promise<void> {
        try {
            const octokit = this.githubManager.octokit;
            if (!octokit) {
                throw new Error('GitHub client not initialized');
            }

            await octokit.pulls.merge({
                owner,
                repo,
                pull_number: pullNumber
            });
            vscode.window.showInformationMessage('Pull request merged successfully');
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to merge pull request: ${error.message}`);
            }
        }
    }
}
