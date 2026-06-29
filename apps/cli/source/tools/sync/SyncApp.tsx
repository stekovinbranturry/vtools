import React, {useEffect, useMemo, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import Spinner from 'ink-spinner';
import {findEditorClis, getEditorLabel} from '../vsix/install';
import {Divider} from '../../../components/ui/divider';
import {Badge} from '../../../components/ui/badge';
import {ProgressBar} from '../../../components/ui/progress-bar';
import {KeyHint} from '../../../components/ui/key-hint';
import {useMultiSelectList} from '../../hooks/useMultiSelectList';
import {
	cleanupTempDir,
	computeSyncCandidatesAsync,
	createTempDir,
	syncExtension,
	type SyncCandidate,
	type SyncItemResult,
} from './sync';

const SOURCE = 'code' as const;
const TARGET = 'cursor' as const;
const PANEL_WIDTH = 44;

function Header() {
	return (
		<>
			<Text bold>同步扩展到 Cursor</Text>
			<Divider width={PANEL_WIDTH} />
		</>
	);
}

// Reserve rows for header/separator/summary/hint so the list never pushes the
// rest of the UI off a short terminal (which leaves confusing stale frames).
const CHROME_ROWS = 9;
const MIN_VISIBLE = 4;
const MAX_VISIBLE = 14;
const INSTALLED_PREVIEW = 6;

function getVisibleCount(total: number): number {
	const rows = process.stdout.rows ?? 24;
	const fit = rows - CHROME_ROWS;
	return Math.max(MIN_VISIBLE, Math.min(total, MAX_VISIBLE, fit));
}

type Phase = 'loading' | 'select' | 'confirm' | 'syncing' | 'done' | 'error';

type Props = {
	onBack: () => void;
};

export default function SyncApp({onBack}: Props) {
	const [phase, setPhase] = useState<Phase>('loading');
	const [candidates, setCandidates] = useState<SyncCandidate[]>([]);
	const [errorMessage, setErrorMessage] = useState('');
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	const [progress, setProgress] = useState({current: 0, total: 0});
	const [status, setStatus] = useState('');
	const [results, setResults] = useState<SyncItemResult[]>([]);

	// Already-installed extensions are shown separately and are NOT selectable.
	// Only the missing ones are interactive.
	const installable = useMemo(
		() => candidates.filter(c => !c.installedInTarget),
		[candidates],
	);
	const installed = useMemo(
		() => candidates.filter(c => c.installedInTarget),
		[candidates],
	);

	const visibleCount = useMemo(
		() => getVisibleCount(installable.length),
		[installable.length],
	);

	// Detection spawns `code`/`cursor --list-extensions`, which is slow. Run it
	// asynchronously so entering the tool stays responsive and shows a spinner.
	useEffect(() => {
		let cancelled = false;

		void (async () => {
			const editors = findEditorClis();

			if (!editors.includes(SOURCE)) {
				setErrorMessage(
					'未找到 code 命令。请在 VS Code 中执行「Shell Command: Install \'code\' command in PATH」。',
				);
				setPhase('error');
				return;
			}

			if (!editors.includes(TARGET)) {
				setErrorMessage(
					'未找到 cursor 命令。请在 Cursor 中执行「Shell Command: Install \'cursor\' command in PATH」。',
				);
				setPhase('error');
				return;
			}

			try {
				const found = await computeSyncCandidatesAsync(SOURCE, TARGET);
				if (cancelled) {
					return;
				}

				if (found.length === 0) {
					setErrorMessage('VS Code 没有检测到已安装的扩展。');
					setPhase('error');
					return;
				}

				const missing = found.filter(c => !c.installedInTarget);
				if (missing.length === 0) {
					setErrorMessage(
						`${getEditorLabel(TARGET)} 已拥有 ${getEditorLabel(SOURCE)} 的全部扩展，无需同步。`,
					);
					setPhase('error');
					return;
				}

				setCandidates(found);
				setSelected(new Set(missing.map(c => c.id)));
				setPhase('select');
			} catch (error) {
				if (cancelled) {
					return;
				}

				setErrorMessage(
					error instanceof Error ? error.message : String(error),
				);
				setPhase('error');
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	const chosen = installable.filter(c => selected.has(c.id));

	async function runSync() {
		setPhase('syncing');
		setProgress({current: 0, total: chosen.length});

		const tmpDir = await createTempDir();
		const collected: SyncItemResult[] = [];

		try {
			for (let i = 0; i < chosen.length; i++) {
				const candidate = chosen[i]!;
				setProgress({current: i + 1, total: chosen.length});
				setStatus(`正在下载 ${candidate.id} …`);

				// eslint-disable-next-line no-await-in-loop
				const result = await syncExtension(
					candidate.id,
					TARGET,
					tmpDir,
					message => setStatus(message),
				);
				collected.push(result);
			}
		} finally {
			await cleanupTempDir(tmpDir);
		}

		setResults(collected);
		setPhase('done');
	}

	const list = useMultiSelectList({
		items: installable,
		getKey: c => c.id,
		setSelected,
		isActive: phase === 'select',
		visibleCount,
		onSubmit: () => {
			if (selected.size === 0) {
				onBack();
				return;
			}

			setPhase('confirm');
		},
		onCancel: onBack,
	});

	useInput(
		(input, key) => {
			if (phase === 'loading') {
				if (key.escape || input === 'q') {
					onBack();
				}

				return;
			}

			if (phase === 'done' || phase === 'error') {
				if (key.return || input === 'q' || key.escape) {
					onBack();
				}

				return;
			}

			if (phase === 'confirm') {
				if (key.return) {
					void runSync();
					return;
				}

				if (key.escape || input === 'q') {
					setPhase('select');
				}
			}
		},
		{isActive: phase !== 'select'},
	);

	if (phase === 'loading') {
		return (
			<Box flexDirection="column">
				<Header />
				<Box marginTop={1}>
					<Text color="yellow">
						<Spinner type="dots" /> 正在读取 {getEditorLabel(SOURCE)} 与{' '}
						{getEditorLabel(TARGET)} 的扩展列表…
					</Text>
				</Box>
			</Box>
		);
	}

	if (phase === 'error') {
		return (
			<Box flexDirection="column">
				<Header />
				<Box marginTop={1}>
					<Text color="yellow">{errorMessage}</Text>
				</Box>
				<Box marginTop={1}>
					<KeyHint keys={[{key: '↵ / q', label: '返回'}]} />
				</Box>
			</Box>
		);
	}

	if (phase === 'confirm') {
		const preview = chosen.slice(0, 10);
		return (
			<Box flexDirection="column">
				<Header />
				<Box marginTop={1}>
					<Text>即将安装 </Text>
					<Badge variant="success">{`${chosen.length} 个插件`}</Badge>
					<Text> 到 {getEditorLabel(TARGET)}：</Text>
				</Box>
				<Box marginTop={1} flexDirection="column">
					{preview.map(candidate => (
						<Text key={candidate.id} color="green">
							{'  • '}
							{candidate.id}
						</Text>
					))}
					{chosen.length > preview.length ? (
						<Text dimColor>{`  … 还有 ${chosen.length - preview.length} 个`}</Text>
					) : null}
				</Box>
				<Box marginTop={1}>
					<KeyHint keys={[
							{key: '↵', label: '确认开始'},
							{key: 'Esc', label: '返回修改'},
						]}
					/>
				</Box>
			</Box>
		);
	}

	if (phase === 'syncing') {
		const pct = progress.total
			? (progress.current / progress.total) * 100
			: 0;
		return (
			<Box flexDirection="column">
				<Header />
				<Box marginTop={1}>
					<Text color="yellow">
						<Spinner type="dots" /> 同步中（{progress.current}/{progress.total}）
					</Text>
				</Box>
				<Box marginTop={1}>
					<ProgressBar value={pct} width={PANEL_WIDTH} />
				</Box>
				<Box marginTop={1}>
					<Text dimColor>{status}</Text>
				</Box>
			</Box>
		);
	}

	if (phase === 'done') {
		const succeeded = results.filter(r => r.success);
		const failed = results.filter(r => !r.success);

		return (
			<Box flexDirection="column">
				<Header />
				<Box marginTop={1}>
					<Badge variant="success">{`成功 ${succeeded.length}`}</Badge>
					{failed.length > 0 ? (
						<Box marginLeft={1}>
							<Badge variant="error">{`失败 ${failed.length}`}</Badge>
						</Box>
					) : null}
				</Box>
				{failed.length > 0 ? (
					<Box marginTop={1} flexDirection="column">
						<Text color="red">失败明细：</Text>
						{failed.map(item => (
							<Text key={item.id} color="red">
								{'  '}
								{item.id}：{item.message}
							</Text>
						))}
					</Box>
				) : null}
				<Box marginTop={1}>
					<KeyHint keys={[{key: '↵ / q', label: '返回'}]} />
				</Box>
			</Box>
		);
	}

	const {windowed, scrollOffset, hasMoreAbove, hasMoreBelow} = list;
	const installedPreview = installed.slice(0, INSTALLED_PREVIEW);

	return (
		<Box flexDirection="column">
			<Header />
			<Box>
				<Badge variant="success">{`可同步 ${installable.length}`}</Badge>
				{hasMoreAbove ? (
					<Box marginLeft={1}>
						<Text dimColor>↑更多</Text>
					</Box>
				) : null}
				{hasMoreBelow ? (
					<Box marginLeft={1}>
						<Text dimColor>↓更多</Text>
					</Box>
				) : null}
			</Box>
			<Box flexDirection="column">
				{windowed.map((candidate, index) => {
					const realIndex = scrollOffset + index;
					const isCursor = list.isCursor(realIndex);
					const isSelected = selected.has(candidate.id);
					return (
						<Text key={candidate.id} color={isCursor ? 'cyan' : undefined}>
							{isCursor ? '❯ ' : '  '}
							{isSelected ? '◉' : '◯'} {candidate.id}
						</Text>
					);
				})}
			</Box>
			{installed.length > 0 ? (
				<Box flexDirection="column" marginTop={1}>
					<Text dimColor>
						已在 {getEditorLabel(TARGET)} （{installed.length} 个 · 跳过）
					</Text>
					{installedPreview.map(candidate => (
						<Text key={candidate.id} dimColor>
							{'  ✓ '}
							{candidate.id}
						</Text>
					))}
					{installed.length > installedPreview.length ? (
						<Text dimColor>{`  … 还有 ${installed.length - installedPreview.length} 个`}</Text>
					) : null}
				</Box>
			) : null}
			<Box marginTop={1}>
				<Text>
					已选{' '}
					<Text color="cyan" bold>
						{selected.size}
					</Text>
					/{installable.length}
				</Text>
			</Box>
			<Box>
				<KeyHint keys={[
						{key: '↑↓', label: '移动'},
						{key: '空格', label: '选择'},
						{key: 'a', label: '全选'},
						{key: '↵', label: '下一步'},
						{key: 'Esc', label: '返回'},
					]}
				/>
			</Box>
		</Box>
	);
}
