import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { RepoSettingsWebview } from './repoSettingsWebview';

export interface RepoSettings {
    name: string;
    description?: string;
    private: boolean;
    has_issues: boolean;
    has_projects: boolean;
    has_wiki: boolean;
    allow_squash_merge: boolean;
    allow_merge_commit: boolean;
    allow_rebase_merge: boolean;
    delete_branch_on_merge: boolean;
    allow_auto_merge: boolean;
    allow_update_branch: boolean;
    default_branch: string;
    branches: {
        name: string;
        protected: boolean;
        protection?: BranchProtection;
    }[];
}

export interface BranchProtection {
    required_status_checks: {
        strict: boolean;
        contexts: string[];
    };
    enforce_admins: boolean;
    required_pull_request_reviews: {
        dismissal_restrictions?: {
            users: string[];
            teams: string[];
        };
        dismiss_stale_reviews: boolean;
        require_code_owner_reviews: boolean;
        required_approving_review_count: number;
    };
    restrictions?: {
        users: string[];
        teams: string[];
        apps: string[];
    };
    required_linear_history: boolean;
    allow_force_pushes: boolean;
    allow_deletions: boolean;
}

export class RepoSettingsManager {
    private settingsWebview: RepoSettingsWebview | undefined;

    constructor(
        private octokit: Octokit,
        private extensionUri: vscode.Uri
    ) {}

    public async showSettings(owner: string, repo: string): Promise<void> {
        try {
            const settings = await this.getRepoSettings(owner, repo);
            const collaborators = await this.getCollaborators(owner, repo);
            const teams = await this.getTeams(owner, repo);

            this.settingsWebview = new RepoSettingsWebview(
                this.extensionUri,
                {
                    settings,
                    collaborators,
                    teams
                },
                async (action) => {
                    await this.handleSettingsAction(owner, repo, action);
                }
            );

            await this.settingsWebview.show();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load repository settings: ${error.message}`);
        }
    }

    private async getRepoSettings(owner: string, repo: string): Promise<RepoSettings> {
        const [repoData, branches] = await Promise.all([
            this.octokit.repos.get({ owner, repo }),
            this.octokit.repos.listBranches({ owner, repo })
        ]);

        const branchesWithProtection = await Promise.all(
            branches.data.map(async branch => {
                try {
                    const protection = await this.octokit.repos.getBranchProtection({
                        owner,
                        repo,
                        branch: branch.name
                    });
                    return {
                        name: branch.name,
                        protected: true,
                        protection: protection.data
                    };
                } catch {
                    return {
                        name: branch.name,
                        protected: false
                    };
                }
            })
        );

        return {
            ...repoData.data,
            branches: branchesWithProtection
        };
    }

    private async getCollaborators(owner: string, repo: string): Promise<any[]> {
        const { data } = await this.octokit.repos.listCollaborators({
            owner,
            repo
        });
        return data;
    }

    private async getTeams(owner: string, repo: string): Promise<any[]> {
        try {
            const { data } = await this.octokit.repos.listTeams({
                owner,
                repo
            });
            return data;
        } catch {
            return [];
        }
    }

    public async updateRepoSettings(
        owner: string,
        repo: string,
        settings: Partial<RepoSettings>
    ): Promise<void> {
        try {
            await this.octokit.repos.update({
                owner,
                repo,
                ...settings
            });

            vscode.window.showInformationMessage('Repository settings updated successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to update repository settings: ${error.message}`);
        }
    }

    public async updateBranchProtection(
        owner: string,
        repo: string,
        branch: string,
        protection: BranchProtection
    ): Promise<void> {
        try {
            await this.octokit.repos.updateBranchProtection({
                owner,
                repo,
                branch,
                ...protection
            });

            vscode.window.showInformationMessage(`Branch protection updated for ${branch}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to update branch protection: ${error.message}`);
        }
    }

    public async deleteBranchProtection(
        owner: string,
        repo: string,
        branch: string
    ): Promise<void> {
        try {
            await this.octokit.repos.deleteBranchProtection({
                owner,
                repo,
                branch
            });

            vscode.window.showInformationMessage(`Branch protection removed from ${branch}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to remove branch protection: ${error.message}`);
        }
    }

    private async handleSettingsAction(owner: string, repo: string, action: any): Promise<void> {
        switch (action.type) {
            case 'updateSettings':
                await this.updateRepoSettings(owner, repo, action.settings);
                break;

            case 'updateBranchProtection':
                await this.updateBranchProtection(
                    owner,
                    repo,
                    action.branch,
                    action.protection
                );
                break;

            case 'deleteBranchProtection':
                await this.deleteBranchProtection(owner, repo, action.branch);
                break;

            case 'refresh':
                const settings = await this.getRepoSettings(owner, repo);
                this.settingsWebview?.updateSettings(settings);
                break;
        }
    }

    public dispose() {
        this.settingsWebview?.dispose();
    }
}
