import * as vscode from 'vscode';

interface TutorialStep {
    id: string;
    title: string;
    description: string;
    command?: string;
    nextStep?: string;
}

export class TutorialManager {
    private context: vscode.ExtensionContext;
    private currentStep: string | undefined;
    private tutorialWebview: vscode.WebviewPanel | undefined;
    private steps: Map<string, TutorialStep>;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.steps = new Map();
        this.initializeTutorialSteps();
    }

    private initializeTutorialSteps() {
        this.steps.set('start', {
            id: 'start',
            title: 'Welcome to SSHXplorer!',
            description: 'Let\'s get started with a quick tour of the features. Click Next to begin.',
            nextStep: 'connect'
        });

        this.steps.set('connect', {
            id: 'connect',
            title: 'Connecting to SSH',
            description: 'Press Ctrl+Shift+S (Cmd+Shift+S on macOS) to connect to an SSH server, or click the plug icon in the SSH Connections view.',
            command: 'sshxplorer.connect',
            nextStep: 'explorer'
        });

        this.steps.set('explorer', {
            id: 'explorer',
            title: 'File Explorer',
            description: 'The SSH Explorer view shows your remote files. Try creating a new file with Ctrl+N or uploading one.',
            command: 'sshxplorer.newFile',
            nextStep: 'operations'
        });

        this.steps.set('operations', {
            id: 'operations',
            title: 'File Operations',
            description: 'Right-click on files for operations like copy, paste, or download. Most operations have keyboard shortcuts!',
            nextStep: 'compression'
        });

        this.steps.set('compression', {
            id: 'compression',
            title: 'File Compression',
            description: 'Large files are automatically compressed for faster transfer. You can see compression stats in the status view.',
            nextStep: 'monitoring'
        });

        this.steps.set('monitoring', {
            id: 'monitoring',
            title: 'Performance Monitoring',
            description: 'Check the SSH Status view to monitor connection performance and resource usage.',
            nextStep: 'complete'
        });

        this.steps.set('complete', {
            id: 'complete',
            title: 'Tutorial Complete!',
            description: 'You\'re ready to use SSHXplorer! Check the README for more details, or press F1 and type "SSHXplorer" to see all available commands.'
        });
    }

    public startTutorial() {
        this.currentStep = 'start';
        this.showTutorialWebview();
    }

    public nextStep() {
        const currentStep = this.steps.get(this.currentStep || 'start');
        if (currentStep?.nextStep) {
            this.currentStep = currentStep.nextStep;
            this.updateTutorialWebview();
        } else {
            this.endTutorial();
        }
    }

    private showTutorialWebview() {
        this.tutorialWebview = vscode.window.createWebviewPanel(
            'sshxplorerTutorial',
            'SSHXplorer Tutorial',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.tutorialWebview.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'next':
                        this.nextStep();
                        break;
                    case 'executeCommand':
                        const step = this.steps.get(this.currentStep || '');
                        if (step?.command) {
                            await vscode.commands.executeCommand(step.command);
                        }
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        this.updateTutorialWebview();

        this.tutorialWebview.onDidDispose(() => {
            this.tutorialWebview = undefined;
        });
    }

    private updateTutorialWebview() {
        if (!this.tutorialWebview) {
            return;
        }

        const step = this.steps.get(this.currentStep || 'start');
        if (!step) {
            return;
        }

        this.tutorialWebview.webview.html = this.getWebviewContent(step);
    }

    private getWebviewContent(step: TutorialStep): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        color: var(--vscode-foreground);
                    }
                    .title {
                        font-size: 1.5em;
                        margin-bottom: 1em;
                        color: var(--vscode-textLink-foreground);
                    }
                    .description {
                        margin-bottom: 2em;
                        line-height: 1.4;
                    }
                    button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        cursor: pointer;
                        margin-right: 8px;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="title">${step.title}</div>
                <div class="description">${step.description}</div>
                ${step.command ? 
                    `<button onclick="executeCommand()">Try it!</button>` : 
                    ''
                }
                ${step.nextStep ? 
                    `<button onclick="nextStep()">Next</button>` : 
                    `<button onclick="window.close()">Finish</button>`
                }
                <script>
                    const vscode = acquireVsCodeApi();
                    function nextStep() {
                        vscode.postMessage({ command: 'next' });
                    }
                    function executeCommand() {
                        vscode.postMessage({ command: 'executeCommand' });
                    }
                </script>
            </body>
            </html>
        `;
    }

    private endTutorial() {
        if (this.tutorialWebview) {
            this.tutorialWebview.dispose();
            this.tutorialWebview = undefined;
        }
    }
}
