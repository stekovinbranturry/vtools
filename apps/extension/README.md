# DevTools New Tab

一个替换浏览器新标签页的 Chrome 扩展，提供一个可扩展的「开发者工具面板」。
首个工具是 **VSIX 下载器**：输入 VS Code 扩展名称或 Marketplace 链接，一键下载 `.vsix` 安装包。

## 技术栈

- Vite + React + TypeScript
- Tailwind CSS v4（玻璃拟态 UI）
- Chrome Manifest V3

## 开发

```bash
pnpm install
pnpm dev      # 本地预览面板 UI（chrome.* API 在此环境不可用，下载走 <a> 兜底）
```

## 构建并作为扩展加载

```bash
pnpm build    # 产物输出到 dist/
```

然后在 Chrome 中：

1. 打开 `chrome://extensions`
2. 右上角开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目的 `dist/` 目录
4. 打开一个新标签页即可看到工具面板

> 重新构建后，在扩展页面点击该扩展的「刷新」按钮即可更新。

## VSIX 下载器说明

- 支持输入：
  - `publisher.extension`（如 `ms-python.python`）
  - 完整 Marketplace 链接（如 `https://marketplace.visualstudio.com/items?itemName=ms-python.python`）
- 版本号留空时，会调用 Visual Studio Marketplace API 自动解析最新版本；失败时可手动填写版本号。
- 下载通过 `chrome.downloads` API 完成，可选择是否弹出「保存位置」对话框。

## 项目结构

```
src/
├── App.tsx                 # 面板主界面（卡片网格 + 工具视图）
├── lib/marketplace.ts      # Marketplace 解析与下载逻辑
└── tools/
    ├── registry.ts         # 工具注册表（新增工具在此登记）
    ├── types.ts
    └── vsix/VsixDownloader.tsx
public/
├── manifest.json           # MV3 清单
└── icons/                  # 16 / 48 / 128 图标
```

## 新增工具

在 `src/tools/` 下创建组件，然后在 `src/tools/registry.ts` 中追加一项即可，面板会自动渲染。
