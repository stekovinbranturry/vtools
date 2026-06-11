import React, {useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {tools} from './registry.js';
import VsixApp from './vsix/VsixApp.js';

export default function Dashboard() {
	const {exit} = useApp();
	const [activeTool, setActiveTool] = useState<string | null>(null);

	useInput((input, key) => {
		if (input === 'q' || (key.ctrl && input === 'c')) {
			exit();
		}
	});

	if (activeTool === 'vsix-downloader') {
		return <VsixApp onBack={() => setActiveTool(null)} />;
	}

	const items = tools
		.filter(tool => tool.available)
		.map(tool => ({
			label: `${tool.icon} ${tool.name} — ${tool.description}`,
			value: tool.id,
		}));

	return (
		<Box flexDirection="column">
			<Text bold>DevTools CLI</Text>
			<Text dimColor>{'─'.repeat(28)}</Text>
			<Box marginTop={1}>
				<SelectInput
					items={items}
					onSelect={item => setActiveTool(item.value)}
				/>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>↑/↓ 选择 · Enter 进入 · q 退出</Text>
			</Box>
		</Box>
	);
}
