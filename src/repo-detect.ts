import type { JjService } from './jj-service';

export function maskCredentials(url: string): string {
	return url.replace(/\/\/[^@/]+@/, '//***@');
}

export interface DetectedSettings {
	remoteURL?: string;
	bookmarkName?: string;
}

export async function detectRepoSettings(
	jj: JjService,
): Promise<DetectedSettings> {
	const result: DetectedSettings = {};

	try {
		const remotes = await jj.gitRemoteList();
		const origin = remotes.find((r) => r.name === 'origin');
		if (origin) {
			result.remoteURL = origin.url;
		} else if (remotes.length === 1) {
			result.remoteURL = remotes[0]!.url;
		}
	} catch {
		// Detection is best-effort
	}

	try {
		const bookmarks = await jj.bookmarkList();
		if (bookmarks.includes('main')) {
			result.bookmarkName = 'main';
		} else if (bookmarks.includes('master')) {
			result.bookmarkName = 'master';
		} else if (bookmarks.length === 1) {
			result.bookmarkName = bookmarks[0]!;
		}
	} catch {
		// Detection is best-effort
	}

	return result;
}
