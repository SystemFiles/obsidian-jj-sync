import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, type JjSyncSettings } from './types';
import { JjSyncSettingTab } from './settings';

export default class JjSyncPlugin extends Plugin {
	settings!: JjSyncSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('refresh-cw', 'Sync with remote', () => {
			new Notice('jj sync: not yet implemented'); // eslint-disable-line obsidianmd/ui/sentence-case
		});

		this.addCommand({
			id: 'sync-with-remote',
			name: 'Sync with remote',
			callback: () => {
				new Notice('jj sync: not yet implemented'); // eslint-disable-line obsidianmd/ui/sentence-case
			},
		});

		this.addSettingTab(new JjSyncSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<JjSyncSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
