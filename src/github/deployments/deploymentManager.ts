import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { DeploymentWebview } from './deploymentWebview';

export interface Deployment {
    id: number;
    sha: string;
    ref: string;
    task: string;
    environment: string;
    description?: string;
    creator: {
        login: string;
        avatar_url: string;
    };
    created_at: string;
    updated_at: string;
    statuses_url: string;
    repository_url: string;
    transient_environment: boolean;
    production_environment: boolean;
}

export interface DeploymentStatus {
    id: number;
    state: 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success';
    description?: string;
    environment_url?: string;
    log_url?: string;
    created_at: string;
    updated_at: string;
    creator: {
        login: string;
        avatar_url: string;
    };
}

export interface Environment {
    id: number;
    name: string;
    url?: string;
    protection_rules?: {
        id: number;
        type: string;
        wait_timer?: number;
        reviewers?: {
            type: string;
            reviewer: {
                login: string;
                avatar_url: string;
            };
        }[];
    }[];
    deployment_branch_policy?: {
        protected_branches: boolean;
        custom_branch_policies: boolean;
    };
}

export class DeploymentManager {
    private deploymentWebview: DeploymentWebview | undefined;
    private refreshInterval: NodeJS.Timer | undefined;

    constructor(
        private octokit: Octokit,
        private extensionUri: vscode.Uri
    ) {}

    public async showDeployments(owner: string, repo: string): Promise<void> {
        try {
            const [deployments, environments] = await Promise.all([
                this.getDeployments(owner, repo),
                this.getEnvironments(owner, repo)
            ]);

            const deploymentStatuses = await Promise.all(
                deployments.map(deployment =>
                    this.getDeploymentStatus(owner, repo, deployment.id)
                )
            );

            this.deploymentWebview = new DeploymentWebview(
                this.extensionUri,
                {
                    owner,
                    repo,
                    deployments,
                    deploymentStatuses,
                    environments
                },
                async (action) => {
                    await this.handleDeploymentAction(owner, repo, action);
                }
            );

            await this.deploymentWebview.show();
            this.startAutoRefresh(owner, repo);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load deployments: ${error.message}`);
        }
    }

    private async getDeployments(owner: string, repo: string): Promise<Deployment[]> {
        const { data } = await this.octokit.repos.listDeployments({
            owner,
            repo
        });
        return data;
    }

    private async getDeploymentStatus(
        owner: string,
        repo: string,
        deployment_id: number
    ): Promise<DeploymentStatus[]> {
        const { data } = await this.octokit.repos.listDeploymentStatuses({
            owner,
            repo,
            deployment_id
        });
        return data;
    }

    private async getEnvironments(owner: string, repo: string): Promise<Environment[]> {
        const { data } = await this.octokit.repos.getAllEnvironments({
            owner,
            repo
        });
        return data.environments;
    }

    public async createDeployment(
        owner: string,
        repo: string,
        options: {
            ref: string;
            task: string;
            environment: string;
            description?: string;
            transient_environment?: boolean;
            production_environment?: boolean;
            required_contexts?: string[];
        }
    ): Promise<void> {
        try {
            const { data: deployment } = await this.octokit.repos.createDeployment({
                owner,
                repo,
                ...options,
                auto_merge: false
            });

            await this.refreshDeployments(owner, repo);
            vscode.window.showInformationMessage(`Deployment created successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create deployment: ${error.message}`);
        }
    }

    public async createDeploymentStatus(
        owner: string,
        repo: string,
        deployment_id: number,
        options: {
            state: DeploymentStatus['state'];
            description?: string;
            environment_url?: string;
            log_url?: string;
        }
    ): Promise<void> {
        try {
            await this.octokit.repos.createDeploymentStatus({
                owner,
                repo,
                deployment_id,
                ...options
            });

            await this.refreshDeployments(owner, repo);
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to update deployment status: ${error.message}`
            );
        }
    }

    public async createEnvironment(
        owner: string,
        repo: string,
        options: {
            name: string;
            wait_timer?: number;
            reviewers?: {
                type: string;
                id: number;
            }[];
            deployment_branch_policy?: {
                protected_branches: boolean;
                custom_branch_policies: boolean;
            };
        }
    ): Promise<void> {
        try {
            await this.octokit.repos.createOrUpdateEnvironment({
                owner,
                repo,
                environment_name: options.name,
                wait_timer: options.wait_timer,
                reviewers: options.reviewers,
                deployment_branch_policy: options.deployment_branch_policy
            });

            await this.refreshDeployments(owner, repo);
            vscode.window.showInformationMessage(`Environment created successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create environment: ${error.message}`);
        }
    }

    public async deleteEnvironment(
        owner: string,
        repo: string,
        environment_name: string
    ): Promise<void> {
        try {
            await this.octokit.repos.deleteAnEnvironment({
                owner,
                repo,
                environment_name
            });

            await this.refreshDeployments(owner, repo);
            vscode.window.showInformationMessage(`Environment deleted successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete environment: ${error.message}`);
        }
    }

    private async handleDeploymentAction(
        owner: string,
        repo: string,
        action: any
    ): Promise<void> {
        switch (action.type) {
            case 'createDeployment':
                await this.createDeployment(owner, repo, action.options);
                break;

            case 'updateStatus':
                await this.createDeploymentStatus(
                    owner,
                    repo,
                    action.deployment_id,
                    action.options
                );
                break;

            case 'createEnvironment':
                await this.createEnvironment(owner, repo, action.options);
                break;

            case 'deleteEnvironment':
                await this.deleteEnvironment(owner, repo, action.environment_name);
                break;

            case 'refresh':
                await this.refreshDeployments(owner, repo);
                break;
        }
    }

    private async refreshDeployments(owner: string, repo: string): Promise<void> {
        try {
            const [deployments, environments] = await Promise.all([
                this.getDeployments(owner, repo),
                this.getEnvironments(owner, repo)
            ]);

            const deploymentStatuses = await Promise.all(
                deployments.map(deployment =>
                    this.getDeploymentStatus(owner, repo, deployment.id)
                )
            );

            this.deploymentWebview?.update({
                deployments,
                deploymentStatuses,
                environments
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to refresh deployments: ${error.message}`);
        }
    }

    private startAutoRefresh(owner: string, repo: string): void {
        // Refresh deployments every minute
        this.refreshInterval = setInterval(() => {
            this.refreshDeployments(owner, repo);
        }, 60 * 1000);
    }

    public dispose(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.deploymentWebview?.dispose();
    }
}
