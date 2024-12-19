// src/commands.ts
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getGitInfo, HostType } from './extension';

const execAsync = promisify(exec);

function generateBrowserUrl(
    gitInfo: { remoteUrl: string; currentBranch: string; hostType: HostType },
    commitHash: string,
    relativePath: string
): string {
    switch (gitInfo.hostType) {
        case HostType.GitHub:
            return `${gitInfo.remoteUrl}/blob/${commitHash}/${relativePath}`;
        case HostType.GitLab:
            return `${gitInfo.remoteUrl}/-/blob/${commitHash}/${relativePath}`;
        case HostType.Bitbucket:
            return `${gitInfo.remoteUrl}/src/${commitHash}/${relativePath}`;
        default:
            return `${gitInfo.remoteUrl}/blob/${commitHash}/${relativePath}`;
    }
}

function generateHistoryUrl(
    gitInfo: { remoteUrl: string; currentBranch: string; hostType: HostType },
    relativePath: string
): string {
    switch (gitInfo.hostType) {
        case HostType.GitHub:
            return `${gitInfo.remoteUrl}/commits/${gitInfo.currentBranch}/${relativePath}`;
        case HostType.GitLab:
            return `${gitInfo.remoteUrl}/-/commits/${gitInfo.currentBranch}/${relativePath}`;
        case HostType.Bitbucket:
            return `${gitInfo.remoteUrl}/history-node/${gitInfo.currentBranch}/${relativePath}`;
        default:
            return `${gitInfo.remoteUrl}/commits/${gitInfo.currentBranch}/${relativePath}`;
    }
}

function generateBlameUrl(
    gitInfo: { remoteUrl: string; currentBranch: string; hostType: HostType },
    commitHash: string,
    relativePath: string
): string {
    switch (gitInfo.hostType) {
        case HostType.GitHub:
            return `${gitInfo.remoteUrl}/blame/${commitHash}/${relativePath}`;
        case HostType.GitLab:
            return `${gitInfo.remoteUrl}/-/blame/${commitHash}/${relativePath}`;
        case HostType.Bitbucket:
            return `${gitInfo.remoteUrl}/annotate/${commitHash}/${relativePath}`;
        default:
            return `${gitInfo.remoteUrl}/blame/${commitHash}/${relativePath}`;
    }
}

export async function openInBrowser(uri: vscode.Uri) {
    console.log('openInBrowser called with uri:', uri.fsPath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    
    if (!workspaceFolder) {
        console.log('No workspace folder found');
        vscode.window.showErrorMessage('File is not part of a workspace');
        return;
    }

    const gitInfo = await getGitInfo(workspaceFolder.uri.fsPath);
    if (!gitInfo) {
        console.log('No git info found');
        vscode.window.showErrorMessage('Unable to get repository information');
        return;
    }

    try {
        // Check if current branch exists on remote
        const { stdout: remoteBranches } = await execAsync('git branch -r', { 
            cwd: workspaceFolder.uri.fsPath 
        });
        const hasRemoteBranch = remoteBranches.includes(`origin/${gitInfo.currentBranch}`);

        // Get commit hash from the appropriate branch
        const branchToUse = hasRemoteBranch ? gitInfo.currentBranch : gitInfo.defaultBranch;
        const { stdout: commitHash } = await execAsync(
            `git rev-parse origin/${branchToUse}`,
            { cwd: workspaceFolder.uri.fsPath }
        );

        const relativePath = vscode.workspace.asRelativePath(uri);
        const url = generateBrowserUrl(gitInfo, commitHash.trim(), relativePath);
        
        console.log('Opening URL:', url);
        await vscode.env.openExternal(vscode.Uri.parse(url));
        vscode.window.showInformationMessage(`Opening in ${gitInfo.hostType} browser`);
    } catch (error) {
        console.error('Error getting git information:', error);
        vscode.window.showErrorMessage('Failed to get git branch information');
    }
}

export async function viewFileHistory(uri: vscode.Uri) {
    console.log('viewFileHistory called with uri:', uri.fsPath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    
    if (!workspaceFolder) {
        console.log('No workspace folder found');
        vscode.window.showErrorMessage('File is not part of a workspace');
        return;
    }

    const gitInfo = await getGitInfo(workspaceFolder.uri.fsPath);
    if (!gitInfo) {
        console.log('No git info found');
        vscode.window.showErrorMessage('Unable to get repository information');
        return;
    }

    try {
        const relativePath = vscode.workspace.asRelativePath(uri);
        const url = generateHistoryUrl(gitInfo, relativePath);
        
        console.log('Opening URL:', url);
        await vscode.env.openExternal(vscode.Uri.parse(url));
        vscode.window.showInformationMessage(`Opening file history in ${gitInfo.hostType}`);
    } catch (error) {
        console.error('Error viewing file history:', error);
        vscode.window.showErrorMessage('Failed to open file history');
    }
}

export async function blameFile(uri: vscode.Uri) {
    console.log('blameFile called with uri:', uri.fsPath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    
    if (!workspaceFolder) {
        console.log('No workspace folder found');
        vscode.window.showErrorMessage('File is not part of a workspace');
        return;
    }

    const gitInfo = await getGitInfo(workspaceFolder.uri.fsPath);
    if (!gitInfo) {
        console.log('No git info found');
        vscode.window.showErrorMessage('Unable to get repository information');
        return;
    }

    try {
        // Get current commit hash for blame
        const { stdout: commitHash } = await execAsync('git rev-parse HEAD', { 
            cwd: workspaceFolder.uri.fsPath 
        });

        const relativePath = vscode.workspace.asRelativePath(uri);
        const url = generateBlameUrl(gitInfo, commitHash.trim(), relativePath);
        
        console.log('Opening URL:', url);
        await vscode.env.openExternal(vscode.Uri.parse(url));
        vscode.window.showInformationMessage(`Opening blame view in ${gitInfo.hostType}`);
    } catch (error) {
        console.error('Error viewing blame:', error);
        vscode.window.showErrorMessage('Failed to open blame view');
    }
}