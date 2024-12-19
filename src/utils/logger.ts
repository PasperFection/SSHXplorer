import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;
    private logFile: string;
    private logLevel: LogLevel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('SSHXplorer');
        this.logFile = path.join(os.tmpdir(), 'sshxplorer.log');
        this.logLevel = LogLevel.INFO;
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    setLogLevel(level: LogLevel) {
        this.logLevel = level;
    }

    debug(message: string, ...args: any[]) {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    info(message: string, ...args: any[]) {
        this.log(LogLevel.INFO, message, ...args);
    }

    warn(message: string, ...args: any[]) {
        this.log(LogLevel.WARN, message, ...args);
    }

    error(message: string, error?: Error, ...args: any[]) {
        this.log(LogLevel.ERROR, message, ...args);
        if (error) {
            this.log(LogLevel.ERROR, error.stack || error.message);
        }
    }

    private log(level: LogLevel, message: string, ...args: any[]) {
        if (level < this.logLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        const levelStr = LogLevel[level];
        const formattedMessage = this.formatMessage(message, args);
        const logEntry = `[${timestamp}] [${levelStr}] ${formattedMessage}`;

        // Log to output channel
        this.outputChannel.appendLine(logEntry);

        // Log to file
        fs.appendFileSync(this.logFile, logEntry + '\n');

        // Show error notifications for ERROR level
        if (level === LogLevel.ERROR) {
            vscode.window.showErrorMessage(formattedMessage);
        }
    }

    private formatMessage(message: string, args: any[]): string {
        if (args.length === 0) {
            return message;
        }

        try {
            return `${message} ${args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : arg
            ).join(' ')}`;
        } catch (error) {
            return `${message} [Error formatting arguments]`;
        }
    }

    showOutput() {
        this.outputChannel.show();
    }

    async getLogContent(): Promise<string> {
        try {
            return await fs.promises.readFile(this.logFile, 'utf8');
        } catch {
            return 'No logs available';
        }
    }

    async clearLogs() {
        try {
            await fs.promises.writeFile(this.logFile, '');
            this.outputChannel.clear();
        } catch (error) {
            this.error('Failed to clear logs', error as Error);
        }
    }
}
