import * as vscode from 'vscode';
import { TextDecoder } from 'util';

export class DiffViewProvider implements vscode.TextDocumentContentProvider {
    private readonly scheme = 'github-diff';
    private diffs = new Map<string, string>();
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    constructor(private extensionUri: vscode.Uri) {
        // Register the content provider
        vscode.workspace.registerTextDocumentContentProvider(this.scheme, this);
    }

    get onDidChange() {
        return this._onDidChange.event;
    }

    public createDiffDocument(file: any): vscode.Uri {
        const uri = this.getDiffUri(file.filename);
        this.diffs.set(uri.toString(), this.createDiffContent(file));
        this._onDidChange.fire(uri);
        return uri;
    }

    private getDiffUri(filename: string): vscode.Uri {
        return vscode.Uri.parse(`${this.scheme}:${filename}`);
    }

    private createDiffContent(file: any): string {
        const decoder = new TextDecoder();
        const patch = file.patch || '';
        
        // Create a more readable diff format
        const lines = patch.split('\n');
        let content = '';
        let inHunk = false;

        for (const line of lines) {
            if (line.startsWith('@@')) {
                inHunk = true;
                content += '\n' + this.formatHunkHeader(line) + '\n';
            } else if (inHunk) {
                content += this.formatDiffLine(line) + '\n';
            }
        }

        return content;
    }

    private formatHunkHeader(line: string): string {
        // Make hunk headers more readable
        const match = line.match(/^@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@/);
        if (match) {
            const [, oldStart, oldCount = '1', newStart, newCount = '1'] = match;
            return `@@ ${oldStart}-${parseInt(oldStart) + parseInt(oldCount) - 1} → ${newStart}-${parseInt(newStart) + parseInt(newCount) - 1} @@`;
        }
        return line;
    }

    private formatDiffLine(line: string): string {
        if (line.startsWith('+')) {
            return line; // Added lines
        } else if (line.startsWith('-')) {
            return line; // Removed lines
        } else if (line.startsWith(' ')) {
            return line; // Context lines
        }
        return line;
    }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        return this.diffs.get(uri.toString()) || '';
    }

    public updateDiff(uri: vscode.Uri, content: string) {
        this.diffs.set(uri.toString(), content);
        this._onDidChange.fire(uri);
    }

    dispose() {
        this._onDidChange.dispose();
        this.diffs.clear();
    }
}

export class DiffDecorationProvider {
    private addedLineDecoration: vscode.TextEditorDecorationType;
    private removedLineDecoration: vscode.TextEditorDecorationType;
    private modifiedLineDecoration: vscode.TextEditorDecorationType;

    constructor() {
        this.addedLineDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('diffEditor.insertedLineBackground'),
            isWholeLine: true,
            after: {
                contentText: ' // Added',
                color: new vscode.ThemeColor('diffEditor.insertedTextColor'),
                margin: '0 0 0 1em'
            }
        });

        this.removedLineDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('diffEditor.removedLineBackground'),
            isWholeLine: true,
            after: {
                contentText: ' // Removed',
                color: new vscode.ThemeColor('diffEditor.removedTextColor'),
                margin: '0 0 0 1em'
            }
        });

        this.modifiedLineDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('diffEditor.modifiedLineBackground'),
            isWholeLine: true,
            after: {
                contentText: ' // Modified',
                color: new vscode.ThemeColor('diffEditor.modifiedTextColor'),
                margin: '0 0 0 1em'
            }
        });
    }

    public updateDecorations(editor: vscode.TextEditor) {
        const document = editor.document;
        const addedLines: vscode.Range[] = [];
        const removedLines: vscode.Range[] = [];
        const modifiedLines: vscode.Range[] = [];

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;

            if (text.startsWith('+')) {
                addedLines.push(line.range);
            } else if (text.startsWith('-')) {
                removedLines.push(line.range);
            } else if (text.startsWith('~')) {
                modifiedLines.push(line.range);
            }
        }

        editor.setDecorations(this.addedLineDecoration, addedLines);
        editor.setDecorations(this.removedLineDecoration, removedLines);
        editor.setDecorations(this.modifiedLineDecoration, modifiedLines);
    }

    public dispose() {
        this.addedLineDecoration.dispose();
        this.removedLineDecoration.dispose();
        this.modifiedLineDecoration.dispose();
    }
}
