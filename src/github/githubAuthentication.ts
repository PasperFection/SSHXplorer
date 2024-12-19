import * as vscode from 'vscode';

export class GitHubAuthentication {
    private static readonly GITHUB_AUTH_PROVIDER = 'github';
    private static readonly SCOPES = ['repo', 'user'];

    async getToken(): Promise<string | undefined> {
        try {
            const session = await vscode.authentication.getSession(
                GitHubAuthentication.GITHUB_AUTH_PROVIDER,
                GitHubAuthentication.SCOPES,
                { createIfNone: true }
            );
            return session?.accessToken;
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`GitHub Authentication failed: ${error.message}`);
            }
            return undefined;
        }
    }

    async clearSession(): Promise<void> {
        try {
            const session = await vscode.authentication.getSession(
                GitHubAuthentication.GITHUB_AUTH_PROVIDER,
                GitHubAuthentication.SCOPES,
                { createIfNone: false }
            );
            if (session) {
                await vscode.authentication.getSession(
                    GitHubAuthentication.GITHUB_AUTH_PROVIDER,
                    GitHubAuthentication.SCOPES,
                    { clearSessionPreference: true }
                );
            }
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to clear session: ${error.message}`);
            }
        }
    }
}
