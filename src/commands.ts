// src/commands.ts
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getGitInfo } from './extension';

const execAsync = promisify(exec);

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
        console.log('Relative path:', relativePath);
        console.log('Git info:', gitInfo);
        console.log('Commit hash:', commitHash.trim());
        
        const url = `${gitInfo.remoteUrl}/blob/${commitHash.trim()}/${relativePath}`;
        console.log('Opening URL:', url);
        await vscode.env.openExternal(vscode.Uri.parse(url));
        vscode.window.showInformationMessage(`Opening ${url} in browser`);
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

    const relativePath = vscode.workspace.asRelativePath(uri);
    console.log('Relative path:', relativePath);
    console.log('Git info:', gitInfo);
    
    const url = `${gitInfo.remoteUrl}/commits/${gitInfo.currentBranch}/${relativePath}`;
    console.log('Opening URL:', url);
    await vscode.env.openExternal(vscode.Uri.parse(url));
    vscode.window.showInformationMessage(`Opening file history in browser`);
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

    const relativePath = vscode.workspace.asRelativePath(uri);
    console.log('Relative path:', relativePath);
    console.log('Git info:', gitInfo);
    
    const url = `${gitInfo.remoteUrl}/blame/${gitInfo.currentBranch}/${relativePath}`;
    console.log('Opening URL:', url);
    await vscode.env.openExternal(vscode.Uri.parse(url));
    vscode.window.showInformationMessage(`Opening blame view in browser`);
}