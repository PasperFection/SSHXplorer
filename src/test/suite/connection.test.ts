import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConnectionManager } from '../../connection/connectionManager';
import { SSHConnection } from '../../connection/sshConnection';
import { TestServer } from '../e2e/helpers/testServer';

suite('Connection Tests', () => {
    let testServer: TestServer;
    let connectionManager: ConnectionManager;

    setup(async () => {
        testServer = new TestServer();
        await testServer.start();

        const mockContext: vscode.ExtensionContext = {
            subscriptions: [],
            extensionPath: '',
            globalState: {
                get: <T>(_key: string): T | undefined => undefined,
                update: (_key: string, _value: any) => Promise.resolve(),
                keys: () => []
            },
            workspaceState: {
                get: <T>(_key: string): T | undefined => undefined,
                update: (_key: string, _value: any) => Promise.resolve(),
                keys: () => []
            },
            secrets: {
                get: async (_key: string) => undefined,
                store: async (_key: string, _value: string) => {},
                delete: async (_key: string) => {},
                onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
            },
            extensionUri: vscode.Uri.file(''),
            environmentVariableCollection: {
                persistent: true,
                description: undefined,
                replace: (_variable: string, _value: string) => { },
                append: (_variable: string, _value: string) => { },
                prepend: (_variable: string, _value: string) => { },
                get: (_variable: string) => undefined,
                forEach: () => { },
                delete: (_variable: string) => { },
                clear: () => { },
                [Symbol.iterator]: function* () { yield* []; },
                getScoped: function (scope: vscode.EnvironmentVariableScope): vscode.EnvironmentVariableCollection {
                    throw new Error('Function not implemented.');
                }
            },
            storageUri: undefined,
            globalStorageUri: vscode.Uri.file(''),
            logUri: vscode.Uri.file(''),
            extensionMode: vscode.ExtensionMode.Test,
            extension: {} as vscode.Extension<any>,
            logPath: '',
            asAbsolutePath: (path) => path,
            storagePath: undefined,
            globalStoragePath: '',
            extensionRuntime: vscode.ExtensionKind.Workspace,
            languageModelAccessInformation: {
                allowsModelTraining: false,
                authenticationProvider: ''
            }
        };

        connectionManager = new ConnectionManager();
    });

    teardown(async () => {
        await testServer.stop();
        connectionManager.dispose();
    });

    test('should connect successfully with valid credentials', async () => {
        const config = {
            host: 'localhost',
            port: testServer.getPort(),
            username: 'test',
            password: 'test'
        };

        const connection = await connectionManager.createConnection(config);
        assert.ok(connection.isActive());
    });

    test('should fail to connect with invalid credentials', async () => {
        const config = {
            host: 'localhost',
            port: testServer.getPort(),
            username: 'test',
            password: 'wrong'
        };

        await assert.rejects(
            async () => {
                await connectionManager.createConnection(config);
            },
            /Authentication failed/
        );
    });

    test('should handle network failures gracefully', async () => {
        const config = {
            host: 'localhost',
            port: testServer.getPort(),
            username: 'test',
            password: 'test'
        };

        const connection = await connectionManager.createConnection(config);
        assert.ok(connection.isActive());

        await testServer.simulateNetworkFailure();
        assert.ok(!connection.isActive());
    });
});
