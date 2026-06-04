import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, type JjSyncSettings } from './types';
import { JjSyncSettingTab } from './settings';
import { JjService, JjCommandError } from './jj-service';
import { SyncService } from './sync';
import { VaultInitService } from './vault-init';
import { NoticeService } from './notice';
import { detectRepoSettings, maskCredentials } from './repo-detect';

export default class JjSyncPlugin extends Plugin {
	settings!: JjSyncSettings;
	private isSyncing = false;
	private jjService: JjService | null = null;
	private syncService: SyncService | null = null;
	private noticeService!: NoticeService;

	async onload() {
		await this.loadSettings();
		this.noticeService = new NoticeService(
			() => this.settings,
			(msg, timeout) => new Notice(msg, timeout),
		);

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

		void this.onStartup();
	}

	onunload() {}

	private async onStartup(): Promise<void> {
		try {
			const ready = await this.initServices();
			if (!ready || !this.jjService || !this.syncService) return;

			const adapter = this.app.vault.adapter as unknown as {
				getBasePath(): string;
			};
			const vaultPath = adapter.getBasePath();
			const vaultInit = new VaultInitService(this.jjService, vaultPath);
			const isRepo = await vaultInit.isJjRepo();

			if (!isRepo) {
				await this.handleVaultInit(vaultInit);
				return;
			}

			vaultInit.generateGitignore();

			await this.autoDetectSettings();

			if (this.settings.checkStatusOnStartup) {
				await this.checkStartupStatus();
			}

			this.registerAutoSyncInterval();
		} catch {
			// Non-fatal — don't block plugin load
		}
	}

	private async handleVaultInit(
		vaultInit: VaultInitService,
	): Promise<void> {
		if (this.settings.remoteURL.trim()) {
			this.noticeService.show(
				'Vault is not a jj repository. Initializing...',
				'INFO',
				5000,
			);
			await vaultInit.initRepo();
			await vaultInit.configureRemote(this.settings.remoteURL.trim());
			vaultInit.generateGitignore();
			this.noticeService.show(
				'Vault initialized successfully.',
				'INFO',
				5000,
			);
		} else {
			this.noticeService.show(
				'Vault is not a jj repository. Configure a remote URL in settings.',
				'WARNING',
				10000,
			);
		}
	}

	private async autoDetectSettings(): Promise<void> {
		if (!this.jjService) return;

		try {
			const detected = await detectRepoSettings(this.jjService);
			let changed = false;
			const parts: string[] = [];

			if (detected.remoteURL && !this.settings.remoteURL.trim()) {
				this.settings.remoteURL = detected.remoteURL;
				parts.push(`Remote: ${maskCredentials(detected.remoteURL)}`);
				changed = true;
			}

			if (
				detected.bookmarkName &&
				detected.bookmarkName !== this.settings.bookmarkName
			) {
				this.settings.bookmarkName = detected.bookmarkName;
				parts.push(`Bookmark: ${detected.bookmarkName}`);
				changed = true;
			}

			if (changed) {
				await this.saveSettings();
				this.noticeService.show(
					`Detected ${parts.join(', ')}`,
					'INFO',
					5000,
				);
			}
		} catch {
			// Best-effort — don't block startup
		}
	}

	private async checkStartupStatus(): Promise<void> {
		if (!this.syncService) return;

		const { behind } = await this.syncService.getRemoteStatus();
		if (behind <= 0) return;

		if (this.settings.autoSyncOnStartup) {
			await this.triggerSync();
		} else {
			this.noticeService.show(
				`${behind} change(s) behind remote. Click sync to update.`,
				'WARNING',
			);
		}
	}

	private registerAutoSyncInterval(): void {
		const minutes = this.settings.syncIntervalMinutes;
		if (!Number.isInteger(minutes) || minutes < 1) return;

		this.registerInterval(
			window.setInterval(() => {
				void this.triggerSync();
			}, minutes * 60 * 1000),
		);
	}

	private async initServices(): Promise<boolean> {
		if (this.jjService && this.syncService) return true;

		try {
			const binary = await JjService.findBinary(
				this.settings.jjBinaryPath,
			);
			const adapter = this.app.vault.adapter as unknown as {
				getBasePath(): string;
			};
			const vaultPath = adapter.getBasePath();
			this.jjService = new JjService(binary, vaultPath);
			this.syncService = new SyncService(
				this.jjService,
				this.settings.bookmarkName,
				{
					onSuccess: () => this.noticeService.showSyncSuccess(),
					onError: (msg) =>
						this.noticeService.show(msg, 'ERROR', 10000),
					onWarning: (msg) =>
						this.noticeService.show(msg, 'WARNING', 8000),
				},
			);
			return true;
		} catch (err) {
			const msg =
				err instanceof JjCommandError
					? err.message
					: 'Failed to initialize jj service.';
			this.noticeService.show(msg, 'ERROR', 10000);
			return false;
		}
	}

	private async triggerSync(): Promise<void> {
		if (this.isSyncing) {
			this.noticeService.show(
				'Sync already in progress.',
				'WARNING',
			);
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
			this.noticeService.show(msg, 'ERROR', 10000);
		} finally {
			this.isSyncing = false;
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
