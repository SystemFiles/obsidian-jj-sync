# jj-sync

Sync your Obsidian vault using [jj (Jujutsu)](https://martinvonz.github.io/jj/) VCS with conventional commits.

## Features

- One-click vault sync via ribbon icon or command palette
- Conventional commit messages for every sync operation
- Guided jj repository initialization for new vaults
- Auto-sync on startup and on a configurable interval
- Configurable notice levels to control UI noise
- Desktop only (wraps jj CLI)

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [jj (Jujutsu)](https://martinvonz.github.io/jj/) installed and in your PATH
- [Obsidian](https://obsidian.md/) for manual testing
- [Bun](https://bun.sh/) as the package manager
- [Lefthook](https://github.com/evilmartians/lefthook) for pre-commit hooks (optional but recommended)

### Setup

```bash
task install       # install dependencies via bun
lefthook install   # set up pre-commit hooks
```

### Build and develop

```bash
task dev           # watch mode — rebuilds on file changes
task build         # production build (type-checks then bundles)
task lint          # run ESLint
task test          # run vitest unit tests
task typecheck     # run TypeScript type checker only
task check         # run all quality gates (lint, typecheck, test, build)
```

Run `task` with no arguments to see all available tasks.

### Test vault

A gitignored `test-vault/` directory is used for manual integration testing:

```bash
task test-vault:setup
```

This creates the directory, symlinks build output into the plugin folder, initializes a jj repo, and creates a local bare git remote. Then open `test-vault/` as a vault in Obsidian and enable the plugin.

## License

[MIT](LICENSE)
