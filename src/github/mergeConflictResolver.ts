import * as vscode from 'vscode';
import { SimpleGit } from 'simple-git';
import { GitHubManager } from './githubManager';

interface ConflictRange {
    start: number;
    middle: number;
    end: number;
    current: string;
    incoming: string;
}

export class MergeConflictResolver {
    constructor(
        private git: SimpleGit,
        private githubManager: GitHubManager
    ) {}

    async resolveConflicts(repoPath: string): Promise<boolean> {
        try {
            const status = await this.git.status();
            
            if (status.conflicted.length === 0) {
                return true;
            }

            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                throw new Error('No active text editor');
            }

            const document = editor.document;
            const text = document.getText();
            const conflicts = this.findConflicts(text);

            if (conflicts.length === 0) {
                return true;
            }

            for (const conflict of conflicts) {
                const resolution = await this.promptResolution(conflict);
                if (!resolution) {
                    return false;
                }

                await this.applyResolution(editor, conflict, resolution);
            }

            await document.save();
            await this.git.add(document.fileName);
            return true;
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to resolve conflicts: ${error.message}`);
            }
            return false;
        }
    }

    private findConflicts(text: string): ConflictRange[] {
        const conflicts: ConflictRange[] = [];
        const lines = text.split('\n');
        let i = 0;

        while (i < lines.length) {
            if (lines[i].startsWith('<<<<<<<')) {
                const start = i;
                let middle = -1;
                let end = -1;

                while (i < lines.length && !lines[i].startsWith('=======')) {
                    i++;
                }
                middle = i;

                while (i < lines.length && !lines[i].startsWith('>>>>>>>')) {
                    i++;
                }
                end = i;

                if (middle !== -1 && end !== -1) {
                    conflicts.push({
                        start,
                        middle,
                        end,
                        current: lines.slice(start + 1, middle).join('\n'),
                        incoming: lines.slice(middle + 1, end).join('\n')
                    });
                }
            }
            i++;
        }

        return conflicts;
    }

    private async promptResolution(conflict: ConflictRange): Promise<string | undefined> {
        const items = [
            { label: 'Keep Current', description: 'Use your changes', detail: conflict.current },
            { label: 'Keep Incoming', description: 'Use their changes', detail: conflict.incoming },
            { label: 'Keep Both', description: 'Keep both changes' }
        ];

        const selection = await vscode.window.showQuickPick(items, {
            placeHolder: 'Resolve conflict',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (!selection) {
            return undefined;
        }

        switch (selection.label) {
            case 'Keep Current':
                return conflict.current;
            case 'Keep Incoming':
                return conflict.incoming;
            case 'Keep Both':
                return `${conflict.current}\n${conflict.incoming}`;
            default:
                return undefined;
        }
    }

    private async applyResolution(
        editor: vscode.TextEditor,
        conflict: ConflictRange,
        resolution: string
    ): Promise<void> {
        await editor.edit(editBuilder => {
            const startPos = editor.document.positionAt(conflict.start);
            const endPos = editor.document.positionAt(conflict.end + 1);
            editBuilder.replace(new vscode.Range(startPos, endPos), resolution);
        });
    }
}
