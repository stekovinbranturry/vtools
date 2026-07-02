import React, {useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import {Divider} from '../../../components/ui/divider';
import {KeyHint} from '../../../components/ui/key-hint';
import {Tabs, type Tab} from '../../../components/ui/tabs';
import {useMultiSelectList} from '../../hooks/useMultiSelectList';
import {withInheritedStdio, type ScriptRunResult} from '../../lib/ui-session';
import {
	countSelectedInPackage,
	discoverScripts,
	filterScripts,
	getScriptEntryKey,
	groupByPackage,
	runScripts,
	type PackageGroup,
	type PackageManager,
	type ScriptEntry,
} from './discover';

const DIVIDER_WIDTH = 44;
const CHROME_ROWS = 18;
const MIN_VISIBLE = 4;
const MAX_VISIBLE = 10;
const TAB_LABEL_MAX = 14;

type Phase = 'loading' | 'list' | 'done' | 'error';
type Focus = 'list' | 'filter';

type Props = {
	onBack: () => void;
	initialResults?: ScriptRunResult[];
};

function Header({cwd, packageManager}: {cwd: string; packageManager: PackageManager}) {
	return (
		<>
			<Text bold>运行 Scripts</Text>
			<Text dimColor>
				{cwd} · {packageManager}
			</Text>
			<Divider width={DIVIDER_WIDTH} />
		</>
	);
}

function getVisibleCount(total: number): number {
	const rows = process.stdout.rows ?? 24;
	const fit = rows - CHROME_ROWS;
	return Math.max(MIN_VISIBLE, Math.min(total, MAX_VISIBLE, fit));
}

function truncate(text: string, max: number): string {
	if (text.length <= max) {
		return text;
	}

	return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function tabLabel(group: PackageGroup, index: number): string {
	const prefix = `${index + 1} `;
	const name = group.isCurrent ? `${group.packageName} *` : group.packageName;
	return prefix + truncate(name, TAB_LABEL_MAX - prefix.length);
}

type ScriptPanelProps = {
	group: PackageGroup;
	selected: Set<string>;
	setSelected: Dispatch<SetStateAction<Set<string>>>;
	isActive: boolean;
	visibleCount: number;
	allEntries: ScriptEntry[];
	packageManager: PackageManager;
};

function ScriptPanel({
	group,
	selected,
	setSelected,
	isActive,
	visibleCount,
	allEntries,
	packageManager,
}: ScriptPanelProps) {
	const list = useMultiSelectList({
		items: group.scripts,
		getKey: getScriptEntryKey,
		setSelected,
		isActive,
		visibleCount,
		onSubmit: () => {
			const chosen = allEntries.filter(entry =>
				selected.has(getScriptEntryKey(entry)),
			);
			const fallback = group.scripts[list.cursorIndex];
			const toRun = chosen.length > 0 ? chosen : fallback ? [fallback] : [];

			if (toRun.length === 0) {
				return;
			}

			void withInheritedStdio(
				() => runScripts(toRun, packageManager),
				outcomes => ({
					activeTool: 'script-runner',
					scriptRunnerResults: outcomes.map(outcome => ({
						label: `${outcome.entry.packageName} · ${outcome.entry.script}`,
						exitCode: outcome.exitCode,
					})),
				}),
			);
		},
		onCancel: () => {},
	});

	const focused = group.scripts[list.cursorIndex];

	return (
		<Box flexDirection="column">
			{group.scripts.length === 0 ? (
				<Text dimColor>无 scripts</Text>
			) : (
				<>
					{list.windowed.map((entry, index) => {
						const realIndex = list.scrollOffset + index;
						const isCursor = list.isCursor(realIndex);
						const isSelected = selected.has(getScriptEntryKey(entry));

						return (
							<Text
								key={getScriptEntryKey(entry)}
								color={isCursor && isActive ? 'cyan' : undefined}
							>
								{isCursor && isActive ? '❯' : ' '}{' '}
								{isSelected ? '◉' : '◯'} {entry.script}
							</Text>
						);
					})}
					{(list.hasMoreAbove || list.hasMoreBelow) && isActive ? (
						<Box marginTop={1}>
							<Text dimColor>
								{list.hasMoreAbove ? '↑' : ' '}
								{list.hasMoreBelow ? '↓ 更多' : ''}
							</Text>
						</Box>
					) : null}
					{focused && isActive ? (
						<Box marginTop={1}>
							<Text dimColor>
								{focused.script} → {focused.command}
							</Text>
						</Box>
					) : null}
				</>
			)}
		</Box>
	);
}

export default function ScriptRunnerApp({onBack, initialResults}: Props) {
	const [phase, setPhase] = useState<Phase>('loading');
	const [cwd, setCwd] = useState(process.cwd());
	const [packageManager, setPackageManager] = useState<PackageManager>('pnpm');
	const [entries, setEntries] = useState<ScriptEntry[]>([]);
	const [filter, setFilter] = useState('');
	const [focus, setFocus] = useState<Focus>('list');
	const [activeTabKey, setActiveTabKey] = useState('');
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	const [errorMessage, setErrorMessage] = useState('');
	const [runResults, setRunResults] = useState<ScriptRunResult[]>(
		initialResults ?? [],
	);

	const filtered = useMemo(
		() => filterScripts(entries, filter),
		[entries, filter],
	);

	const packages = useMemo(
		() => groupByPackage(filtered),
		[filtered],
	);

	const activePackage = packages.find(group => group.packagePath === activeTabKey);

	const visibleCount = useMemo(() => {
		const scriptCount = activePackage?.scripts.length ?? 0;
		return getVisibleCount(scriptCount);
	}, [activePackage?.scripts.length]);

	const tabs = useMemo(
		(): Tab[] =>
			packages.map((group, index) => ({
				key: group.packagePath,
				label: tabLabel(group, index),
				badge: countSelectedInPackage(group, selected) || undefined,
			})),
		[packages, selected],
	);

	const loadScripts = useCallback(async () => {
		setPhase('loading');

		try {
			const found = await discoverScripts();
			setCwd(found.cwd);
			setPackageManager(found.packageManager);
			setEntries(found.entries);
			setPhase('list');
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : String(error),
			);
			setPhase('error');
		}
	}, []);

	useEffect(() => {
		if (packages.length === 0) {
			setActiveTabKey('');
			return;
		}

		if (!packages.some(group => group.packagePath === activeTabKey)) {
			setActiveTabKey(packages[0]!.packagePath);
		}
	}, [activeTabKey, packages]);

	useEffect(() => {
		void loadScripts().then(() => {
			if (initialResults && initialResults.length > 0) {
				setRunResults(initialResults);
				setPhase('done');
			}
		});
	}, [initialResults, loadScripts]);

	function exitFilter() {
		setFocus('list');
	}

	useInput(
		(input, key) => {
			if (phase === 'loading') {
				if (key.escape || input === 'q') {
					onBack();
				}

				return;
			}

			if (phase === 'error') {
				if (key.return || key.escape || input === 'q') {
					onBack();
				}

				return;
			}

			if (phase === 'done') {
				if (key.return || key.escape || input === 'q') {
					setPhase('list');
					setRunResults([]);
				}

				return;
			}

			if (focus !== 'list') {
				return;
			}

			if (input === '/' || input === 'f') {
				setFocus('filter');
				return;
			}

			if (input === 'r') {
				void loadScripts();
				return;
			}

			if (input === 'q') {
				onBack();
				return;
			}

			if (key.escape) {
				onBack();
			}
		},
		{isActive: phase !== 'list' || focus === 'list'},
	);

	useInput(
		(input, key) => {
			if (key.escape || key.tab) {
				exitFilter();
				return;
			}

			if (key.return) {
				exitFilter();
				return;
			}

			if (input === 'q' && !filter) {
				onBack();
			}
		},
		{isActive: phase === 'list' && focus === 'filter'},
	);

	const listKeyHints =
		focus === 'filter'
			? [
					{key: '↵', label: '回到列表'},
					{key: 'Esc', label: '回到列表'},
					{key: 'Tab', label: '回到列表'},
				]
			: [
					{key: '←→', label: '切换包'},
					{key: '1-9', label: '跳 tab'},
					{key: '↑↓', label: '移动'},
					{key: '空格', label: '选择'},
					{key: 'a', label: '全选当前包'},
					{key: '/ f', label: '过滤'},
					{key: '↵', label: '运行'},
					{key: 'Esc', label: '返回'},
				];

	if (phase === 'loading') {
		return (
			<Box flexDirection="column">
				<Header cwd={cwd} packageManager={packageManager} />
				<Box marginTop={1}>
					<Text color="yellow">
						<Spinner type="dots" /> 正在扫描 scripts…
					</Text>
				</Box>
			</Box>
		);
	}

	if (phase === 'error') {
		return (
			<Box flexDirection="column">
				<Header cwd={cwd} packageManager={packageManager} />
				<Box marginTop={1}>
					<Text color="yellow">{errorMessage}</Text>
				</Box>
				<Box marginTop={1}>
					<Divider width={DIVIDER_WIDTH} />
				</Box>
				<Box>
					<KeyHint keys={[{key: '↵ / q', label: '返回'}]} />
				</Box>
			</Box>
		);
	}

	if (phase === 'done' && runResults.length > 0) {
		const allOk = runResults.every(result => result.exitCode === 0);

		return (
			<Box flexDirection="column">
				<Header cwd={cwd} packageManager={packageManager} />
				<Box marginTop={1} flexDirection="column">
					{runResults.map(result => {
						const ok = result.exitCode === 0;
						return (
							<Text key={result.label} color={ok ? 'green' : 'yellow'}>
								{ok ? '✓' : '✗'} {result.label} 退出码 {result.exitCode}
							</Text>
						);
					})}
					{runResults.length > 1 ? (
						<Box marginTop={1}>
							<Text color={allOk ? 'green' : 'yellow'}>
								{allOk
									? `全部 ${runResults.length} 个任务完成`
									: `${runResults.filter(r => r.exitCode === 0).length}/${runResults.length} 个成功`}
							</Text>
						</Box>
					) : null}
				</Box>
				<Box marginTop={1}>
					<Divider width={DIVIDER_WIDTH} />
				</Box>
				<Box>
					<KeyHint keys={[{key: '↵ / Esc', label: '回到列表'}]} />
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Header cwd={cwd} packageManager={packageManager} />

			<Box marginTop={1} flexDirection="column">
				<Box>
					<Text>
						<Text color="cyan" bold>
							{packages.length}
						</Text>{' '}
						个包 ·{' '}
						<Text color="cyan" bold>
							{filtered.length}
						</Text>{' '}
						个 scripts · 已选{' '}
						<Text color="cyan" bold>
							{selected.size}
						</Text>
					</Text>
				</Box>

				<Box marginTop={1} flexDirection="column">
					<Text color={focus === 'filter' ? 'cyan' : 'gray'}>
						{focus === 'filter' ? '▸ 过滤中' : '过滤（包名 / script / 命令）'}
					</Text>
					<Text color={focus === 'filter' ? 'cyan' : undefined}>
						{focus === 'filter' ? '> ' : '  '}
						{focus === 'filter' ? (
							<TextInput
								value={filter}
								onChange={setFilter}
								onSubmit={exitFilter}
								placeholder="dev / test"
							/>
						) : (
							<Text dimColor={!filter}>{filter || '—'}</Text>
						)}
					</Text>
				</Box>

				{packages.length === 0 ? (
					<Box marginTop={1}>
						<Text dimColor>没有匹配的 scripts</Text>
					</Box>
				) : (
					<Box marginTop={1} flexDirection="column">
						<Tabs
							tabs={tabs}
							activeKey={activeTabKey}
							onChange={setActiveTabKey}
							focus={focus === 'list'}
							variant="underline"
						>
							{packages.map(group => (
								<ScriptPanel
									key={group.packagePath}
									group={group}
									selected={selected}
									setSelected={setSelected}
									isActive={
										phase === 'list' &&
										focus === 'list' &&
										group.packagePath === activeTabKey
									}
									visibleCount={visibleCount}
									allEntries={filtered}
									packageManager={packageManager}
								/>
							))}
						</Tabs>
						{selected.size === 0 && activePackage?.scripts[0] ? (
							<Box marginTop={1}>
								<Text dimColor>↵ 运行当前项，或空格多选后批量运行</Text>
							</Box>
						) : null}
					</Box>
				)}
			</Box>

			<Box marginTop={1}>
				<Divider width={DIVIDER_WIDTH} />
			</Box>
			<Box>
				<KeyHint keys={listKeyHints} />
			</Box>
		</Box>
	);
}
