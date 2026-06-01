/* eslint-disable @typescript-eslint/no-extraneous-class */
export class Notice {
	constructor(_message: string, _timeout?: number) {}
}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {
	setName() { return this; }
	setDesc() { return this; }
	setHeading() { return this; }
	addText() { return this; }
	addToggle() { return this; }
	addDropdown() { return this; }
}
