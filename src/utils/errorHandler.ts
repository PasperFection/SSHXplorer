import * as vscode from 'vscode';
import { Logger } from './logger';

export class ErrorHandler {
    private static readonly logger = Logger.getInstance();

    static handleError(error: Error, context: string, silent: boolean = false): void {
        this.logger.error(`[${context}] ${error.message}`, error);

        if (!silent) {
            const action = 'Show Details';
            vscode.window.showErrorMessage(error.message, action).then(selection => {
                if (selection === action) {
                    this.logger.showOutput();
                }
            });
        }
    }

    static async handleConnectionError(error: Error): Promise<boolean> {
        this.logger.error('Connection error', error);

        const retry = 'Retry';
        const configure = 'Configure';
        const selection = await vscode.window.showErrorMessage(
            `Connection failed: ${error.message}`,
            retry,
            configure
        );

        if (selection === retry) {
            return true;
        } else if (selection === configure) {
            vscode.commands.executeCommand('sshxplorer.configure');
        }

        return false;
    }

    static handleFileSystemError(error: Error, operation: string, path: string): void {
        const message = `Failed to ${operation} ${path}: ${error.message}`;
        this.logger.error(message, error);
        vscode.window.showErrorMessage(message);
    }

    static async handleLargeFileWarning(fileSize: number): Promise<boolean> {
        const sizeMB = Math.round(fileSize / (1024 * 1024));
        const proceed = 'Proceed';
        const cancel = 'Cancel';

        const selection = await vscode.window.showWarningMessage(
            `The file is ${sizeMB}MB. Opening large files may impact performance.`,
            proceed,
            cancel
        );

        return selection === proceed;
    }

    static handleTimeoutError(operation: string): void {
        const message = `Operation timed out: ${operation}`;
        this.logger.error(message);
        vscode.window.showErrorMessage(message);
    }

    static async handleUnsavedChanges(): Promise<boolean> {
        const save = 'Save';
        const discard = 'Discard';
        const cancel = 'Cancel';

        const selection = await vscode.window.showWarningMessage(
            'You have unsaved changes. What would you like to do?',
            save,
            discard,
            cancel
        );

        if (selection === save) {
            await vscode.workspace.saveAll();
            return true;
        }

        return selection === discard;
    }

    static handlePermissionError(path: string): void {
        const message = `Permission denied: ${path}`;
        this.logger.error(message);
        vscode.window.showErrorMessage(message);
    }
}
