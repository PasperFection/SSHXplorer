import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConnectionManager } from '../../connectionManager';
import { SSHFileSystemProvider } from '../../fileSystemProvider';
import { MockSSHServer } from '../mocks/mockSSHServer';
import { CompressionManager } from '../../compression';
import * as path from 'path';

suite('Performance Tests', () => {
    let connectionManager: ConnectionManager;
    let fileSystemProvider: SSHFileSystemProvider;
    let mockServer: MockSSHServer;
    let mockContext: vscode.ExtensionContext;
    const testWorkspacePath = path.resolve(__dirname, '../../../');

    suiteSetup(async () => {
        mockServer = new MockSSHServer();
        await mockServer.start();

        // Create a mock extension context
        mockContext = {
            subscriptions: [],
            extensionPath: testWorkspacePath,
            globalState: {
                get: () => undefined,
                update: async () => undefined,
                keys: () => []
            } as any,
            workspaceState: {
                get: () => undefined,
                update: async () => undefined,
                keys: () => []
            } as any,
            secrets: {
                get: async () => undefined,
                store: async () => undefined,
                delete: async () => undefined
            },
            extensionUri: vscode.Uri.file(testWorkspacePath),
            environmentVariableCollection: new vscode.EnvironmentVariableCollection(),
            storageUri: vscode.Uri.file(path.join(testWorkspacePath, '.storage')),
            globalStorageUri: vscode.Uri.file(path.join(testWorkspacePath, '.global-storage')),
            logUri: vscode.Uri.file(path.join(testWorkspacePath, '.logs')),
            extensionMode: vscode.ExtensionMode.Test,
            extension: {
                id: 'test.sshxplorer',
                extensionUri: vscode.Uri.file(testWorkspacePath),
                extensionPath: testWorkspacePath,
                isActive: true,
                packageJSON: {},
                exports: undefined,
                activate: async () => undefined,
            },
            asAbsolutePath: (relativePath: string) => path.resolve(testWorkspacePath, relativePath),
            storagePath: path.join(testWorkspacePath, '.storage'),
            globalStoragePath: path.join(testWorkspacePath, '.global-storage'),
            logPath: path.join(testWorkspacePath, '.logs'),
            extensionRuntime: vscode.ExtensionRuntime.Node
        } as vscode.ExtensionContext;
    });

    setup(async () => {
        connectionManager = new ConnectionManager(mockContext);
        fileSystemProvider = new SSHFileSystemProvider(connectionManager);
        
        const connection = await connectionManager.connect({
            host: 'localhost',
            port: mockServer.port,
            username: 'test',
            password: 'test'
        });

        await mockServer.createTestFiles(100);
    });

    teardown(async () => {
        await connectionManager.dispose();
    });

    suiteTeardown(async () => {
        await mockServer.stop();
    });

    test('should handle large file write operations', async () => {
        const uri = vscode.Uri.parse(`ssh://test@localhost:${mockServer.port}/largefile.txt`);
        const largeContent = Buffer.from('x'.repeat(1024 * 1024)); // 1MB file

        const startTime = Date.now();
        await fileSystemProvider.writeFile(uri, largeContent, { create: true, overwrite: true });
        const endTime = Date.now();

        assert.ok(endTime - startTime < 5000, 'Large file write took too long');
    });

    test('should handle large file read operations', async () => {
        const uri = vscode.Uri.parse(`ssh://test@localhost:${mockServer.port}/largefile.txt`);
        const largeContent = Buffer.from('x'.repeat(1024 * 1024)); // 1MB file
        
        await fileSystemProvider.writeFile(uri, largeContent, { create: true, overwrite: true });

        const startTime = Date.now();
        const content = await fileSystemProvider.readFile(uri);
        const endTime = Date.now();

        assert.ok(endTime - startTime < 5000, 'Large file read took too long');
        assert.strictEqual(content.length, largeContent.length);
    });

    test('should efficiently compress and decompress data', async () => {
        const testData = Buffer.from('x'.repeat(1024 * 1024)); // 1MB of repeating data

        const startTime = Date.now();
        const compressed = await CompressionManager.compress(testData);
        const decompressed = await CompressionManager.decompress(compressed);
        const endTime = Date.now();

        assert.ok(endTime - startTime < 1000, 'Compression/decompression took too long');
        assert.ok(compressed.length < testData.length, 'Compression did not reduce data size');
        assert.deepStrictEqual(decompressed, testData, 'Decompressed data does not match original');
    });

    test('should handle concurrent file operations', async () => {
        const uri = vscode.Uri.parse(`ssh://test@localhost:${mockServer.port}/concurrent.txt`);
        const content = Buffer.from('test content');

        const startTime = Date.now();
        await Promise.all([
            fileSystemProvider.writeFile(uri, content, { create: true, overwrite: true }),
            fileSystemProvider.readFile(uri),
            fileSystemProvider.writeFile(uri, content, { create: true, overwrite: true })
        ]);
        const endTime = Date.now();

        assert.ok(endTime - startTime < 5000, 'Concurrent operations took too long');
    });

    test('should efficiently compress large datasets', async () => {
        const largeData = Buffer.from('x'.repeat(5 * 1024 * 1024)); // 5MB of repeating data

        const startTime = Date.now();
        const compressed = await CompressionManager.compress(largeData);
        const endTime = Date.now();

        assert.ok(endTime - startTime < 5000, 'Large dataset compression took too long');
        assert.ok(compressed.length < largeData.length * 0.5, 'Compression ratio is not efficient');
    });

    test('should handle directory listing performance', async () => {
        const uri = vscode.Uri.parse(`ssh://test@localhost:${mockServer.port}/`);

        const startTime = Date.now();
        const entries = await fileSystemProvider.readDirectory(uri);
        const endTime = Date.now();

        assert.ok(endTime - startTime < 2000, 'Directory listing took too long');
        assert.ok(entries.length > 0, 'No entries found in directory');
    });
});
