# GitPoint

![GitPoint Icon](images/gitpoint-icon.png)

Generate and share precise permalinks for Github, GitLab and Bitbucket with a simple right-click in VS Code. GitPoint makes it easy to reference specific lines of code in your repositories.

## Features

- 🔗 Generate permalinks to specific lines of code
- 🌲 Automatically handles both current and default branches
- 🔄 Supports both SSH and HTTPS repository URLs
- 📋 Copies links directly to your clipboard
- 💡 Smart fallback to default branch when needed

## Usage

1. Right-click on any line in your code or select a large block of code
2. Select "GitPoint: Copy Permalink"
3. Share the link!

The extension automatically:
- Uses the current branch if it exists on remote
- Falls back to the default branch if needed
- Generates stable permalinks using commit hashes
- Works with Github, GitLab or BitBucket depending on where your remote is hosted

## Requirements

- VS Code 1.85.0 or higher
- Git installed and configured
- Repository with remote configured

## Installation

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P`
3. Type `ext install gitpoint`
4. Press Enter

## Extension Settings

Currently, GitPoint works out of the box with no configuration needed.

## Known Issues

None reported yet! If you find any issues, please report them on our [GitHub repository](https://github.com/awb1015/gitpoint/issues).

## Release Notes

### 1.1.0

- Added support for GitLab and Bitbucket

### 1.0.0

Initial release of GitPoint:
- Basic permalink generation
- Branch detection
- Clipboard integration

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests with any enhancements.

## Support This Extension

If you find this VSCode extension helpful and would like to support its continued development, consider buying me a coffee. Your support helps me maintain and improve the extension

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/awb1015)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-EA4AAA?style=for-the-badge&logo=github-sponsors&logoColor=white)](https://github.com/sponsors/awb1015)

Every contribution, no matter the size, helps keep this project active and maintained. Funds go directly towards

- Ongoing development
- Bug fixes
- Adding new features

## License

MIT