import * as vscode from 'vscode';
import { SimpleGit } from 'simple-git';
import { GitHubManager } from './githubManager';
import { GitHubStatusBar } from './statusBar';
import { MergeConflictResolver } from './mergeConflictResolver';

interface SyncOptions {
    pull?: boolean;
    push?: boolean;
}

export class RepositorySyncManager {
    private mergeConflictResolver: MergeConflictResolver;
    private workspaceRoot: string;

    constructor(
        private git: SimpleGit,
        private githubManager: GitHubManager,
        private statusBar: GitHubStatusBar,
        workspaceRoot: string
    ) {
        this.mergeConflictResolver = new MergeConflictResolver(git, githubManager);
        this.workspaceRoot = workspaceRoot;
    }

    async syncRepository(options: SyncOptions = { pull: true, push: true }): Promise<void> {
        try {
            this.statusBar.updateStatus('syncing');
            const repoPath = this.workspaceRoot;

            // Fetch latest changes
            await this.git.fetch();

            // Save current changes if any
            const status = await this.git.status();
            if (status.modified.length > 0 || status.not_added.length > 0) {
                await this.git.raw(['stash', 'save', 'Temporary stash before sync']);
            }

            // Pull latest changes
            if (options.pull) {
                try {
                    await this.git.pull();
                } catch (error) {
                    if (error instanceof Error) {
                        vscode.window.showErrorMessage(`Failed to pull changes: ${error.message}`);
                    }
                    return;
                }
            }

            // Restore stashed changes if any
            if (status.modified.length > 0 || status.not_added.length > 0) {
                try {
                    const stashList = await this.git.stashList();
                    if (stashList.total > 0) {
                        await this.git.raw(['stash', 'pop']);
                    }
                } catch (error) {
                    if (error instanceof Error) {
                        vscode.window.showErrorMessage(`Failed to restore stashed changes: ${error.message}`);
                    }
                    return;
                }
            }

            // Push changes if requested
            if (options.push) {
                await this.git.push();
            }

            this.statusBar.updateStatus('synced');
            vscode.window.showInformationMessage('Repository synchronized successfully!');
        } catch (error) {
            if (error instanceof Error) {
                this.statusBar.updateStatus('error', error.message);
                vscode.window.showErrorMessage(`Failed to sync repository: ${error.message}`);
            }
        }
    }

    async checkMergeConflicts(repoPath: string): Promise<boolean> {
        try {
            const status = await this.git.status();
            return status.conflicted.length > 0;
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to check merge conflicts: ${error.message}`);
            }
            return false;
        }
    }

    async createBranch(repoPath: string, branchName: string): Promise<boolean> {
        try {
            await this.git.checkoutLocalBranch(branchName);
            vscode.window.showInformationMessage(`Created and switched to branch: ${branchName}`);
            return true;
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to create branch: ${error.message}`);
            }
            return false;
        }
    }

    async switchBranch(repoPath: string, branchName: string): Promise<boolean> {
        try {
            await this.git.checkout([branchName]);
            vscode.window.showInformationMessage(`Switched to branch: ${branchName}`);
            return true;
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to switch branch: ${error.message}`);
            }
            return false;
        }
    }

    async commitChanges(repoPath: string, message: string): Promise<boolean> {
        try {
            await this.git.add(['.']);
            await this.git.commit(message);
            vscode.window.showInformationMessage('Changes committed successfully');
            return true;
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to commit changes: ${error.message}`);
            }
            return false;
        }
    }
}
