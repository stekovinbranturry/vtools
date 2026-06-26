export type ToolDefinition = {
	id: string;
	name: string;
	description: string;
	available: boolean;
};

export const tools: ToolDefinition[] = [
	{
		id: 'vsix-downloader',
		name: 'VSIX 安装器',
		description:
			'输入 VS Code 扩展名称或 Marketplace 链接，安装到 VS Code / Cursor',
		available: true,
	},
	{
		id: 'sync-to-cursor',
		name: '同步 VS Code 插件到 Cursor',
		description: '读取 VS Code 已安装扩展，并安装到 Cursor',
		available: true,
	},
	{
		id: 'coming-soon',
		name: '更多工具',
		description: '更多开发者小工具正在路上……',
		available: false,
	},
];
