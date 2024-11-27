import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GitInfo {
    remoteUrl: string;
    currentBranch: string;
    defaultBranch: string;
}

interface LineRange {
    start: number;
    end: number;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('GitPoint activated');
    
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

    context.subscriptions.push(linePermalink, selectionPermalink);
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

        console.log('Getting git info for workspace:', workspaceFolder.uri.fsPath);
        const gitInfo = await getGitInfo(workspaceFolder.uri.fsPath);
        if (!gitInfo) {
            vscode.window.showErrorMessage('Not a git repository or no remote configured');
            return;
        }

        const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
        const permalink = await generateGitHubPermalink(
            gitInfo,
            relativePath,
            range,
            workspaceFolder.uri.fsPath
        );

        if (permalink) {
            await vscode.env.clipboard.writeText(permalink);
            const message = range.start === range.end
                ? `GitHub permalink for line ${range.start} copied to clipboard!`
                : `GitHub permalink for lines ${range.start}-${range.end} copied to clipboard!`;
            vscode.window.showInformationMessage(message);
        }
    } catch (error) {
        console.error('Error generating permalink:', error);
        vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function getGitInfo(workspacePath: string): Promise<GitInfo | null> {
    try {
        const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url', { cwd: workspacePath });
        const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: workspacePath });
        const { stdout: defaultBranch } = await execAsync(
            'git remote show origin | grep "HEAD branch" | cut -d: -f2',
            { cwd: workspacePath }
        );

        return {
            remoteUrl: normalizeGitHubUrl(remoteUrl.trim()),
            currentBranch: currentBranch.trim(),
            defaultBranch: defaultBranch.trim()
        };
    } catch (error) {
        console.error('Error getting git info:', error);
        return null;
    }
}

export function normalizeGitHubUrl(url: string): string {
    // Check for vscode.dev format
    if (url.includes('vscode.dev/github/')) {
        const match = url.match(/vscode\.dev\/github\/([^\/]+\/[^\/]+)/);
        if (match) {
            return `https://github.com/${match[1]}`;
        }
    }
    
    // Check SSH format
    const sshMatch = url.match(/git@github\.com:([^\/]+\/[^\/\.]+)(?:\.git)?$/);
    if (sshMatch) {
        return `https://github.com/${sshMatch[1]}`;
    }
    
    // Check HTTPS format
    const httpsMatch = url.match(/https:\/\/github\.com\/([^\/]+\/[^\/\.]+)(?:\.git)?$/);
    if (httpsMatch) {
        return `https://github.com/${httpsMatch[1]}`;
    }
    
    // If no matches, clean up the URL as best we can
    return url.replace(/\.git$/, '')
              .replace(/^\s+|\s+$/g, '')
              .replace(/^git:\/\/github\.com\//, 'https://github.com/')
              .replace(/^https:\/\/vscode\.dev\/github\//, 'https://github.com/');
}

export async function generateGitHubPermalink(
    gitInfo: GitInfo,
    relativePath: string,
    range: LineRange,
    workspacePath: string
): Promise<string | null> {
    try {
        // Check if current branch exists on remote
        const { stdout: remoteBranches } = await execAsync('git branch -r', { cwd: workspacePath });
        const hasRemoteBranch = remoteBranches.includes(`origin/${gitInfo.currentBranch}`);

        // Get commit hash
        const branchToUse = hasRemoteBranch ? gitInfo.currentBranch : gitInfo.defaultBranch;
        const { stdout: commitHash } = await execAsync(
            `git rev-parse origin/${branchToUse}`,
            { cwd: workspacePath }
        );

        // Generate the line range part of the URL
        const lineRange = range.start === range.end 
            ? `L${range.start}` 
            : `L${range.start}-L${range.end}`;

        return `${gitInfo.remoteUrl}/blob/${commitHash.trim()}/${relativePath}#${lineRange}`;
    } catch (error) {
        console.error('Error generating permalink:', error);
        return null;
    }
}

export function deactivate() {}