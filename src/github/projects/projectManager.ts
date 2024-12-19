import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { ProjectWebview } from './projectWebview';

export interface Project {
    id: number;
    number: number;
    name: string;
    body: string;
    state: 'open' | 'closed';
    creator: {
        login: string;
        avatar_url: string;
    };
    created_at: string;
    updated_at: string;
}

export interface Column {
    id: number;
    name: string;
    cards_url: string;
}

export interface Card {
    id: number;
    note?: string;
    content_url?: string;
    content?: {
        title: string;
        number: number;
        type: 'Issue' | 'PullRequest';
        state: string;
        html_url: string;
    };
    creator: {
        login: string;
        avatar_url: string;
    };
    created_at: string;
    updated_at: string;
    column_id: number;
}

export class ProjectManager {
    private projectWebview: ProjectWebview | undefined;
    private draggedCard: Card | undefined;

    constructor(
        private octokit: Octokit,
        private extensionUri: vscode.Uri
    ) {}

    public async showProjects(owner: string, repo: string): Promise<void> {
        try {
            const projects = await this.getProjects(owner, repo);
            if (projects.length === 0) {
                const create = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: 'No projects found. Create a new project?'
                });
                
                if (create === 'Yes') {
                    await this.createProject(owner, repo);
                }
                return;
            }

            const selectedProject = await this.selectProject(projects);
            if (!selectedProject) return;

            const [columns, cards] = await Promise.all([
                this.getColumns(selectedProject.id),
                this.getAllCards(selectedProject.id)
            ]);

            this.projectWebview = new ProjectWebview(
                this.extensionUri,
                {
                    project: selectedProject,
                    columns,
                    cards,
                    owner,
                    repo
                },
                async (action) => {
                    await this.handleProjectAction(owner, repo, action);
                }
            );

            await this.projectWebview.show();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load projects: ${error.message}`);
        }
    }

    private async getProjects(owner: string, repo: string): Promise<Project[]> {
        const { data } = await this.octokit.projects.listForRepo({
            owner,
            repo,
            state: 'open'
        });
        return data;
    }

    private async selectProject(projects: Project[]): Promise<Project | undefined> {
        const items = projects.map(project => ({
            label: project.name,
            description: `#${project.number}`,
            detail: project.body,
            project
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a project'
        });

        return selected?.project;
    }

    private async createProject(owner: string, repo: string): Promise<void> {
        const name = await vscode.window.showInputBox({
            placeHolder: 'Project name',
            prompt: 'Enter a name for the new project'
        });

        if (!name) return;

        const body = await vscode.window.showInputBox({
            placeHolder: 'Project description (optional)',
            prompt: 'Enter a description for the project'
        });

        try {
            const { data: project } = await this.octokit.projects.createForRepo({
                owner,
                repo,
                name,
                body
            });

            // Create default columns
            const defaultColumns = ['To Do', 'In Progress', 'Done'];
            for (const columnName of defaultColumns) {
                await this.octokit.projects.createColumn({
                    project_id: project.id,
                    name: columnName
                });
            }

            vscode.window.showInformationMessage('Project created successfully!');
            await this.showProjects(owner, repo);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create project: ${error.message}`);
        }
    }

    private async getColumns(projectId: number): Promise<Column[]> {
        const { data } = await this.octokit.projects.listColumns({
            project_id: projectId
        });
        return data;
    }

    private async getCards(columnId: number): Promise<Card[]> {
        const { data } = await this.octokit.projects.listCards({
            column_id: columnId
        });
        return data;
    }

    private async getAllCards(projectId: number): Promise<Card[]> {
        const columns = await this.getColumns(projectId);
        const cardsPromises = columns.map(column => this.getCards(column.id));
        const cardsArrays = await Promise.all(cardsPromises);
        return cardsArrays.flat();
    }

    public async addCard(
        columnId: number,
        content: { id: number; type: 'Issue' | 'PullRequest' } | { note: string }
    ): Promise<void> {
        try {
            if ('note' in content) {
                await this.octokit.projects.createCard({
                    column_id: columnId,
                    note: content.note
                });
            } else {
                await this.octokit.projects.createCard({
                    column_id: columnId,
                    content_id: content.id,
                    content_type: content.type
                });
            }

            await this.refreshCards();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add card: ${error.message}`);
        }
    }

    public async moveCard(cardId: number, columnId: number, position?: 'top' | 'bottom'): Promise<void> {
        try {
            await this.octokit.projects.moveCard({
                card_id: cardId,
                column_id: columnId,
                position: position || 'bottom'
            });

            await this.refreshCards();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to move card: ${error.message}`);
        }
    }

    public async deleteCard(cardId: number): Promise<void> {
        try {
            await this.octokit.projects.deleteCard({
                card_id: cardId
            });

            await this.refreshCards();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete card: ${error.message}`);
        }
    }

    public async editCard(cardId: number, note: string): Promise<void> {
        try {
            await this.octokit.projects.updateCard({
                card_id: cardId,
                note
            });

            await this.refreshCards();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to edit card: ${error.message}`);
        }
    }

    private async handleProjectAction(owner: string, repo: string, action: any): Promise<void> {
        switch (action.type) {
            case 'addCard':
                if (action.note) {
                    await this.addCard(action.columnId, { note: action.note });
                } else {
                    await this.addCard(action.columnId, {
                        id: action.contentId,
                        type: action.contentType
                    });
                }
                break;

            case 'moveCard':
                await this.moveCard(action.cardId, action.columnId, action.position);
                break;

            case 'deleteCard':
                await this.deleteCard(action.cardId);
                break;

            case 'editCard':
                await this.editCard(action.cardId, action.note);
                break;

            case 'addColumn':
                await this.addColumn(action.projectId, action.name);
                break;

            case 'deleteColumn':
                await this.deleteColumn(action.columnId);
                break;

            case 'moveColumn':
                await this.moveColumn(action.columnId, action.position);
                break;

            case 'refresh':
                await this.refreshCards();
                break;
        }
    }

    private async addColumn(projectId: number, name: string): Promise<void> {
        try {
            await this.octokit.projects.createColumn({
                project_id: projectId,
                name
            });

            const columns = await this.getColumns(projectId);
            this.projectWebview?.updateColumns(columns);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add column: ${error.message}`);
        }
    }

    private async deleteColumn(columnId: number): Promise<void> {
        try {
            await this.octokit.projects.deleteColumn({
                column_id: columnId
            });

            await this.refreshCards();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete column: ${error.message}`);
        }
    }

    private async moveColumn(columnId: number, position: string): Promise<void> {
        try {
            await this.octokit.projects.moveColumn({
                column_id: columnId,
                position
            });

            await this.refreshCards();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to move column: ${error.message}`);
        }
    }

    private async refreshCards(): Promise<void> {
        if (this.projectWebview?.getCurrentProject()) {
            const cards = await this.getAllCards(this.projectWebview.getCurrentProject().id);
            this.projectWebview.updateCards(cards);
        }
    }

    public dispose(): void {
        this.projectWebview?.dispose();
    }
}
