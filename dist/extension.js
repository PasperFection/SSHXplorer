/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(__webpack_require__(1));
const fileSystemProvider_1 = __webpack_require__(2);
const connectionManager_1 = __webpack_require__(4);
const remoteExplorer_1 = __webpack_require__(8);
function activate(context) {
    const connectionManager = new connectionManager_1.ConnectionManager(context);
    const fileSystemProvider = new fileSystemProvider_1.SSHFileSystemProvider(connectionManager);
    const remoteExplorer = new remoteExplorer_1.RemoteExplorer(connectionManager);
    // Register the SSH filesystem provider
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('ssh', fileSystemProvider, {
        isCaseSensitive: true,
        isReadonly: false
    }));
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('sshxplorer.connect', async () => {
        try {
            const connection = await connectionManager.promptForConnection();
            if (connection) {
                await connectionManager.connect(connection);
                vscode.window.showInformationMessage(`Connected to ${connection.host}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Connection failed: ${error.message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('sshxplorer.disconnect', async () => {
        await connectionManager.disconnect();
        vscode.window.showInformationMessage('SSH connection closed');
    }));
    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.command = 'sshxplorer.connect';
    context.subscriptions.push(statusBarItem);
    // Update status bar based on connection state
    connectionManager.onDidChangeConnection(() => {
        const connection = connectionManager.getCurrentConnection();
        if (connection) {
            statusBarItem.text = `$(remote) ${connection.host}`;
            statusBarItem.tooltip = 'Click to manage SSH connection';
        }
        else {
            statusBarItem.text = '$(remote) Connect SSH';
            statusBarItem.tooltip = 'Click to connect to remote SSH';
        }
        statusBarItem.show();
    });
    // Auto-reconnect feature
    connectionManager.onDidDisconnect(async (error) => {
        if (error) {
            const reconnect = await vscode.window.showWarningMessage('SSH connection lost. Would you like to reconnect?', 'Yes', 'No');
            if (reconnect === 'Yes') {
                const connection = connectionManager.getLastConnection();
                if (connection) {
                    await connectionManager.connect(connection);
                }
            }
        }
    });
}
function deactivate() {
    // Clean up resources
}


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SSHFileSystemProvider = void 0;
const vscode = __importStar(__webpack_require__(1));
const path = __importStar(__webpack_require__(3));
class SSHFileSystemProvider {
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
        this._emitter = new vscode.EventEmitter();
        this.onDidChangeFile = this._emitter.event;
    }
    watch(_uri) {
        // Implement file watching
        return new vscode.Disposable(() => { });
    }
    async stat(uri) {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                sftp.stat(uri.path, (err, stats) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({
                        type: stats.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File,
                        ctime: Date.now(),
                        mtime: stats.mtime * 1000,
                        size: stats.size
                    });
                });
            });
        });
    }
    async readDirectory(uri) {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                sftp.readdir(uri.path, (err, list) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(list.map(item => [
                        item.filename,
                        item.attrs.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File
                    ]));
                });
            });
        });
    }
    async readFile(uri) {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                let buffer = Buffer.alloc(0);
                const stream = sftp.createReadStream(uri.path);
                stream.on('data', (chunk) => {
                    buffer = Buffer.concat([buffer, chunk]);
                });
                stream.on('end', () => {
                    resolve(new Uint8Array(buffer));
                });
                stream.on('error', (error) => {
                    reject(error);
                });
            });
        });
    }
    async writeFile(uri, content, _options) {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                const stream = sftp.createWriteStream(uri.path);
                stream.on('close', () => {
                    resolve();
                });
                stream.on('error', (error) => {
                    reject(error);
                });
                stream.end(Buffer.from(content));
            });
        });
    }
    async delete(uri, options) {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (options.recursive) {
                    this.deleteRecursive(sftp, uri.path).then(resolve).catch(reject);
                }
                else {
                    sftp.unlink(uri.path, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                }
            });
        });
    }
    async deleteRecursive(sftp, remotePath) {
        const list = await new Promise((resolve, reject) => {
            sftp.readdir(remotePath, (err, list) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(list);
                }
            });
        });
        for (const item of list) {
            const fullPath = path.join(remotePath, item.filename);
            if (item.attrs.isDirectory()) {
                await this.deleteRecursive(sftp, fullPath);
                await new Promise((resolve, reject) => {
                    sftp.rmdir(fullPath, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                });
            }
            else {
                await new Promise((resolve, reject) => {
                    sftp.unlink(fullPath, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                });
            }
        }
    }
    async rename(oldUri, newUri, _options) {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                sftp.rename(oldUri.path, newUri.path, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
    async createDirectory(uri) {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                sftp.mkdir(uri.path, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
}
exports.SSHFileSystemProvider = SSHFileSystemProvider;


/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("path");

/***/ }),
/* 4 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ConnectionManager = void 0;
const vscode = __importStar(__webpack_require__(1));
const ssh2_1 = __webpack_require__(5);
const fs = __importStar(__webpack_require__(6));
const path = __importStar(__webpack_require__(3));
class ConnectionManager {
    constructor(context) {
        this.context = context;
        this._onDidChangeConnection = new vscode.EventEmitter();
        this.onDidChangeConnection = this._onDidChangeConnection.event;
        this._onDidDisconnect = new vscode.EventEmitter();
        this.onDidDisconnect = this._onDidDisconnect.event;
        this.client = undefined;
    }
    async promptForConnection() {
        const host = await vscode.window.showInputBox({
            prompt: 'Enter SSH host',
            placeHolder: 'hostname or IP address'
        });
        if (!host) {
            return undefined;
        }
        const port = await vscode.window.showInputBox({
            prompt: 'Enter SSH port',
            placeHolder: '22',
            value: '22'
        });
        if (!port) {
            return undefined;
        }
        const username = await vscode.window.showInputBox({
            prompt: 'Enter username',
            placeHolder: 'username'
        });
        if (!username) {
            return undefined;
        }
        const authMethod = await vscode.window.showQuickPick(['SSH Key', 'Password'], { placeHolder: 'Select authentication method' });
        if (!authMethod) {
            return undefined;
        }
        let privateKeyPath;
        let password;
        if (authMethod === 'SSH Key') {
            const defaultKeyPath = path.join((__webpack_require__(7).homedir)(), '.ssh', 'id_rsa');
            privateKeyPath = await vscode.window.showInputBox({
                prompt: 'Enter path to private key',
                placeHolder: defaultKeyPath,
                value: defaultKeyPath
            });
            if (!privateKeyPath) {
                return undefined;
            }
        }
        else {
            password = await vscode.window.showInputBox({
                prompt: 'Enter password',
                password: true
            });
            if (!password) {
                return undefined;
            }
        }
        return {
            host,
            port: parseInt(port),
            username,
            privateKeyPath,
            password
        };
    }
    async connect(connection) {
        return new Promise((resolve, reject) => {
            this.disconnect();
            this.client = new ssh2_1.Client();
            this.currentConnection = connection;
            this.lastConnection = connection;
            const config = {
                host: connection.host,
                port: connection.port,
                username: connection.username
            };
            if (connection.privateKeyPath) {
                config.privateKey = fs.readFileSync(connection.privateKeyPath);
            }
            else if (connection.password) {
                config.password = connection.password;
            }
            this.client
                .on('ready', () => {
                this._onDidChangeConnection.fire();
                resolve();
            })
                .on('error', (err) => {
                this._onDidDisconnect.fire(err);
                reject(err);
            })
                .on('end', () => {
                this._onDidDisconnect.fire(undefined);
            })
                .connect(config);
        });
    }
    async disconnect() {
        if (this.client) {
            this.client.end();
            this.client = undefined;
            this.currentConnection = undefined;
            this._onDidChangeConnection.fire();
        }
    }
    async getClient() {
        if (!this.client) {
            throw new Error('Not connected to SSH server');
        }
        return this.client;
    }
    getCurrentConnection() {
        return this.currentConnection;
    }
    getLastConnection() {
        return this.lastConnection;
    }
}
exports.ConnectionManager = ConnectionManager;


/***/ }),
/* 5 */
/***/ ((module) => {

module.exports = require("ssh2");

/***/ }),
/* 6 */
/***/ ((module) => {

module.exports = require("fs");

/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = require("os");

/***/ }),
/* 8 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RemoteExplorer = void 0;
const vscode = __importStar(__webpack_require__(1));
class RemoteExplorer {
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
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
exports.RemoteExplorer = RemoteExplorer;
class RemoteTreeDataProvider {
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
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
                            return new RemoteItem(item.filename, fullPath, item.attrs.isDirectory() ?
                                vscode.TreeItemCollapsibleState.Collapsed :
                                vscode.TreeItemCollapsibleState.None, item.attrs.isDirectory() ? 'folder' : 'file');
                        });
                        // Sort directories first, then files
                        items.sort((a, b) => {
                            if (a.contextValue === b.contextValue) {
                                return a.label.localeCompare(b.label);
                            }
                            return a.contextValue === 'folder' ? -1 : 1;
                        });
                        resolve(items);
                    });
                });
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to list directory: ${error.message}`);
            return [];
        }
    }
}
class RemoteItem extends vscode.TreeItem {
    constructor(label, path, collapsibleState, contextValue) {
        super(label, collapsibleState);
        this.label = label;
        this.path = path;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
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


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map