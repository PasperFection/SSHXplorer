import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { ConnectionManager } from '../../connectionManager';
import { SSHFileSystemProvider } from '../../fileSystemProvider';
import { RemoteExplorer } from '../../remoteExplorer';

suite('SSHXplorer Extension Test Suite', () => {
    vscode.window.showInformationMessage('Starting test suite');

    test('Connection Manager Tests', async () => {
        const context = {
            subscriptions: [],
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve()
            },
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve()
            }
        };

        const connectionManager = new ConnectionManager(context as any);
        
        // Test connection configuration validation
        const validConfig = {
            host: 'test.example.com',
            port: 22,
            username: 'testuser',
            privateKeyPath: '/path/to/key'
        };
        
        assert.doesNotThrow(() => connectionManager.validateConfig(validConfig));
        
        const invalidConfig = {
            host: '',
            port: -1,
            username: ''
        };
        
        assert.throws(() => connectionManager.validateConfig(invalidConfig));
    });

    test('File System Provider Tests', async () => {
        const connectionManager = new ConnectionManager({} as any);
        const fsProvider = new SSHFileSystemProvider(connectionManager);

        // Test URI parsing
        const uri = vscode.Uri.parse('ssh://test.example.com/path/to/file');
        assert.strictEqual(fsProvider.getHostFromUri(uri), 'test.example.com');
        assert.strictEqual(fsProvider.getPathFromUri(uri), '/path/to/file');
    });

    test('Remote Explorer Tests', () => {
        const connectionManager = new ConnectionManager({} as any);
        const explorer = new RemoteExplorer(connectionManager);

        assert.ok(explorer.getTreeItem);
        assert.ok(explorer.getChildren);
    });
});
