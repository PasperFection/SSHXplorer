import * as vscode from 'vscode';

export class GitHubStatusBar {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'sshxplorer.showGitHubStatus';
    }

    public updateStatus(status: 'synced' | 'syncing' | 'error', message?: string) {
        switch (status) {
            case 'synced':
                this.statusBarItem.text = '$(check) GitHub: Synced';
                this.statusBarItem.tooltip = 'All changes are synced with GitHub';
                break;
            case 'syncing':
                this.statusBarItem.text = '$(sync~spin) GitHub: Syncing';
                this.statusBarItem.tooltip = 'Syncing changes with GitHub...';
                break;
            case 'error':
                this.statusBarItem.text = '$(error) GitHub: Error';
                this.statusBarItem.tooltip = message || 'Failed to sync with GitHub';
                break;
        }
        this.statusBarItem.show();
    }

    public hide() {
        this.statusBarItem.hide();
    }

    public dispose() {
        this.statusBarItem.dispose();
    }
}
