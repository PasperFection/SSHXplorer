import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConnectionManager } from '../../connection/connectionManager';
import { SSHConnection } from '../../connection/sshConnection';
import { TestServer } from './helpers/testServer';

suite('Connection Tests', () => {
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

    test('should establish SSH connection', async () => {
        const config = {
            host: 'localhost',
            port: testServer.getPort(),
            username: 'test',
            password: 'test'
        };

        const connection = await connectionManager.createConnection(config);
        assert.ok(connection.isActive());
    });

    test('should handle authentication failure', async () => {
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

    test('should handle connection timeout', async () => {
        const config = {
            host: 'non.existent.host',
            port: 22,
            username: 'test',
            password: 'test'
        };

        await assert.rejects(
            async () => {
                await connectionManager.createConnection(config);
            },
            /connect ECONNREFUSED/
        );
    });

    test('should handle multiple connections', async () => {
        const config1 = {
            host: 'localhost',
            port: testServer.getPort(),
            username: 'test',
            password: 'test'
        };

        const config2 = {
            host: 'localhost',
            port: testServer.getPort(),
            username: 'test',
            password: 'test'
        };

        const connection1 = await connectionManager.createConnection(config1);
        const connection2 = await connectionManager.createConnection(config2);

        assert.ok(connection1.isActive());
        assert.ok(connection2.isActive());
    });

    test('should handle network failures', async () => {
        const config = {
            host: 'localhost',
            port: testServer.getPort(),
            username: 'test',
            password: 'test'
        };

        const connection = await connectionManager.createConnection(config);
        assert.ok(connection.isActive());

        await testServer.simulateNetworkFailure();

        // Wait for connection to detect failure
        await new Promise(resolve => setTimeout(resolve, 1000));
        assert.ok(!connection.isActive());
    });
});
