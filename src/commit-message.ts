function pad(n: number): string {
	return String(n).padStart(2, '0');
}

function sanitizeHostname(hostname: string): string {
	return hostname.replace(/[^\w.-]/g, '_');
}

export function formatSyncMessage(hostname: string, timestamp: Date): string {
	const host = sanitizeHostname(hostname);
	const y = timestamp.getFullYear();
	const mo = pad(timestamp.getMonth() + 1);
	const d = pad(timestamp.getDate());
	const h = pad(timestamp.getHours());
	const mi = pad(timestamp.getMinutes());
	const s = pad(timestamp.getSeconds());
	return `chore(vault): sync from ${host} at ${y}-${mo}-${d} ${h}:${mi}:${s}`;
}
