import type { ToolDefinition } from "./types";
import { VsixDownloader } from "./vsix/VsixDownloader";

/**
 * Central registry of dashboard tools. To add a new tool, build its component
 * and append an entry here — the dashboard renders everything automatically.
 */
export const tools: ToolDefinition[] = [
  {
    id: "vsix-downloader",
    name: "VSIX 下载器",
    description: "输入 VS Code 扩展名称或 Marketplace 链接，下载 .vsix 安装包。",
    icon: "📦",
    accent: "from-indigo-500/40 to-fuchsia-500/40",
    available: true,
    component: VsixDownloader,
  },
  {
    id: "coming-soon",
    name: "更多工具",
    description: "更多开发者小工具正在路上……",
    icon: "✨",
    accent: "from-cyan-500/30 to-emerald-500/30",
    available: false,
  },
];
