import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConnectionManager } from '../../connection/connectionManager';
import { SSHConnection } from '../../connection/sshConnection';
import { TestServer } from './helpers/testServer';
import { TreeNode } from '../../views/treeNode';
import { FileNode } from '../../views/fileNode';

suite('UI Tests', () => {
    let testServer: TestServer;
    let connectionManager: ConnectionManager;

    setup(async () => {
        testServer = new TestServer();
        await testServer.start();

        connectionManager = new ConnectionManager();
    });

    teardown(async () => {
        await testServer.stop();
        connectionManager.dispose();
    });

    test('should show connection status in status bar', async () => {
        const config = {
            host: 'localhost',
            port: testServer.getPort(),
            username: 'test',
            password: 'test'
        };

        const connection = await connectionManager.createConnection(config);
        assert.ok(connection.isActive());

        // Wait for status bar to update
        await new Promise(resolve => setTimeout(resolve, 100));

        const statusBarItems = await vscode.window.createStatusBarItem();
        const connectionStatus = statusBarItems;
        assert.ok(connectionStatus);
        assert.ok(connectionStatus.text.includes('Connected'));
    });

    test('should update explorer view on connection change', async () => {
        const config = {
            host: 'localhost',
            port: testServer.getPort(),
            username: 'test',
            privateKey: testServer.getPrivateKey()
        };

        const connection = await connectionManager.createConnection(config);
        assert.ok(connection.isActive());

        // Wait for explorer to update
        await new Promise(resolve => setTimeout(resolve, 100));

        const rootNode = new FileNode(
            'localhost',
            vscode.TreeItemCollapsibleState.Collapsed,
            connection,
            '/'
        );

        const treeDataProvider = new class implements vscode.TreeDataProvider<TreeNode> {
            getTreeItem(element: TreeNode): vscode.TreeItem {
                return element;
            }
            getChildren(): Promise<TreeNode[]> {
                return Promise.resolve([rootNode]);
            }
            onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>().event;
        };

        const explorerView = vscode.window.createTreeView('sshxplorer.remoteExplorer', {
            treeDataProvider
        });

        const items = await explorerView.reveal(rootNode);
        assert.ok(items);
    });

    test('should handle quick pick for connection selection', async () => {
        const config = {
            host: 'localhost',
            port: testServer.getPort(),
            username: 'test',
            privateKey: testServer.getPrivateKey()
        };

        const connection = await connectionManager.createConnection(config);
        assert.ok(connection.isActive());

        const quickPickItems: vscode.QuickPickItem[] = [{
            label: `localhost:${testServer.getPort()}`,
            description: 'test@localhost'
        }];

        const showQuickPick = vscode.window.showQuickPick;
        vscode.window.showQuickPick = async function<T extends vscode.QuickPickItem>(
            items: readonly T[] | Thenable<readonly T[]>,
            _options?: vscode.QuickPickOptions,
            _token?: vscode.CancellationToken
        ): Promise<T | undefined> {
            const resolvedItems = await Promise.resolve(items);
            assert.deepStrictEqual(resolvedItems, quickPickItems);
            return quickPickItems[0] as T;
        };

        await vscode.commands.executeCommand('sshxplorer.selectConnection');

        vscode.window.showQuickPick = showQuickPick;
        assert.ok(quickPickItems.length > 0);
        assert.ok(quickPickItems[0].label.includes('localhost'));
    });
});
