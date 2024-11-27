export const window = {
    activeTextEditor: {
        document: {
            uri: {
                fsPath: '/test/path'
            }
        },
        selection: {
            active: { line: 0 },
            start: { line: 0 },
            end: { line: 0 }
        }
    },
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn()
};

export const workspace = {
    getWorkspaceFolder: jest.fn(),
    asRelativePath: jest.fn()
};

export const env = {
    clipboard: {
        writeText: jest.fn()
    }
};

export const ExtensionContext = jest.fn();
export const commands = {
    registerCommand: jest.fn()
};