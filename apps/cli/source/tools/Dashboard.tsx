import React, {useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {tools} from './registry.js';
import VsixApp from './vsix/VsixApp.js';

export default function Dashboard() {
	const {exit} = useApp();
	const [activeTool, setActiveTool] = useState<string | null>(null);
	const availableTools = tools.filter(tool => tool.available);
	const [highlightedId, setHighlightedId] = useState(
		availableTools[0]?.id ?? '',
	);

	useInput((input, key) => {
		if (input === 'q' || (key.ctrl && input === 'c')) {
			exit();
		}
	});

	if (activeTool === 'vsix-downloader') {
		return <VsixApp onBack={() => setActiveTool(null)} />;
	}

	const items = availableTools.map(tool => ({
		label: `${tool.icon} ${tool.name}`,
		value: tool.id,
	}));

	const highlightedTool = availableTools.find(tool => tool.id === highlightedId);

	return (
		<Box flexDirection="column">
			<Text bold>DevTools CLI</Text>
			<Text dimColor>{'─'.repeat(28)}</Text>
			<Box marginTop={1}>
				<SelectInput
					items={items}
					onHighlight={item => setHighlightedId(item.value)}
					onSelect={item => setActiveTool(item.value)}
				/>
			</Box>
			{highlightedTool?.description ? (
				<Box marginTop={1}>
					<Text dimColor>{highlightedTool.description}</Text>
				</Box>
			) : null}
			<Box marginTop={1}>
				<Text dimColor>↑/↓ 选择 · Enter 进入 · q 退出</Text>
			</Box>
		</Box>
	);
}
