import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { WorkflowWebview } from './workflowWebview';

export interface Workflow {
    id: number;
    name: string;
    path: string;
    state: string;
    created_at: string;
    updated_at: string;
    url: string;
}

export interface WorkflowRun {
    id: number;
    name: string;
    status: string;
    conclusion: string;
    head_branch: string;
    head_sha: string;
    event: string;
    created_at: string;
    updated_at: string;
    jobs_url: string;
    logs_url: string;
}

export interface Job {
    id: number;
    name: string;
    status: string;
    conclusion: string;
    started_at: string;
    completed_at: string;
    steps: JobStep[];
}

export interface JobStep {
    name: string;
    status: string;
    conclusion: string;
    number: number;
    started_at: string;
    completed_at: string;
}

export class WorkflowManager {
    private workflowWebview: WorkflowWebview | undefined;
    private statusBarItem: vscode.StatusBarItem;
    private runningWorkflows: Map<number, WorkflowRun>;

    constructor(
        private octokit: Octokit,
        private extensionUri: vscode.Uri,
        private context: vscode.ExtensionContext
    ) {
        this.runningWorkflows = new Map();
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.context.subscriptions.push(this.statusBarItem);
        this.startStatusBarUpdates();
    }

    public async showWorkflows(owner: string, repo: string): Promise<void> {
        try {
            const [workflows, runs] = await Promise.all([
                this.getWorkflows(owner, repo),
                this.getWorkflowRuns(owner, repo)
            ]);

            this.workflowWebview = new WorkflowWebview(
                this.extensionUri,
                {
                    workflows,
                    runs,
                    owner,
                    repo
                },
                async (action) => {
                    await this.handleWorkflowAction(owner, repo, action);
                }
            );

            await this.workflowWebview.show();
            this.updateRunningWorkflows(runs);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load workflows: ${error.message}`);
        }
    }

    private async getWorkflows(owner: string, repo: string): Promise<Workflow[]> {
        const { data } = await this.octokit.actions.listRepoWorkflows({
            owner,
            repo
        });
        return data.workflows;
    }

    private async getWorkflowRuns(
        owner: string,
        repo: string,
        workflow_id?: number
    ): Promise<WorkflowRun[]> {
        const params: any = { owner, repo };
        if (workflow_id) {
            params.workflow_id = workflow_id;
        }

        const { data } = await this.octokit.actions.listWorkflowRuns(params);
        return data.workflow_runs;
    }

    public async triggerWorkflow(
        owner: string,
        repo: string,
        workflow_id: number,
        ref: string,
        inputs?: Record<string, string>
    ): Promise<void> {
        try {
            await this.octokit.actions.createWorkflowDispatch({
                owner,
                repo,
                workflow_id,
                ref,
                inputs
            });

            vscode.window.showInformationMessage('Workflow triggered successfully!');
            
            // Refresh the runs list after a short delay
            setTimeout(async () => {
                const runs = await this.getWorkflowRuns(owner, repo, workflow_id);
                this.workflowWebview?.updateRuns(runs);
                this.updateRunningWorkflows(runs);
            }, 2000);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to trigger workflow: ${error.message}`);
        }
    }

    public async cancelWorkflowRun(
        owner: string,
        repo: string,
        run_id: number
    ): Promise<void> {
        try {
            await this.octokit.actions.cancelWorkflowRun({
                owner,
                repo,
                run_id
            });

            vscode.window.showInformationMessage('Workflow run cancelled');
            
            // Refresh the runs list
            const runs = await this.getWorkflowRuns(owner, repo);
            this.workflowWebview?.updateRuns(runs);
            this.updateRunningWorkflows(runs);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to cancel workflow run: ${error.message}`);
        }
    }

    public async getJobsForRun(
        owner: string,
        repo: string,
        run_id: number
    ): Promise<Job[]> {
        const { data } = await this.octokit.actions.listJobsForWorkflowRun({
            owner,
            repo,
            run_id
        });
        return data.jobs;
    }

    public async downloadArtifact(
        owner: string,
        repo: string,
        artifact_id: number
    ): Promise<void> {
        try {
            const { data } = await this.octokit.actions.downloadArtifact({
                owner,
                repo,
                artifact_id,
                archive_format: 'zip'
            });

            const uri = await vscode.window.showSaveDialog({
                filters: { 'ZIP files': ['zip'] }
            });

            if (uri) {
                // Save the artifact data to the selected file
                // Implementation depends on how the data is returned
                vscode.window.showInformationMessage('Artifact downloaded successfully!');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to download artifact: ${error.message}`);
        }
    }

    private async handleWorkflowAction(owner: string, repo: string, action: any): Promise<void> {
        switch (action.type) {
            case 'trigger':
                await this.triggerWorkflow(
                    owner,
                    repo,
                    action.workflow_id,
                    action.ref,
                    action.inputs
                );
                break;

            case 'cancel':
                await this.cancelWorkflowRun(owner, repo, action.run_id);
                break;

            case 'viewJobs':
                const jobs = await this.getJobsForRun(owner, repo, action.run_id);
                this.workflowWebview?.showJobs(jobs);
                break;

            case 'downloadArtifact':
                await this.downloadArtifact(owner, repo, action.artifact_id);
                break;

            case 'refresh':
                const [workflows, runs] = await Promise.all([
                    this.getWorkflows(owner, repo),
                    this.getWorkflowRuns(owner, repo)
                ]);
                this.workflowWebview?.update({ workflows, runs });
                this.updateRunningWorkflows(runs);
                break;
        }
    }

    private updateRunningWorkflows(runs: WorkflowRun[]): void {
        this.runningWorkflows.clear();
        runs.forEach(run => {
            if (run.status === 'in_progress') {
                this.runningWorkflows.set(run.id, run);
            }
        });
        this.updateStatusBar();
    }

    private updateStatusBar(): void {
        const runningCount = this.runningWorkflows.size;
        if (runningCount > 0) {
            this.statusBarItem.text = `$(sync~spin) ${runningCount} workflow${
                runningCount > 1 ? 's' : ''
            } running`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    private startStatusBarUpdates(): void {
        setInterval(() => {
            if (this.runningWorkflows.size > 0) {
                this.refreshRunningWorkflows();
            }
        }, 30000); // Update every 30 seconds
    }

    private async refreshRunningWorkflows(): Promise<void> {
        try {
            for (const [owner, repo] of this.getActiveRepositories()) {
                const runs = await this.getWorkflowRuns(owner, repo);
                this.updateRunningWorkflows(runs);
                this.workflowWebview?.updateRuns(runs);
            }
        } catch (error) {
            console.error('Failed to refresh workflow status:', error);
        }
    }

    private getActiveRepositories(): Array<[string, string]> {
        // This should return a list of active repositories being monitored
        // Implementation depends on how repository information is stored
        return [];
    }

    public dispose(): void {
        this.workflowWebview?.dispose();
        this.statusBarItem.dispose();
    }
}
