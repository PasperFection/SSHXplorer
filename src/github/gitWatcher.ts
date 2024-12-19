import * as vscode from 'vscode';
import * as path from 'path';
import { GitHubStatusBar } from './statusBar';
import { GitHubManager } from './githubManager';
import * as simpleGit from 'simple-git';

export class GitWatcher {
    private fileSystemWatcher: vscode.FileSystemWatcher;
    private debounceTimer: NodeJS.Timeout | undefined;
    private isWatching: boolean = false;

    constructor(
        private workspaceRoot: string,
        private statusBar: GitHubStatusBar,
        private githubManager: GitHubManager
    ) {
        this.fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(workspaceRoot, '**/*'),
            false, // Don't ignore create
            false, // Don't ignore change
            false  // Don't ignore delete
        );

        this.setupWatcher();
    }

    private setupWatcher() {
        // Watch for file changes
        this.fileSystemWatcher.onDidChange(this.onFileChange.bind(this));
        this.fileSystemWatcher.onDidCreate(this.onFileChange.bind(this));
        this.fileSystemWatcher.onDidDelete(this.onFileChange.bind(this));
    }

    private async onFileChange(uri: vscode.Uri) {
        if (!this.isWatching) return;

        // Debounce the git status check
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(async () => {
            try {
                const git = simpleGit(this.workspaceRoot);
                const status = await git.status();

                if (status.modified.length > 0 || 
                    status.not_added.length > 0 || 
                    status.deleted.length > 0) {
                    this.statusBar.updateStatus('syncing');
                    
                    // Check if changes need to be committed
                    const needsCommit = await this.checkNeedsCommit(git);
                    if (needsCommit) {
                        vscode.window.showInformationMessage(
                            'There are uncommitted changes in your repository.',
                            'Commit Changes'
                        ).then(selection => {
                            if (selection === 'Commit Changes') {
                                vscode.commands.executeCommand('sshxplorer.commitChanges');
                            }
                        });
                    }
                } else {
                    this.statusBar.updateStatus('synced');
                }
            } catch (error) {
                this.statusBar.updateStatus('error', error.message);
                console.error('Git status check failed:', error);
            }
        }, 1000); // Debounce for 1 second
    }

    private async checkNeedsCommit(git: simpleGit.SimpleGit): Promise<boolean> {
        const status = await git.status();
        return status.modified.length > 0 || 
               status.not_added.length > 0 || 
               status.deleted.length > 0;
    }

    public startWatching() {
        this.isWatching = true;
        this.statusBar.updateStatus('synced');
    }

    public stopWatching() {
        this.isWatching = false;
        this.statusBar.hide();
    }

    public dispose() {
        this.fileSystemWatcher.dispose();
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }
}
