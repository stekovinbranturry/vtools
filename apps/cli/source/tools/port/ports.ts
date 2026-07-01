import {execa} from 'execa';
import fkill from 'fkill';

export type PortEntry = {
	port: number;
	pid: number;
	command: string;
	fullCommand: string;
	protocol: 'tcp';
};

type PartialPortEntry = Omit<PortEntry, 'fullCommand'>;

function extractPort(networkName: string): number | undefined {
	const colonIndex = networkName.lastIndexOf(':');
	if (colonIndex === -1) {
		return undefined;
	}

	const port = Number.parseInt(networkName.slice(colonIndex + 1), 10);
	return Number.isFinite(port) ? port : undefined;
}

/** Parse `lsof -F pcn` stdout into port entries (without full command). */
export function parseLsofOutput(stdout: string): PartialPortEntry[] {
	const entries: PartialPortEntry[] = [];
	let pid: number | undefined;
	let command: string | undefined;

	for (const line of stdout.split('\n')) {
		if (!line) {
			continue;
		}

		const tag = line[0];
		const value = line.slice(1);

		if (tag === 'p') {
			pid = Number.parseInt(value, 10);
			continue;
		}

		if (tag === 'c') {
			command = value;
			continue;
		}

		if (tag !== 'n' || pid === undefined || !command) {
			continue;
		}

		const port = extractPort(value);
		if (port === undefined) {
			continue;
		}

		entries.push({port, pid, command, protocol: 'tcp'});
	}

	return entries
		.filter(entry => entry.command.toLowerCase() === 'node')
		.sort((a, b) => a.port - b.port || a.pid - b.pid);
}

async function loadFullCommands(
	entries: PartialPortEntry[],
): Promise<Map<number, string>> {
	const pids = [...new Set(entries.map(entry => entry.pid))];
	if (pids.length === 0) {
		return new Map();
	}

	const result = await execa(
		'ps',
		['-p', pids.join(','), '-o', 'pid=', '-o', 'command='],
		{reject: false},
	);

	if (result.failed) {
		return new Map(
			entries.map(entry => [entry.pid, entry.command]),
		);
	}

	const commands = new Map<number, string>();
	for (const line of result.stdout.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) {
			continue;
		}

		const match = trimmed.match(/^(\d+)\s+(.*)$/);
		if (!match) {
			continue;
		}

		commands.set(Number.parseInt(match[1]!, 10), match[2]!);
	}

	return commands;
}

export async function listListeningPorts(): Promise<PortEntry[]> {
	let result;

	try {
		result = await execa(
			'lsof',
			['-nP', '-iTCP', '-sTCP:LISTEN', '-F', 'pcn', '-c', 'node'],
			{reject: false},
		);
	} catch (error) {
		if (
			error instanceof Error &&
			'code' in error &&
			error.code === 'ENOENT'
		) {
			throw new Error('未找到 lsof 命令。此工具仅支持 macOS。');
		}

		throw error;
	}

	if (result.failed && result.exitCode !== 1) {
		const detail = result.stderr.trim() || result.stdout.trim();
		if (/permission denied/i.test(detail)) {
			throw new Error('没有权限读取端口信息。请尝试用更高权限运行。');
		}

		throw new Error(detail || `lsof 执行失败（退出码 ${result.exitCode}）`);
	}

	const partial = parseLsofOutput(result.stdout);
	if (partial.length === 0) {
		return [];
	}

	const fullCommands = await loadFullCommands(partial);

	return partial.map(entry => ({
		...entry,
		fullCommand: fullCommands.get(entry.pid) ?? entry.command,
	}));
}

export async function killPort(pid: number): Promise<void> {
	try {
		await fkill(pid, {force: false, forceAfterTimeout: 3000});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : String(error);

		if (/not found|doesn't exist|no such process/i.test(message)) {
			throw new Error(`进程 ${pid} 已不存在。`);
		}

		if (/permission|EPERM|EACCES/i.test(message)) {
			throw new Error(`没有权限关闭进程 ${pid}。`);
		}

		throw new Error(message || `无法关闭进程 ${pid}。`);
	}
}

export function filterPorts(
	entries: PortEntry[],
	query: string,
): PortEntry[] {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) {
		return entries;
	}

	return entries.filter(entry => {
		if (String(entry.port).includes(trimmed)) {
			return true;
		}

		if (entry.command.toLowerCase().includes(trimmed)) {
			return true;
		}

		return entry.fullCommand.toLowerCase().includes(trimmed);
	});
}

export function truncateText(text: string, maxLength: number): string {
	if (maxLength <= 0) {
		return '';
	}

	if (text.length <= maxLength) {
		return text;
	}

	if (maxLength === 1) {
		return '…';
	}

	return `${text.slice(0, maxLength - 1)}…`;
}

export function formatPortRow(
	entry: PortEntry,
	width: number,
): {main: string; detail: string} {
	const port = String(entry.port).padStart(5, ' ');
	const pid = String(entry.pid).padStart(6, ' ');
	const prefix = `${port}  ${pid}  `;
	const commandWidth = Math.max(0, width - prefix.length);
	const main = `${prefix}${truncateText(entry.fullCommand, commandWidth)}`;
	return {main, detail: entry.fullCommand};
}
