import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {execa} from 'execa';
import {findUp} from 'find-up';
import {globby} from 'globby';

export type PackageManager = 'pnpm' | 'npm' | 'yarn';

export type ScriptEntry = {
	packageName: string;
	packagePath: string;
	script: string;
	command: string;
	isCurrent: boolean;
};

type PackageJson = {
	name?: string;
	scripts?: Record<string, string>;
	packageManager?: string;
};

const GLOB_IGNORE = [
	'**/node_modules/**',
	'**/dist/**',
	'**/.git/**',
	'**/coverage/**',
];

async function readPackageJson(dir: string): Promise<PackageJson | null> {
	try {
		const raw = await readFile(path.join(dir, 'package.json'), 'utf8');
		return JSON.parse(raw) as PackageJson;
	} catch {
		return null;
	}
}

function parsePackageManagerField(value: string | undefined): PackageManager | null {
	if (!value) {
		return null;
	}

	const name = value.split('@')[0]?.trim();
	if (name === 'pnpm' || name === 'npm' || name === 'yarn') {
		return name;
	}

	return null;
}

/** Walk upward only to detect the package manager (not for listing scripts). */
export async function detectPackageManager(cwd: string): Promise<PackageManager> {
	const pkgPath = await findUp('package.json', {cwd});
	if (pkgPath) {
		let dir = path.dirname(pkgPath);
		while (true) {
			const pkg = await readPackageJson(dir);
			const fromField = parsePackageManagerField(pkg?.packageManager);
			if (fromField) {
				return fromField;
			}

			const parent = path.dirname(dir);
			if (parent === dir) {
				break;
			}

			dir = parent;
		}
	}

	if (await findUp('pnpm-lock.yaml', {cwd})) {
		return 'pnpm';
	}

	if (await findUp('yarn.lock', {cwd})) {
		return 'yarn';
	}

	if (await findUp('package-lock.json', {cwd})) {
		return 'npm';
	}

	return 'npm';
}

async function collectPackageDirs(cwd: string): Promise<string[]> {
	const absoluteCwd = path.resolve(cwd);
	const dirs = new Set<string>();

	if (await readPackageJson(absoluteCwd)) {
		dirs.add(absoluteCwd);
	}

	const nested = await globby('**/package.json', {
		cwd: absoluteCwd,
		ignore: GLOB_IGNORE,
		onlyFiles: true,
	});

	for (const relative of nested) {
		dirs.add(path.join(absoluteCwd, path.dirname(relative)));
	}

	return [...dirs].sort((a, b) => a.localeCompare(b));
}

export async function buildScriptEntries(
	packageDirs: string[],
	cwd: string,
): Promise<ScriptEntry[]> {
	const absoluteCwd = path.resolve(cwd);
	const entries: ScriptEntry[] = [];

	for (const packagePath of packageDirs) {
		const pkg = await readPackageJson(packagePath);
		if (!pkg?.scripts) {
			continue;
		}

		const packageName = pkg.name ?? path.basename(packagePath);
		const isCurrent = packagePath === absoluteCwd;

		for (const [script, command] of Object.entries(pkg.scripts)) {
			entries.push({
				packageName,
				packagePath,
				script,
				command,
				isCurrent,
			});
		}
	}

	entries.sort((a, b) => {
		if (a.isCurrent !== b.isCurrent) {
			return a.isCurrent ? -1 : 1;
		}

		const byPackage = a.packageName.localeCompare(b.packageName);
		if (byPackage !== 0) {
			return byPackage;
		}

		return a.script.localeCompare(b.script);
	});

	return entries;
}

export async function discoverScripts(cwd: string = process.cwd()): Promise<{
	cwd: string;
	packageManager: PackageManager;
	entries: ScriptEntry[];
}> {
	const absoluteCwd = path.resolve(cwd);
	const packageDirs = await collectPackageDirs(absoluteCwd);
	const entries = await buildScriptEntries(packageDirs, absoluteCwd);

	if (entries.length === 0) {
		throw new Error('当前目录及子目录下未找到可运行的 scripts。');
	}

	return {
		cwd: absoluteCwd,
		packageManager: await detectPackageManager(absoluteCwd),
		entries,
	};
}

export function filterScripts(
	entries: ScriptEntry[],
	query: string,
): ScriptEntry[] {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) {
		return entries;
	}

	return entries.filter(entry => {
		if (entry.packageName.toLowerCase().includes(trimmed)) {
			return true;
		}

		if (entry.script.toLowerCase().includes(trimmed)) {
			return true;
		}

		return entry.command.toLowerCase().includes(trimmed);
	});
}

export type PackageGroup = {
	packageName: string;
	packagePath: string;
	isCurrent: boolean;
	scripts: ScriptEntry[];
};

/** Preserve entry order; one group per package directory. */
export function groupByPackage(entries: ScriptEntry[]): PackageGroup[] {
	const groups: PackageGroup[] = [];
	const indexByPath = new Map<string, number>();

	for (const entry of entries) {
		const existing = indexByPath.get(entry.packagePath);
		if (existing !== undefined) {
			groups[existing]!.scripts.push(entry);
			continue;
		}

		indexByPath.set(entry.packagePath, groups.length);
		groups.push({
			packageName: entry.packageName,
			packagePath: entry.packagePath,
			isCurrent: entry.isCurrent,
			scripts: [entry],
		});
	}

	return groups;
}

export function countSelectedInPackage(
	group: PackageGroup,
	selected: Set<string>,
): number {
	return group.scripts.filter(script => selected.has(getScriptEntryKey(script)))
		.length;
}

export function getScriptEntryKey(entry: ScriptEntry): string {
	return `${entry.packagePath}::${entry.script}`;
}

export type ScriptRunOutcome = {
	entry: ScriptEntry;
	exitCode: number;
};

export async function runScript(
	entry: ScriptEntry,
	packageManager: PackageManager,
): Promise<number> {
	const result = await execa(packageManager, ['run', entry.script], {
		cwd: entry.packagePath,
		stdio: 'inherit',
		reject: false,
	});

	return result.exitCode ?? 1;
}

/** Run scripts sequentially; prints a separator between tasks when stdout is a TTY. */
export async function runScripts(
	entries: ScriptEntry[],
	packageManager: PackageManager,
): Promise<ScriptRunOutcome[]> {
	const outcomes: ScriptRunOutcome[] = [];

	for (const [index, entry] of entries.entries()) {
		if (index > 0 && process.stdout.isTTY) {
			process.stdout.write('\n');
		}

		if (process.stdout.isTTY) {
			const label = `${entry.packageName} · ${entry.script}`;
			process.stdout.write(`\n▶ ${label}\n\n`);
		}

		const exitCode = await runScript(entry, packageManager);
		outcomes.push({entry, exitCode});
	}

	return outcomes;
}
