import test from 'ava';
import {mkdir, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
	buildScriptEntries,
	filterScripts,
	getScriptEntryKey,
	groupByPackage,
	type ScriptEntry,
} from './discover';

test('buildScriptEntries marks cwd package as current and sorts it first', async t => {
	const root = await mkFixture({
		'package.json': JSON.stringify({
			name: 'root',
			scripts: {build: 'turbo build'},
		}),
		'apps/web/package.json': JSON.stringify({
			name: '@app/web',
			scripts: {dev: 'vite'},
		}),
	});

	const dirs = [root, path.join(root, 'apps/web')];
	const entries = await buildScriptEntries(dirs, root);

	t.is(entries.length, 2);
	t.true(entries[0]!.isCurrent);
	t.is(entries[0]!.script, 'build');
	t.false(entries[1]!.isCurrent);
	t.is(entries[1]!.packageName, '@app/web');

	await rm(root, {recursive: true, force: true});
});

test('filterScripts matches package script and command', t => {
	const entries: ScriptEntry[] = [
		{
			packageName: '@app/web',
			packagePath: '/tmp/web',
			script: 'dev',
			command: 'vite --port 3000',
			isCurrent: false,
		},
		{
			packageName: 'root',
			packagePath: '/tmp',
			script: 'test',
			command: 'jest run',
			isCurrent: true,
		},
	];

	t.is(filterScripts(entries, '3000').length, 1);
	t.is(filterScripts(entries, 'root').length, 1);
	t.is(filterScripts(entries, 'dev').length, 1);
});

test('groupByPackage groups scripts under each package path', t => {
	const entries: ScriptEntry[] = [
		{
			packageName: 'root',
			packagePath: '/tmp',
			script: 'build',
			command: 'turbo build',
			isCurrent: true,
		},
		{
			packageName: 'root',
			packagePath: '/tmp',
			script: 'test',
			command: 'jest',
			isCurrent: true,
		},
		{
			packageName: '@app/web',
			packagePath: '/tmp/web',
			script: 'dev',
			command: 'vite',
			isCurrent: false,
		},
	];

	const groups = groupByPackage(entries);

	t.is(groups.length, 2);
	t.is(groups[0]!.scripts.length, 2);
	t.is(groups[1]!.packageName, '@app/web');
});

test('getScriptEntryKey is stable per package path and script name', t => {
	const entry: ScriptEntry = {
		packageName: 'root',
		packagePath: '/tmp/root',
		script: 'build',
		command: 'turbo build',
		isCurrent: true,
	};

	t.is(getScriptEntryKey(entry), '/tmp/root::build');
});

async function mkFixture(files: Record<string, string>): Promise<string> {
	const root = path.join(
		os.tmpdir(),
		`vkit-scripts-${Date.now()}-${Math.random().toString(36).slice(2)}`,
	);
	await mkdir(root, {recursive: true});

	for (const [relative, content] of Object.entries(files)) {
		const full = path.join(root, relative);
		await mkdir(path.dirname(full), {recursive: true});
		await writeFile(full, content);
	}

	return root;
}
