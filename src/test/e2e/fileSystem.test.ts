import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConnectionManager } from '../../connection/connectionManager';
import { SSHFileSystemProvider } from '../../fileSystem/sshFileSystemProvider';
import { TestServer } from './helpers/testServer';

suite('FileSystem Tests', () => {
    let testServer: TestServer;
    let connectionManager: ConnectionManager;
    let fileSystemProvider: SSHFileSystemProvider;

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
    });

    teardown(async () => {
        await testServer.stop();
        connectionManager.dispose();
    });

    test('should read and write files', async () => {
        const uri = vscode.Uri.parse(`ssh://localhost:${testServer.getPort()}/test.txt`);
        const content = Buffer.from('Hello, World!');

        await fileSystemProvider.writeFile(uri, content, { create: true, overwrite: true });
        const readContent = await fileSystemProvider.readFile(uri);

        assert.strictEqual(readContent.toString(), content.toString());
    });

    test('should create and delete directories', async () => {
        const uri = vscode.Uri.parse(`ssh://localhost:${testServer.getPort()}/testdir`);

        await fileSystemProvider.createDirectory(uri);
        const stat = await fileSystemProvider.stat(uri);
        assert.ok(stat.type === vscode.FileType.Directory);

        await fileSystemProvider.delete(uri, { recursive: true });
        await assert.rejects(
            async () => {
                await fileSystemProvider.stat(uri);
            },
            /ENOENT/
        );
    });

    test('should list directory contents', async () => {
        const dirUri = vscode.Uri.parse(`ssh://localhost:${testServer.getPort()}/testdir`);
        const fileUri = vscode.Uri.parse(`${dirUri.toString()}/test.txt`);

        await fileSystemProvider.createDirectory(dirUri);
        await fileSystemProvider.writeFile(fileUri, Buffer.from('test'), { create: true, overwrite: true });

        const entries = await fileSystemProvider.readDirectory(dirUri);
        assert.strictEqual(entries.length, 1);
        assert.strictEqual(entries[0][0], 'test.txt');
        assert.strictEqual(entries[0][1], vscode.FileType.File);

        await fileSystemProvider.delete(dirUri, { recursive: true });
    });

    test('should handle file operations with non-existent files', async () => {
        const uri = vscode.Uri.parse(`ssh://localhost:${testServer.getPort()}/nonexistent.txt`);

        await assert.rejects(
            async () => {
                await fileSystemProvider.readFile(uri);
            },
            /ENOENT/
        );

        await assert.rejects(
            async () => {
                await fileSystemProvider.writeFile(uri, Buffer.from('test'), { create: false, overwrite: true });
            },
            /ENOENT/
        );
    });

    test('should handle concurrent file operations', async () => {
        const uri = vscode.Uri.parse(`ssh://localhost:${testServer.getPort()}/test.txt`);
        const content1 = Buffer.from('Content 1');
        const content2 = Buffer.from('Content 2');

        await Promise.all([
            fileSystemProvider.writeFile(uri, content1, { create: true, overwrite: true }),
            fileSystemProvider.writeFile(uri, content2, { create: true, overwrite: true })
        ]);

        const finalContent = await fileSystemProvider.readFile(uri);
        assert.ok(
            finalContent.equals(content1) || finalContent.equals(content2),
            'File content should match one of the written contents'
        );
    });
});
