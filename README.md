# obsidian-jj-sync

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
- [Lefthook](https://github.com/evilmartians/lefthook) for pre-commit hooks (optional but recommended)

### Setup

```bash
npm install
lefthook install   # set up pre-commit hooks
```

### Build and develop

```bash
npm run dev        # watch mode — rebuilds on file changes
npm run build      # production build (type-checks then bundles)
npm run lint       # run ESLint
npm test           # run vitest unit tests
```

### Test vault

A gitignored `test-vault/` directory is used for manual integration testing. To set it up:

```bash
# Create symlinks so Obsidian loads the plugin from your build output
mkdir -p test-vault/.obsidian/plugins/obsidian-jj-sync
ln -sf "$(pwd)/main.js" test-vault/.obsidian/plugins/obsidian-jj-sync/main.js
ln -sf "$(pwd)/manifest.json" test-vault/.obsidian/plugins/obsidian-jj-sync/manifest.json
ln -sf "$(pwd)/styles.css" test-vault/.obsidian/plugins/obsidian-jj-sync/styles.css

# Initialize the test vault as a jj repo with a local bare remote
cd test-vault
jj git init
cd ..
git init --bare test-vault-remote.git
cd test-vault
jj git remote add origin ../test-vault-remote.git
cd ..
```

Then open `test-vault/` as a vault in Obsidian and enable the plugin.

## License

[MIT](LICENSE)
