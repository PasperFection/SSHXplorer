import * as vscode from 'vscode';
import { Project, Column, Card } from './projectManager';

interface ProjectViewOptions {
    project: Project;
    columns: Column[];
    cards: Card[];
    owner: string;
    repo: string;
}

export class ProjectWebview {
    private panel: vscode.WebviewPanel | undefined;
    private options: ProjectViewOptions;

    constructor(
        private readonly extensionUri: vscode.Uri,
        options: ProjectViewOptions,
        private readonly onAction: (action: any) => Promise<void>
    ) {
        this.options = options;
    }

    public async show(): Promise<void> {
        this.panel = vscode.window.createWebviewPanel(
            'githubProject',
            `Project: ${this.options.project.name}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.html = this.getWebviewContent();

        this.panel.webview.onDidReceiveMessage(async message => {
            try {
                await this.onAction(message);
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
        });
    }

    public getCurrentProject(): Project {
        return this.options.project;
    }

    public updateColumns(columns: Column[]): void {
        this.options.columns = columns;
        if (this.panel) {
            this.panel.webview.html = this.getWebviewContent();
        }
    }

    public updateCards(cards: Card[]): void {
        this.options.cards = cards;
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'updateCards',
                cards
            });
        }
    }

    private getWebviewContent(): string {
        const styleUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'github', 'style.css')
        );

        const columnsHtml = this.options.columns.map(column => {
            const columnCards = this.options.cards.filter(card => card.column_id === column.id);
            return `
                <div class="column" data-id="${column.id}">
                    <div class="column-header">
                        <h3>${column.name}</h3>
                        <div class="column-actions">
                            <button class="icon-button" onclick="addCard(${column.id})">
                                $(plus)
                            </button>
                            <button class="icon-button" onclick="deleteColumn(${column.id})">
                                $(trash)
                            </button>
                        </div>
                    </div>
                    <div class="cards-container" ondrop="dropCard(event)" 
                        ondragover="allowDrop(event)" data-column-id="${column.id}">
                        ${this.getCardsHtml(columnCards)}
                    </div>
                </div>
            `;
        }).join('\\n');

        return `<!DOCTYPE html>
        <html>
        <head>
            <link href="${styleUri}" rel="stylesheet">
            <title>${this.options.project.name}</title>
            <style>
                .project-board {
                    display: flex;
                    gap: 20px;
                    padding: 20px;
                    overflow-x: auto;
                }
                .column {
                    min-width: 300px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .column-header {
                    padding: 10px;
                    border-bottom: 1px solid var(--vscode-widget-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .cards-container {
                    padding: 10px;
                    min-height: 100px;
                }
                .card {
                    margin: 8px 0;
                    padding: 10px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                    cursor: move;
                }
                .card:hover {
                    border-color: var(--vscode-focusBorder);
                }
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 5px;
                }
                .card-content {
                    margin-bottom: 5px;
                }
                .card-meta {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                .card-type {
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 12px;
                }
                .card-type.issue {
                    background: var(--vscode-debugIcon-breakpointForeground);
                }
                .card-type.pr {
                    background: var(--vscode-gitDecoration-addedResourceForeground);
                }
                .card-type.note {
                    background: var(--vscode-debugIcon-dataTipForeground);
                }
                .icon-button {
                    padding: 4px;
                    background: none;
                    border: none;
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                }
                .icon-button:hover {
                    color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>${this.options.project.name}</h2>
                    <div class="project-meta">
                        Created by ${this.options.project.creator.login}
                        on ${new Date(this.options.project.created_at).toLocaleDateString()}
                    </div>
                    <div class="project-actions">
                        <button class="button" onclick="addColumn()">
                            Add Column
                        </button>
                        <button class="button" onclick="refresh()">
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="project-board">
                    ${columnsHtml}
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                let draggedCardId = null;

                function addColumn() {
                    const name = prompt('Enter column name:');
                    if (name) {
                        vscode.postMessage({
                            type: 'addColumn',
                            projectId: ${this.options.project.id},
                            name
                        });
                    }
                }

                function deleteColumn(columnId) {
                    if (confirm('Are you sure you want to delete this column?')) {
                        vscode.postMessage({
                            type: 'deleteColumn',
                            columnId
                        });
                    }
                }

                function addCard(columnId) {
                    const note = prompt('Enter card content:');
                    if (note) {
                        vscode.postMessage({
                            type: 'addCard',
                            columnId,
                            note
                        });
                    }
                }

                function editCard(cardId) {
                    const card = document.querySelector(\`[data-card-id="\${cardId}"]\`);
                    const note = prompt('Edit card:', card.querySelector('.card-content').textContent);
                    if (note) {
                        vscode.postMessage({
                            type: 'editCard',
                            cardId,
                            note
                        });
                    }
                }

                function deleteCard(cardId) {
                    if (confirm('Are you sure you want to delete this card?')) {
                        vscode.postMessage({
                            type: 'deleteCard',
                            cardId
                        });
                    }
                }

                function dragStart(event, cardId) {
                    draggedCardId = cardId;
                    event.dataTransfer.setData('text/plain', cardId);
                }

                function allowDrop(event) {
                    event.preventDefault();
                }

                function dropCard(event) {
                    event.preventDefault();
                    const columnId = event.target.closest('.cards-container').dataset.columnId;
                    
                    if (draggedCardId && columnId) {
                        vscode.postMessage({
                            type: 'moveCard',
                            cardId: parseInt(draggedCardId),
                            columnId: parseInt(columnId)
                        });
                        draggedCardId = null;
                    }
                }

                function refresh() {
                    vscode.postMessage({ type: 'refresh' });
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'updateCards') {
                        updateCards(message.cards);
                    }
                });

                function updateCards(cards) {
                    document.querySelectorAll('.cards-container').forEach(container => {
                        const columnId = parseInt(container.dataset.columnId);
                        const columnCards = cards.filter(card => card.column_id === columnId);
                        container.innerHTML = \`${this.getCardsHtml([]).replace(/\$/g, '\\$')}\`;
                    });
                }
            </script>
        </body>
        </html>`;
    }

    private getCardsHtml(cards: Card[]): string {
        return cards.map(card => `
            <div class="card" draggable="true" 
                ondragstart="dragStart(event, ${card.id})"
                data-card-id="${card.id}">
                <div class="card-header">
                    <span class="card-type ${this.getCardType(card)}">
                        ${this.getCardTypeLabel(card)}
                    </span>
                    <div class="card-actions">
                        <button class="icon-button" onclick="editCard(${card.id})">
                            $(edit)
                        </button>
                        <button class="icon-button" onclick="deleteCard(${card.id})">
                            $(trash)
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    ${card.note || (card.content ? card.content.title : '')}
                </div>
                <div class="card-meta">
                    ${card.creator.login} · ${new Date(card.created_at).toLocaleDateString()}
                </div>
            </div>
        `).join('\\n');
    }

    private getCardType(card: Card): string {
        if (card.note) return 'note';
        if (!card.content) return '';
        return card.content.type === 'Issue' ? 'issue' : 'pr';
    }

    private getCardTypeLabel(card: Card): string {
        if (card.note) return 'Note';
        if (!card.content) return '';
        return card.content.type === 'Issue' ? 'Issue' : 'PR';
    }

    public dispose(): void {
        this.panel?.dispose();
    }
}
