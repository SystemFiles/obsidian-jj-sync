import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, type JjSyncSettings } from './types';
import { JjSyncSettingTab } from './settings';
import { JjService, JjCommandError } from './jj-service';
import { SyncService } from './sync';
import { VaultInitService } from './vault-init';

export default class JjSyncPlugin extends Plugin {
	settings!: JjSyncSettings;
	private isSyncing = false;
	private jjService: JjService | null = null;
	private syncService: SyncService | null = null;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('refresh-cw', 'Sync with remote', () => {
			void this.triggerSync();
		});

		this.addCommand({
			id: 'sync-with-remote',
			name: 'Sync with remote',
			callback: () => {
				void this.triggerSync();
			},
		});

		this.addSettingTab(new JjSyncSettingTab(this.app, this));

		void this.checkVaultInit();
	}

	onunload() {}

	private async initServices(): Promise<boolean> {
		if (this.jjService && this.syncService) return true;

		try {
			const binary = await JjService.findBinary(
				this.settings.jjBinaryPath,
			);
			const adapter = this.app.vault.adapter as unknown as { getBasePath(): string };
			const vaultPath = adapter.getBasePath();
			this.jjService = new JjService(binary, vaultPath);
			this.syncService = new SyncService(
				this.jjService,
				this.settings.bookmarkName,
				{
					onSuccess: (msg) => new Notice(msg),
					onError: (msg) => new Notice(msg, 10000),
					onWarning: (msg) => new Notice(msg, 8000),
				},
			);
			return true;
		} catch (err) {
			const msg =
				err instanceof JjCommandError
					? err.message
					: 'Failed to initialize jj service.';
			new Notice(msg, 10000);
			return false;
		}
	}

	private async triggerSync(): Promise<void> {
		if (this.isSyncing) {
			new Notice('jj sync already in progress'); // eslint-disable-line obsidianmd/ui/sentence-case
			return;
		}

		this.isSyncing = true;
		try {
			const ready = await this.initServices();
			if (!ready || !this.syncService) return;
			await this.syncService.sync();
		} catch (err) {
			const msg =
				err instanceof JjCommandError
					? err.message
					: err instanceof Error
						? err.message
						: 'An unexpected error occurred during sync.';
			new Notice(msg, 10000);
		} finally {
			this.isSyncing = false;
		}
	}

	private async checkVaultInit(): Promise<void> {
		try {
			const ready = await this.initServices();
			if (!ready || !this.jjService) return;

			const adapter = this.app.vault.adapter as unknown as { getBasePath(): string };
			const vaultPath = adapter.getBasePath();
			const vaultInit = new VaultInitService(this.jjService, vaultPath);
			const isRepo = await vaultInit.isJjRepo();

			/* eslint-disable obsidianmd/ui/sentence-case -- "jj" is the tool's proper name */
			if (!isRepo) {
				if (this.settings.remoteURL.trim()) {
					new Notice(
						'jj Sync: vault is not a jj repository. Initializing...',
						5000,
					);
					await vaultInit.initRepo();
					await vaultInit.configureRemote(this.settings.remoteURL.trim());
					vaultInit.generateGitignore();
					new Notice('jj Sync: vault initialized successfully.', 5000);
				} else {
					new Notice(
						'jj Sync: vault is not a jj repository. Configure a remote URL in settings.',
						10000,
					);
				}
			/* eslint-enable obsidianmd/ui/sentence-case */
			} else {
				vaultInit.generateGitignore();
			}
		} catch {
			// Non-fatal — don't block plugin load
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<JjSyncSettings>,
		);
		this.jjService = null;
		this.syncService = null;
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.jjService = null;
		this.syncService = null;
	}
}
