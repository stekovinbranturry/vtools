export type ToolDefinition = {
	id: string;
	name: string;
	description: string;
	available: boolean;
};

export const tools: ToolDefinition[] = [
	{
		id: 'vsix-downloader',
		name: '安装 VS Code / Cursor 插件',
		description:
			'输入 VS Code 插件名称或 Marketplace 链接，安装到 VS Code / Cursor',
		available: true,
	},
	{
		id: 'sync-to-cursor',
		name: '同步 VS Code 插件到 Cursor',
		description: '读取 VS Code 已安装插件，并安装到 Cursor',
		available: true,
	},
	{
		id: 'port-viewer',
		name: '管理 Node 端口',
		description:
			'列出正在监听的端口及其进程，一键关闭占用（如 3000 被占）',
		available: true,
	},
	{
		id: 'script-runner',
		name: '运行 Scripts',
		description:
			'从当前目录及子包选择并运行 npm / pnpm / yarn scripts',
		available: true,
	},
	{
		id: 'coming-soon',
		name: '更多工具',
		description: '更多开发者小工具正在路上……',
		available: false,
	},
];
