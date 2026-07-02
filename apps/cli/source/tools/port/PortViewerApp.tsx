import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import Spinner from 'ink-spinner';
import {Confirm} from '../../../components/ui/confirm';
import {DataTable, type DataTableColumn} from '../../../components/ui/data-table';
import {Divider} from '../../../components/ui/divider';
import {KeyHint} from '../../../components/ui/key-hint';
import {killPort, listListeningPorts, type PortEntry} from './ports';

const DIVIDER_WIDTH = 44;
const CHROME_ROWS = 14;
const MIN_PAGE_SIZE = 4;
const MAX_PAGE_SIZE = 12;

type PortTableRow = {
	port: string;
	pid: string;
	command: string;
};

type Phase = 'loading' | 'list' | 'confirm' | 'killing' | 'error';

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

function getPageSize(): number {
	const rows = process.stdout.rows ?? 24;
	const fit = rows - CHROME_ROWS;
	return Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, fit));
}

function findEntry(row: PortTableRow | null, entries: PortEntry[]): PortEntry | undefined {
	if (!row) {
		return undefined;
	}

	return entries.find(
		entry => String(entry.port) === row.port && String(entry.pid) === row.pid,
	);
}

export default function PortViewerApp({onBack}: Props) {
	const [phase, setPhase] = useState<Phase>('loading');
	const [entries, setEntries] = useState<PortEntry[]>([]);
	const [highlighted, setHighlighted] = useState<PortTableRow | null>(null);
	const [errorMessage, setErrorMessage] = useState('');
	const [target, setTarget] = useState<PortEntry | null>(null);
	const [statusMessage, setStatusMessage] = useState('');
	const [pageSize, setPageSize] = useState(getPageSize);

	const loadPorts = useCallback(async (options?: {silent?: boolean}) => {
		if (!options?.silent) {
			setPhase('loading');
		}

		setStatusMessage('');

		try {
			const found = await listListeningPorts();
			setEntries(found);
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
		setPageSize(getPageSize());
	}, [entries.length]);

	const tableData = useMemo(
		(): PortTableRow[] =>
			entries.map(entry => ({
				port: String(entry.port),
				pid: String(entry.pid),
				command: entry.fullCommand,
			})),
		[entries],
	);

	const columns = useMemo(
		(): DataTableColumn<PortTableRow>[] => [
			{key: 'port', header: 'Port', width: 8, align: 'right', sortable: true},
			{key: 'pid', header: 'PID', width: 8, align: 'right', sortable: true},
			{
				key: 'command',
				header: 'Command',
				align: 'left',
			},
		],
		[],
	);

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

			if (input === 'k') {
				beginKill(findEntry(highlighted, entries));
				return;
			}

			if (input === 'r') {
				void loadPorts();
				return;
			}

			if (key.escape || input === 'q') {
				onBack();
			}
		},
		{isActive: phase === 'list'},
	);

	const confirmKeyHints = [
		{key: 'y', label: '确认'},
		{key: 'n', label: '取消'},
		{key: 'Esc', label: '返回'},
	];

	const listKeyHints = [
		{key: '↑↓', label: '移动'},
		{key: '←→', label: '翻页'},
		{key: '/', label: '搜索'},
		{key: 's', label: '排序'},
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
						<Box marginBottom={1}>
							<Text>
								共{' '}
								<Text color="cyan" bold>
									{entries.length}
								</Text>{' '}
								个端口
							</Text>
						</Box>

						<DataTable
							columns={columns}
							data={tableData}
							pageSize={pageSize}
							searchable
							searchPlaceholder="端口号 / 命令"
							emptyMessage="没有匹配的端口"
							showFooter={false}
							focus={phase === 'list'}
							onHighlightChange={setHighlighted}
							onSelect={row => {
								beginKill(findEntry(row, entries));
							}}
						/>
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
			) : phase === 'list' && entries.length > 0 ? (
				<Box>
					<KeyHint keys={listKeyHints} />
				</Box>
			) : null}
		</Box>
	);
}
