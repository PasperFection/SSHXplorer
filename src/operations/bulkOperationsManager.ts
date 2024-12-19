import * as vscode from 'vscode';
import { SSHFileSystemProvider } from '../fileSystem/sshFileSystemProvider';
import { CompressionManager } from '../compression/compressionManager';

export interface BulkOperationProgress {
    totalFiles: number;
    processedFiles: number;
    currentFile: string;
    bytesProcessed: number;
    totalBytes: number;
    errors: string[];
}

export class BulkOperationsManager {
    constructor(
        private readonly fileSystemProvider: SSHFileSystemProvider
    ) {}

    async copyFiles(
        sources: vscode.Uri[],
        destination: vscode.Uri,
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ): Promise<void> {
        const totalFiles = sources.length;
        let processedFiles = 0;

        for (const source of sources) {
            if (token.isCancellationRequested) {
                break;
            }

            const fileName = source.path.split('/').pop() || '';
            const destUri = vscode.Uri.joinPath(destination, fileName);

            try {
                const content = await this.fileSystemProvider.readFile(source);
                await this.fileSystemProvider.writeFile(destUri, content, { create: true, overwrite: true });
                
                processedFiles++;
                progress.report({
                    message: `Copying ${fileName} (${processedFiles}/${totalFiles})`,
                    increment: (1 / totalFiles) * 100
                });
            } catch (error) {
                console.error(`Error copying ${fileName}:`, error);
                throw error;
            }
        }
    }

    async compressFiles(
        sources: vscode.Uri[],
        destination: vscode.Uri,
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ): Promise<void> {
        const totalFiles = sources.length;
        let processedFiles = 0;

        for (const source of sources) {
            if (token.isCancellationRequested) {
                break;
            }

            const fileName = source.path.split('/').pop() || '';
            const destUri = vscode.Uri.joinPath(destination, `${fileName}.gz`);

            try {
                const content = await this.fileSystemProvider.readFile(source);
                const compressed = await CompressionManager.compress(content);
                await this.fileSystemProvider.writeFile(destUri, compressed, { create: true, overwrite: true });

                processedFiles++;
                progress.report({
                    message: `Compressing ${fileName} (${processedFiles}/${totalFiles})`,
                    increment: (1 / totalFiles) * 100
                });
            } catch (error) {
                console.error(`Error compressing ${fileName}:`, error);
                throw error;
            }
        }
    }

    async decompressFiles(
        sources: vscode.Uri[],
        destination: vscode.Uri,
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ): Promise<void> {
        const totalFiles = sources.length;
        let processedFiles = 0;

        for (const source of sources) {
            if (token.isCancellationRequested) {
                break;
            }

            const fileName = source.path.split('/').pop() || '';
            const destFileName = fileName.endsWith('.gz') ? fileName.slice(0, -3) : `${fileName}.decompressed`;
            const destUri = vscode.Uri.joinPath(destination, destFileName);

            try {
                const content = await this.fileSystemProvider.readFile(source);
                const decompressed = await CompressionManager.decompress(content);
                await this.fileSystemProvider.writeFile(destUri, decompressed, { create: true, overwrite: true });

                processedFiles++;
                progress.report({
                    message: `Decompressing ${fileName} (${processedFiles}/${totalFiles})`,
                    increment: (1 / totalFiles) * 100
                });
            } catch (error) {
                console.error(`Error decompressing ${fileName}:`, error);
                throw error;
            }
        }
    }

    async deleteFiles(
        sources: vscode.Uri[],
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ): Promise<void> {
        const totalFiles = sources.length;
        let processedFiles = 0;

        for (const source of sources) {
            if (token.isCancellationRequested) {
                break;
            }

            const fileName = source.path.split('/').pop() || '';

            try {
                await this.fileSystemProvider.delete(source, { recursive: true });

                processedFiles++;
                progress.report({
                    message: `Deleting ${fileName} (${processedFiles}/${totalFiles})`,
                    increment: (1 / totalFiles) * 100
                });
            } catch (error) {
                console.error(`Error deleting ${fileName}:`, error);
                throw error;
            }
        }
    }
}
