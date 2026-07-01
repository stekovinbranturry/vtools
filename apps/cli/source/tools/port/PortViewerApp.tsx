import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import {Confirm} from '../../../components/ui/confirm';
import {Divider} from '../../../components/ui/divider';
import {KeyHint} from '../../../components/ui/key-hint';
import {Table, type TableColumn} from '../../../components/ui/table';
import {
	filterPorts,
	killPort,
	listListeningPorts,
	type PortEntry,
} from './ports';

const DIVIDER_WIDTH = 44;
const CHROME_ROWS = 20;
const MIN_VISIBLE = 4;
const MAX_VISIBLE = 10;

const COMMAND_COL_MAX = 36;

function getCommandColumnWidth(): number {
	const term = process.stdout.columns ?? 80;
	return Math.max(16, Math.min(COMMAND_COL_MAX, term - 24));
}

type PortTableRow = {
	port: string;
	pid: string;
	command: string;
};

type Phase = 'loading' | 'list' | 'confirm' | 'killing' | 'error';
type Focus = 'list' | 'filter';

type Props = {
	onBack: () => void;
};

function Header() {
	return (
		<>
			<Text bold>查看管理 Node 端口</Text>
			<Divider width={DIVIDER_WIDTH} />
		</>
	);
}

function getVisibleCount(total: number): number {
	const rows = process.stdout.rows ?? 24;
	const fit = rows - CHROME_ROWS;
	return Math.max(MIN_VISIBLE, Math.min(total, MAX_VISIBLE, fit));
}

export default function PortViewerApp({onBack}: Props) {
	const [phase, setPhase] = useState<Phase>('loading');
	const [entries, setEntries] = useState<PortEntry[]>([]);
	const [filter, setFilter] = useState('');
	const [focus, setFocus] = useState<Focus>('list');
	const [cursorIndex, setCursorIndex] = useState(0);
	const [scrollOffset, setScrollOffset] = useState(0);
	const [errorMessage, setErrorMessage] = useState('');
	const [target, setTarget] = useState<PortEntry | null>(null);
	const [statusMessage, setStatusMessage] = useState('');

	const filtered = useMemo(
		() => filterPorts(entries, filter),
		[entries, filter],
	);

	const visibleCount = useMemo(
		() => getVisibleCount(filtered.length),
		[filtered.length],
	);

	const loadPorts = useCallback(async (options?: {silent?: boolean}) => {
		if (!options?.silent) {
			setPhase('loading');
		}

		setStatusMessage('');

		try {
			const found = await listListeningPorts();
			setEntries(found);
			setCursorIndex(0);
			setScrollOffset(0);
			setPhase('list');
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : String(error),
			);
			setPhase('error');
		}
	}, []);

	useEffect(() => {
		void loadPorts();
	}, [loadPorts]);

	useEffect(() => {
		if (cursorIndex >= filtered.length) {
			setCursorIndex(Math.max(0, filtered.length - 1));
		}
	}, [cursorIndex, filtered.length]);

	function exitFilter() {
		setFocus('list');
	}

	function moveCursor(delta: number) {
		if (filtered.length === 0) {
			return;
		}

		setCursorIndex(previous => {
			const next = (previous + delta + filtered.length) % filtered.length;

			setScrollOffset(offset => {
				if (next < offset) {
					return next;
				}

				if (next >= offset + visibleCount) {
					return next - visibleCount + 1;
				}

				return offset;
			});

			return next;
		});
	}

	function beginKill(entry: PortEntry | undefined) {
		if (!entry) {
			return;
		}

		setTarget(entry);
		setPhase('confirm');
	}

	async function confirmKill() {
		if (!target) {
			return;
		}

		setPhase('killing');
		setStatusMessage(`正在关闭端口 ${target.port} …`);

		try {
			await killPort(target.pid);
			setTarget(null);
			await loadPorts({silent: true});
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : String(error),
			);
			setTarget(null);
			setPhase('error');
		}
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

			if (phase === 'killing') {
				return;
			}

			if (key.upArrow) {
				moveCursor(-1);
				return;
			}

			if (key.downArrow) {
				moveCursor(1);
				return;
			}

			if (input === '/' || input === 'f') {
				setFocus('filter');
				return;
			}

			if (input === 'r') {
				void loadPorts();
				return;
			}

			if (input === 'k' || key.return) {
				beginKill(filtered[cursorIndex]);
				return;
			}

			if (key.escape || input === 'q') {
				onBack();
			}
		},
		{isActive: phase === 'list' && focus === 'list'},
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

	const windowed = filtered.slice(scrollOffset, scrollOffset + visibleCount);
	const hasMoreAbove = scrollOffset > 0;
	const hasMoreBelow = scrollOffset + visibleCount < filtered.length;
	const selected = filtered[cursorIndex];
	const selectedTableIndex = cursorIndex - scrollOffset;

	const columns = useMemo(
		(): TableColumn<PortTableRow>[] => [
			{key: 'port', header: 'Port', width: 6, align: 'right'},
			{key: 'pid', header: 'PID', width: 8, align: 'right'},
			{
				key: 'command',
				header: 'Command',
				align: 'left',
				width: getCommandColumnWidth(),
			},
		],
		[],
	);

	const tableData = useMemo(
		(): PortTableRow[] =>
			windowed.map(entry => ({
				port: String(entry.port),
				pid: String(entry.pid),
				command: entry.fullCommand,
			})),
		[windowed],
	);

	const confirmKeyHints = [
		{key: 'y', label: '确认'},
		{key: 'n', label: '取消'},
		{key: 'Esc', label: '返回'},
	];

	const listKeyHints =
		focus === 'filter'
			? [
					{key: '↵', label: '回到列表'},
					{key: 'Esc', label: '回到列表'},
					{key: 'Tab', label: '回到列表'},
				]
			: [
					{key: '↑↓', label: '移动'},
					{key: '/ f', label: '过滤'},
					{key: 'k ↵', label: '关闭'},
					{key: 'r', label: '刷新'},
					{key: 'Esc', label: '返回'},
				];

	if (phase === 'loading') {
		return (
			<Box flexDirection="column">
				<Header />
				<Box marginTop={1}>
					<Text color="yellow">
						<Spinner type="dots" /> 正在扫描 node 监听端口…
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
					<Divider width={DIVIDER_WIDTH} />
				</Box>
				<Box>
					<KeyHint keys={[{key: '↵ / q', label: '返回'}]} />
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Header />

			<Box marginTop={1} flexDirection="column">
				{entries.length === 0 ? (
					<Text dimColor>当前没有监听中的 node 端口</Text>
				) : (
					<Box flexDirection="column">
						<Box>
							<Text>
								共{' '}
								<Text color="cyan" bold>
									{filtered.length}
								</Text>{' '}
								个端口
							</Text>
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

						<Box marginTop={1} flexDirection="column">
							<Text color={focus === 'filter' ? 'cyan' : 'gray'}>
								{focus === 'filter' ? '▸ 过滤中' : '过滤（端口号 / 命令）'}
							</Text>
							<Text color={focus === 'filter' ? 'cyan' : undefined}>
								{focus === 'filter' ? '> ' : '  '}
								{focus === 'filter' ? (
									<TextInput
										value={filter}
										onChange={value => {
											setFilter(value);
											setCursorIndex(0);
											setScrollOffset(0);
										}}
										onSubmit={exitFilter}
										placeholder="3000"
									/>
								) : (
									<Text dimColor={!filter}>{filter || '—'}</Text>
								)}
							</Text>
						</Box>

						{filtered.length === 0 ? (
							<Box marginTop={1}>
								<Text dimColor>没有匹配的端口</Text>
							</Box>
						) : (
							<Box marginTop={1} flexDirection="column">
								<Table
									columns={columns}
									data={tableData}
									selectedRowIndex={
										selectedTableIndex >= 0 &&
										selectedTableIndex < tableData.length
											? selectedTableIndex
											: undefined
									}
								/>
								{selected && focus === 'list' ? (
									<Box marginTop={1}>
										<Text dimColor>{selected.fullCommand}</Text>
									</Box>
								) : null}
							</Box>
						)}
					</Box>
				)}
			</Box>

			{phase === 'killing' ? (
				<Box marginTop={1}>
					<Text color="yellow">
						<Spinner type="dots" /> {statusMessage}
					</Text>
				</Box>
			) : phase === 'confirm' && target ? (
				<Box marginTop={1}>
					<Confirm
						message={`关闭端口 ${target.port} · PID ${target.pid}？`}
						defaultValue={true}
						onConfirm={() => void confirmKill()}
						onCancel={() => {
							setTarget(null);
							setPhase('list');
						}}
					/>
				</Box>
			) : null}

			<Box marginTop={1}>
				<Divider width={DIVIDER_WIDTH} />
			</Box>
			{phase === 'confirm' ? (
				<Box>
					<KeyHint keys={confirmKeyHints} />
				</Box>
			) : phase === 'list' ? (
				<Box>
					<KeyHint keys={listKeyHints} />
				</Box>
			) : null}
		</Box>
	);
}
