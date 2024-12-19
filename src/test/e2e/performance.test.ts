import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConnectionManager } from '../../connection/connectionManager';
import { SSHFileSystemProvider } from '../../fileSystem/sshFileSystemProvider';
import { TestServer } from './helpers/testServer';
import { CompressionManager } from '../../compression/compressionManager';

suite('Performance Tests', () => {
    let testServer: TestServer;
    let connectionManager: ConnectionManager;
    let fileSystemProvider: SSHFileSystemProvider;
    let compressionManager: CompressionManager;

    setup(async () => {
        testServer = new TestServer();
        await testServer.start();

        connectionManager = new ConnectionManager();
        const config = {
            host: 'localhost',
            port: testServer.getPort(),
            username: 'test',
            password: 'test'
        };

        const connection = await connectionManager.createConnection(config);
        fileSystemProvider = new SSHFileSystemProvider(connection);
        compressionManager = new CompressionManager();
    });

    teardown(async () => {
        await testServer.stop();
        connectionManager.dispose();
    });

    test('should handle large file operations efficiently', async function() {
        this.timeout(30000); // Allow 30 seconds for large file operations

        const uri = vscode.Uri.parse(`ssh://localhost:${testServer.getPort()}/large.txt`);
        const size = 10 * 1024 * 1024; // 10MB
        const content = Buffer.alloc(size, 'a');

        console.time('writeFile');
        await fileSystemProvider.writeFile(uri, content, { create: true, overwrite: true });
        console.timeEnd('writeFile');

        console.time('readFile');
        const readContent = await fileSystemProvider.readFile(uri);
        console.timeEnd('readFile');

        assert.strictEqual(readContent.length, size);
    });

    test('should handle concurrent operations efficiently', async function() {
        this.timeout(30000);

        const baseUri = vscode.Uri.parse(`ssh://localhost:${testServer.getPort()}/`);
        const operations = Array.from({ length: 10 }, (_, i) => {
            const uri = vscode.Uri.parse(`${baseUri.toString()}file${i}.txt`);
            const content = Buffer.from(`content${i}`);
            return fileSystemProvider.writeFile(uri, content, { create: true, overwrite: true });
        });

        console.time('concurrentWrites');
        await Promise.all(operations);
        console.timeEnd('concurrentWrites');
    });

    test('should handle directory operations efficiently', async function() {
        this.timeout(30000);

        const baseUri = vscode.Uri.parse(`ssh://localhost:${testServer.getPort()}/testdir`);
        
        console.time('createDirectories');
        await fileSystemProvider.createDirectory(baseUri);
        
        const createFiles = Array.from({ length: 100 }, (_, i) => {
            const uri = vscode.Uri.parse(`${baseUri.toString()}/file${i}.txt`);
            return fileSystemProvider.writeFile(uri, Buffer.from(`content${i}`), { create: true, overwrite: true });
        });
        
        await Promise.all(createFiles);
        console.timeEnd('createDirectories');

        console.time('readDirectory');
        const entries = await fileSystemProvider.readDirectory(baseUri);
        console.timeEnd('readDirectory');

        assert.strictEqual(entries.length, 100);

        console.time('deleteDirectory');
        await fileSystemProvider.delete(baseUri, { recursive: true });
        console.timeEnd('deleteDirectory');
    });

    test('should handle compression efficiently', async function() {
        this.timeout(30000);

        const size = 5 * 1024 * 1024; // 5MB
        const data = Buffer.alloc(size, 'a');

        console.time('compression');
        const compressed = await compressionManager.compress(data);
        console.timeEnd('compression');

        console.time('decompression');
        const decompressed = await compressionManager.decompress(compressed);
        console.timeEnd('decompression');

        assert.strictEqual(decompressed.length, size);
        assert.ok(compressed.length < size, 'Compressed size should be smaller than original');
    });
});
