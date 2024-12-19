import * as vscode from 'vscode';
import { GitHubManager } from '../githubManager';
import { GitHubRepository } from '../models/githubRepository';

export class GitHubViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'sshxplorer.githubView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _githubManager: GitHubManager
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'clone':
                    const repoUrl = await vscode.window.showInputBox({
                        prompt: 'Enter GitHub repository URL',
                        placeHolder: 'https://github.com/owner/repo'
                    });
                    if (repoUrl) {
                        const localPath = await vscode.window.showInputBox({
                            prompt: 'Enter local path for cloning',
                            placeHolder: '/path/to/local/directory'
                        });
                        if (localPath) {
                            try {
                                await this._githubManager.cloneRepository(repoUrl, localPath);
                                vscode.window.showInformationMessage(`Successfully cloned ${repoUrl}`);
                            } catch (error) {
                                vscode.window.showErrorMessage(`Failed to clone: ${error.message}`);
                            }
                        }
                    }
                    break;

                case 'createPR':
                    // Handle PR creation
                    break;

                case 'viewIssues':
                    // Handle issues view
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'github', 'style.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'github', 'main.js'));

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>GitHub Integration</title>
        </head>
        <body>
            <div class="container">
                <div class="section">
                    <h2>Repository Actions</h2>
                    <button class="button" onclick="cloneRepo()">Clone Repository</button>
                    <button class="button" onclick="createPR()">Create Pull Request</button>
                    <button class="button" onclick="viewIssues()">View Issues</button>
                </div>
                <div class="section" id="repoList">
                    <h2>Recent Repositories</h2>
                    <!-- Repository list will be populated dynamically -->
                </div>
            </div>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    public updateRepository(repository: GitHubRepository) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateRepository',
                repository: repository
            });
        }
    }
}
