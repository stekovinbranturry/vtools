export type ToolDefinition = {
	id: string;
	name: string;
	description: string;
	icon: string;
	available: boolean;
};

export const tools: ToolDefinition[] = [
	{
		id: 'vsix-downloader',
		name: 'VSIX 下载器',
		description:
			'输入 VS Code 扩展名称或 Marketplace 链接，下载 .vsix 安装包。',
		icon: '📦',
		available: true,
	},
	{
		id: 'coming-soon',
		name: '更多工具',
		description: '更多开发者小工具正在路上……',
		icon: '✨',
		available: false,
	},
];
