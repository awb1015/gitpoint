// src/extension.ts
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { 
    openInBrowser, 
    viewFileHistory, 
    blameFile 
} from './commands';


const execAsync = promisify(exec);

export interface GitInfo {
    remoteUrl: string;
    currentBranch: string;
    defaultBranch: string;
    hostType: HostType;
}

export interface LineRange {
    start: number;
    end: number;
}

export enum HostType {
    GitHub = 'github',
    GitLab = 'gitlab',
    Bitbucket = 'bitbucket',
    Unknown = 'unknown'
}

function detectHostType(url: string): HostType {
    if (url.includes('github.com')) return HostType.GitHub;
    if (url.includes('gitlab.com')) return HostType.GitLab;
    if (url.includes('bitbucket.org')) return HostType.Bitbucket;
    
    // Try to detect self-hosted instances
    if (url.includes('gitlab')) return HostType.GitLab;
    if (url.includes('bitbucket')) return HostType.Bitbucket;
    
    return HostType.Unknown;
}

export function normalizeGitUrl(url: string): string {
    // Remove any vscode.dev prefix
    url = url.replace('vscode.dev/', '');
    
    // Handle SSH URLs for different hosts
    const sshPatterns = {
        [HostType.GitHub]: /git@github\.com:(.+?)(?:\.git)?$/,
        [HostType.GitLab]: /git@gitlab\.com:(.+?)(?:\.git)?$/,
        [HostType.Bitbucket]: /git@bitbucket\.org:(.+?)(?:\.git)?$/
    };

    // Handle HTTPS URLs
    const httpsPatterns = {
        [HostType.GitHub]: /https:\/\/github\.com\/(.+?)(?:\.git)?$/,
        [HostType.GitLab]: /https:\/\/gitlab\.com\/(.+?)(?:\.git)?$/,
        [HostType.Bitbucket]: /https:\/\/bitbucket\.org\/(.+?)(?:\.git)?$/
    };

    const hostType = detectHostType(url);
    
    if (hostType !== HostType.Unknown) {
        // Try SSH pattern
        const sshMatch = url.match(sshPatterns[hostType]);
        if (sshMatch) {
            switch (hostType) {
                case HostType.GitHub:
                    return `https://github.com/${sshMatch[1]}`;
                case HostType.GitLab:
                    return `https://gitlab.com/${sshMatch[1]}`;
                case HostType.Bitbucket:
                    return `https://bitbucket.org/${sshMatch[1]}`;
            }
        }

        // Try HTTPS pattern
        const httpsMatch = url.match(httpsPatterns[hostType]);
        if (httpsMatch) {
            switch (hostType) {
                case HostType.GitHub:
                    return `https://github.com/${httpsMatch[1]}`;
                case HostType.GitLab:
                    return `https://gitlab.com/${httpsMatch[1]}`;
                case HostType.Bitbucket:
                    return `https://bitbucket.org/${httpsMatch[1]}`;
            }
        }
    }

    // Clean up URL
    return url.replace(/\.git$/, '')
              .replace(/^\s+|\s+$/g, '')
              .replace(/^git:\/\//, 'https://');
}

export async function getGitInfo(workspacePath: string): Promise<GitInfo | null> {
    try {
        console.log('Getting git info for workspace:', workspacePath);
        
        // Get remote URL
        const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url', { 
            cwd: workspacePath,
            env: { ...process.env, PATH: process.env.PATH }  // Ensure git is in PATH
        });
        console.log('Remote URL:', remoteUrl);
        
        const normalizedUrl = normalizeGitUrl(remoteUrl.trim());
        const hostType = detectHostType(normalizedUrl);
        
        // Get current branch
        const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', { 
            cwd: workspacePath,
            env: { ...process.env, PATH: process.env.PATH }
        });
        console.log('Current branch:', currentBranch);
        
        // Get default branch
        const { stdout: defaultBranch } = await execAsync(
            'git remote show origin | grep "HEAD branch" | cut -d: -f2',
            { 
                cwd: workspacePath,
                env: { ...process.env, PATH: process.env.PATH }
            }
        );
        console.log('Default branch:', defaultBranch);

        return {
            remoteUrl: normalizedUrl,
            currentBranch: currentBranch.trim(),
            defaultBranch: defaultBranch.trim(),
            hostType
        };
    } catch (error) {
        console.error('Error getting git info:', error);
        return null;
    }
}

export function generatePermalinkUrl(
    gitInfo: GitInfo,
    commitHash: string,
    relativePath: string,
    range: LineRange
): string {
    const lineRange = range.start === range.end ? `L${range.start}` : `L${range.start}-L${range.end}`;
    
    switch (gitInfo.hostType) {
        case HostType.GitHub:
            return `${gitInfo.remoteUrl}/blob/${commitHash}/${relativePath}#${lineRange}`;
        
        case HostType.GitLab:
            return `${gitInfo.remoteUrl}/-/blob/${commitHash}/${relativePath}#L${range.start}${range.end !== range.start ? `-${range.end}` : ''}`;
        
        case HostType.Bitbucket:
            // Bitbucket uses different line number syntax
            return `${gitInfo.remoteUrl}/src/${commitHash}/${relativePath}#lines-${range.start}${range.end !== range.start ? `:${range.end}` : ''}`;
        
        default:
            // For unknown hosts, try GitHub-style format
            return `${gitInfo.remoteUrl}/blob/${commitHash}/${relativePath}#${lineRange}`;
    }
}

async function generatePermalink(range: LineRange): Promise<void> {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor');
            return;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('File is not part of a workspace');
            return;
        }

        const gitInfo = await getGitInfo(workspaceFolder.uri.fsPath);
        if (!gitInfo) {
            vscode.window.showErrorMessage('Not a git repository or no remote configured');
            return;
        }

        // Check if current branch exists on remote
        const { stdout: remoteBranches } = await execAsync('git branch -r', { cwd: workspaceFolder.uri.fsPath });
        const hasRemoteBranch = remoteBranches.includes(`origin/${gitInfo.currentBranch}`);

        // Get commit hash
        const branchToUse = hasRemoteBranch ? gitInfo.currentBranch : gitInfo.defaultBranch;
        const { stdout: commitHash } = await execAsync(
            `git rev-parse origin/${branchToUse}`,
            { cwd: workspaceFolder.uri.fsPath }
        );

        const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
        const permalink = generatePermalinkUrl(gitInfo, commitHash.trim(), relativePath, range);

        await vscode.env.clipboard.writeText(permalink);
        const message = range.start === range.end
            ? `${gitInfo.hostType} permalink for line ${range.start} copied to clipboard!`
            : `${gitInfo.hostType} permalink for lines ${range.start}-${range.end} copied to clipboard!`;
        vscode.window.showInformationMessage(message);
    } catch (error) {
        console.error('Error generating permalink:', error);
        vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function activate(context: vscode.ExtensionContext) {
    // Command for single line permalinks
    let linePermalink = vscode.commands.registerCommand('gitpoint.generateLinePermalink', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const line = editor.selection.active.line + 1;
            await generatePermalink({ start: line, end: line });
        }
    });

    // Command for selection permalinks
    let selectionPermalink = vscode.commands.registerCommand('gitpoint.generateSelectionPermalink', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && !editor.selection.isEmpty) {
            const startLine = Math.min(editor.selection.start.line + 1, editor.selection.end.line + 1);
            const endLine = Math.max(editor.selection.start.line + 1, editor.selection.end.line + 1);
            await generatePermalink({ start: startLine, end: endLine });
        }
    });

    let browserCommand = vscode.commands.registerCommand('gitpoint.openInBrowser', async () => {
        console.log('openInBrowser command triggered');
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            console.log('Active editor found:', editor.document.uri.fsPath);
            await openInBrowser(editor.document.uri);
        } else {
            console.log('No active editor');
            vscode.window.showErrorMessage('No active text editor');
        }
    });

    let historyCommand = vscode.commands.registerCommand('gitpoint.viewFileHistory', async () => {
        console.log('viewFileHistory command triggered');
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            console.log('Active editor found:', editor.document.uri.fsPath);
            await viewFileHistory(editor.document.uri);
        } else {
            console.log('No active editor');
            vscode.window.showErrorMessage('No active text editor');
        }
    });

    let blameCommand = vscode.commands.registerCommand('gitpoint.blameFile', async () => {
        console.log('blameFile command triggered');
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            console.log('Active editor found:', editor.document.uri.fsPath);
            await blameFile(editor.document.uri);
        } else {
            console.log('No active editor');
            vscode.window.showErrorMessage('No active text editor');
        }
    });

    // Register all commands in context.subscriptions
    context.subscriptions.push(
        linePermalink,
        selectionPermalink,
        browserCommand,
        historyCommand,
        blameCommand
    );
}

export function deactivate() {}