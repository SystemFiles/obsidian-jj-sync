import { App, PluginSettingTab, Setting } from 'obsidian';
import type JjSyncPlugin from './main';
import type { NoticeLevel } from './types';

export class JjSyncSettingTab extends PluginSettingTab {
	plugin: JjSyncPlugin;

	constructor(app: App, plugin: JjSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ── Repository ──────────────────────────────────────

		new Setting(containerEl)
			.setName('Remote URL')
			.setDesc(
				'HTTPS or SSH URL of the remote Git repository for your vault.',
			)
			.addText((text) =>
				text
					.setPlaceholder('https://github.com/user/vault.git')
					.setValue(this.plugin.settings.remoteURL)
					.onChange(async (value) => {
						this.plugin.settings.remoteURL = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Bookmark')
			// eslint-disable-next-line obsidianmd/ui/sentence-case -- "jj" is the tool's name
			.setDesc('jj bookmark to push to on the remote.')
			.addText((text) =>
				text
					.setPlaceholder('main') // eslint-disable-line obsidianmd/ui/sentence-case
					.setValue(this.plugin.settings.bookmarkName)
					.onChange(async (value) => {
						this.plugin.settings.bookmarkName = value;
						await this.plugin.saveSettings();
					}),
			);

		/* eslint-disable obsidianmd/ui/sentence-case -- "jj" is the tool's name */

		// ── jj binary ───────────────────────────────────────

		new Setting(containerEl).setName('jj binary').setHeading();

		new Setting(containerEl)
			.setName('jj binary path')
			.setDesc(
				'Path to the jj executable. Leave as "jj" if it is on your PATH. ' +
					'Common locations: /opt/homebrew/bin/jj, /usr/local/bin/jj.',
			)
			.addText((text) =>
				text
					.setPlaceholder('jj')
					.setValue(this.plugin.settings.jjBinaryPath)
					.onChange(async (value) => {
						this.plugin.settings.jjBinaryPath = value;
						await this.plugin.saveSettings();
					}),
			);

		/* eslint-enable obsidianmd/ui/sentence-case */

		// ── Sync behavior ───────────────────────────────────

		new Setting(containerEl).setName('Sync behavior').setHeading();

		new Setting(containerEl)
			.setName('Check status on startup')
			.setDesc(
				'Check whether the vault is behind the remote when Obsidian starts.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.checkStatusOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.checkStatusOnStartup = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Auto-sync on startup')
			.setDesc(
				'Automatically sync with the remote on startup if the vault is behind.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoSyncOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.autoSyncOnStartup = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Auto-sync interval (minutes)')
			.setDesc(
				'Sync automatically at this interval. Set to 0 to disable. Restart Obsidian to apply changes.',
			)
			.addText((text) =>
				text
					.setPlaceholder('0')
					.setValue(String(this.plugin.settings.syncIntervalMinutes))
					.onChange(async (value) => {
						const parsed = parseInt(value, 10);
						this.plugin.settings.syncIntervalMinutes = isNaN(parsed)
							? 0
							: Math.max(0, parsed);
						await this.plugin.saveSettings();
					}),
			);

		// ── Notices ─────────────────────────────────────────

		new Setting(containerEl).setName('Notices').setHeading();

		new Setting(containerEl)
			.setName('Notice level')
			.setDesc('Control which jj sync notices appear in the Obsidian UI.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('ALL', 'All')
					.addOption('WARNING', 'Warning and error')
					.addOption('ERROR', 'Error only')
					.setValue(this.plugin.settings.noticeLevel)
					.onChange(async (value) => {
						this.plugin.settings.noticeLevel = value as NoticeLevel;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Hide success message')
			.setDesc(
				'Suppress the confirmation notice shown after a successful sync.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(!this.plugin.settings.showSyncSuccessNotice)
					.onChange(async (value) => {
						this.plugin.settings.showSyncSuccessNotice = !value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
