declare module 'simple-git' {
    export interface SimpleGit {
        raw(arg0: string[]): unknown;
        add(files: string | string[]): Promise<void>;
        checkout(options: string[]): Promise<void>;
        checkoutBranch(branchName: string, startPoint?: string): Promise<void>;
        checkoutLocalBranch(branchName: string): Promise<void>;
        commit(message: string): Promise<void>;
        fetch(remote?: string, branch?: string): Promise<void>;
        init(): Promise<void>;
        merge(options: string[]): Promise<void>;
        pull(remote?: string, branch?: string, options?: string[]): Promise<void>;
        push(remote?: string, branch?: string, options?: string[]): Promise<void>;
        status(): Promise<StatusResult>;
        stash(command?: string): Promise<void>;
        stashList(): Promise<StashListSummary>;
        stashPop(stashRef?: string): Promise<void>;
    }

    export interface StatusResult {
        not_added: string[];
        conflicted: string[];
        created: string[];
        deleted: string[];
        modified: string[];
        renamed: string[];
        files: Array<{
            path: string;
            index: string;
            working_dir: string;
        }>;
        ahead: number;
        behind: number;
        current: string;
        tracking: string;
    }

    export interface StashListSummary {
        all: StashListItem[];
        latest: StashListItem | null;
        total: number;
    }

    export interface StashListItem {
        date: Date;
        hash: string;
        index: number;
        message: string;
    }

    export interface GitError extends Error {
        git?: string;
    }

    export function simpleGit(baseDir?: string): SimpleGit;
    export default function(baseDir?: string): SimpleGit;
}
