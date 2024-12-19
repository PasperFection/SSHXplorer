import { Uri, CommentThread } from 'vscode';

export interface WorkflowRun {
    id: number;
    name: string;
    node_id: string;
    head_branch: string;
    head_sha: string;
    status: string;
    conclusion: string;
    url: string;
    html_url: string;
    created_at: string;
    updated_at: string;
    jobs_url: string;
    logs_url: string;
}

export interface Job {
    id: number;
    run_id: number;
    run_url: string;
    node_id: string;
    head_sha: string;
    url: string;
    html_url: string;
    status: string;
    conclusion: string;
    started_at: string;
    completed_at: string;
    name: string;
    steps: WorkflowStep[];
    check_run_url: string;
}

export interface WorkflowStep {
    name: string;
    status: string;
    conclusion: string;
    number: number;
    startedAt: string;
    completedAt: string;
}

export interface ReviewComment {
    id: number;
    node_id: string;
    url: string;
    body: string;
    path: string;
    position: number;
    line: number;
    commit_id: string;
    user: {
        login: string;
        avatar_url: string;
    };
    created_at: string;
    updated_at: string;
}

export interface CommentThreadData {
    thread: CommentThread;
    comments: ReviewComment[];
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
    restrictions: {
        users: string[];
        teams: string[];
        apps: string[];
    } | null;
}

export interface CommitActivity {
    days: number[];
    total: number;
    week: number;
}

export interface ContributorStats {
    author: {
        login: string;
        avatar_url: string;
    };
    total: number;
    weeks: {
        w: number;
        a: number;
        d: number;
        c: number;
    }[];
}

export interface Deployment {
    id: number;
    sha: string;
    ref: string;
    task: string;
    environment: string;
    description: string;
    creator: {
        login: string;
        avatar_url: string;
    };
    created_at: string;
    updated_at: string;
    statuses_url: string;
    repository_url: string;
}

export interface DeploymentStatus {
    id: number;
    state: string;
    creator: {
        login: string;
        avatar_url: string;
    };
    description: string;
    environment: string;
    target_url: string;
    created_at: string;
    updated_at: string;
}

export interface Environment {
    id: number;
    name: string;
    url: string;
    html_url: string;
    created_at: string;
    updated_at: string;
}

export interface CompressionStats {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    compressionTime?: number;
}

export interface LanguageModelAccessInformation {
    authenticationProvider: string;
}
