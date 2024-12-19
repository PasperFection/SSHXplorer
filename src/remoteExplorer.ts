import * as vscode from 'vscode';
import * as path from 'path';
import { ConnectionManager } from './connectionManager';

export class RemoteExplorer {
    private treeDataProvider: RemoteTreeDataProvider;

    constructor(private connectionManager: ConnectionManager) {
        this.treeDataProvider = new RemoteTreeDataProvider(connectionManager);
        vscode.window.createTreeView('sshxplorer-files', {
            treeDataProvider: this.treeDataProvider
        });

        // Register refresh command
        vscode.commands.registerCommand('sshxplorer.refreshExplorer', () => {
            this.treeDataProvider.refresh();
        });

        // Update view when connection changes
        connectionManager.onDidChangeConnection(() => {
            this.treeDataProvider.refresh();
        });
    }
}

class RemoteTreeDataProvider implements vscode.TreeDataProvider<RemoteItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<RemoteItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private connectionManager: ConnectionManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: RemoteItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: RemoteItem): Promise<RemoteItem[]> {
        if (!this.connectionManager.getCurrentConnection()) {
            return [];
        }

        try {
            const client = await this.connectionManager.getClient();
            return new Promise((resolve, reject) => {
                client.sftp((err, sftp) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const path = element ? element.path : '/';
                    sftp.readdir(path, (err, list) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        const items = list.map(item => {
                            const fullPath = `${path}/${item.filename}`.replace(/\/+/g, '/');
                            return new RemoteItem(
                                item.filename,
                                fullPath,
                                item.attrs.isDirectory() ? 
                                    vscode.TreeItemCollapsibleState.Collapsed : 
                                    vscode.TreeItemCollapsibleState.None,
                                item.attrs.isDirectory() ? 'folder' : 'file'
                            );
                        });

                        // Sort directories first, then files
                        items.sort((a, b) => {
                            if (a.contextValue === b.contextValue) {
                                return a.label!.localeCompare(b.label!);
                            }
                            return a.contextValue === 'folder' ? -1 : 1;
                        });

                        resolve(items);
                    });
                });
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to list directory: ${error.message}`);
            return [];
        }
    }
}

class RemoteItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly path: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string
    ) {
        super(label, collapsibleState);

        this.tooltip = path;
        this.description = path;

        if (contextValue === 'file') {
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.parse(`ssh://${path}`)]
            };
        }

        this.iconPath = contextValue === 'folder' 
            ? new vscode.ThemeIcon('folder')
            : new vscode.ThemeIcon('file');
    }
}
