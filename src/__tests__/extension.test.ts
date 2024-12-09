import { normalizeGitUrl, generatePermalinkUrl, getGitInfo } from '../extension';
import { exec } from 'child_process';
import * as vscode from 'vscode';

// Mock child_process
jest.mock('child_process', () => ({
    exec: jest.fn((_cmd, opts, callback) => {
        if (typeof opts === 'function') {
            callback = opts;
        }
        // Simulate async behavior
        process.nextTick(() => callback(null, { stdout: '', stderr: '' }));
    })
}));

describe('GitPoint URL Normalization', () => {
    const testCases = [
        {
            name: 'SSH URL',
            input: 'git@github.com:user/repo.git',
            expected: 'https://github.com/user/repo'
        },
        {
            name: 'HTTPS URL',
            input: 'https://github.com/user/repo.git',
            expected: 'https://github.com/user/repo'
        },
        {
            name: 'VSCode Dev URL',
            input: 'https://vscode.dev/github/user/repo',
            expected: 'https://github.com/user/repo'
        },
        {
            name: 'Git Protocol URL',
            input: 'git://github.com/user/repo.git',
            expected: 'https://github.com/user/repo'
        }
    ];

    testCases.forEach(({ name, input, expected }) => {
        test(`normalizes ${name}`, () => {
            expect(normalizeGitUrl(input)).toBe(expected);
        });
    });

    test('handles malformed URLs gracefully', () => {
        const malformedUrl = 'not-a-github-url';
        expect(() => normalizeGitUrl(malformedUrl)).not.toThrow();
    });
});

describe('Git Info Retrieval', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('successfully gets git info', async () => {
        const mockExec = exec as jest.MockedFunction<typeof exec>;
        mockExec.mockImplementation((_cmd: string, opts: any, callback: any) => {
            if (typeof opts === 'function') {
                callback = opts;
            }
            callback(null, { stdout: 'https://github.com/user/repo.git', stderr: '' });
            return {} as any;
        });

        const info = await getGitInfo('/test/path');
        expect(info).toBeTruthy();
    });

    test('handles git command errors', async () => {
        const mockExec = exec as jest.MockedFunction<typeof exec>;
        mockExec.mockImplementation((_cmd: string, _opts: any, callback: any) => {
            callback(new Error('git command failed'), { stdout: '', stderr: 'error' });
            return {} as any;
        });

        const info = await getGitInfo('/test/path');
        expect(info).toBeNull();
    });
});

describe('GitHub Permalink Generation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('generates permalink for single line', async () => {
        const gitInfo = {
            remoteUrl: 'https://github.com/user/repo',
            currentBranch: 'main',
            defaultBranch: 'main'
        };

        const mockExec = exec as jest.MockedFunction<typeof exec>;
        mockExec.mockImplementation((_cmd: string, opts: any, callback: any) => {
            if (typeof opts === 'function') {
                callback = opts;
            }
            callback(null, { stdout: 'origin/main\nabcd1234', stderr: '' });
            return {} as any;
        });

        const permalink = await generatePermalinkUrl(
            gitInfo,
            'src/file.ts',
            { start: 10, end: 10 },
            '/test/path'
        );

        expect(permalink).toBeTruthy();
        expect(permalink).toContain('#L10');
    });
});