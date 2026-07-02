# @v-kit/cli

![vkit dashboard](https://raw.githubusercontent.com/stekovinbranturry/vkit/main/images/dashboard.png)

终端里的开发者工具箱（Your terminal dev toolbox）。

## 安装

需要 [Node.js](https://nodejs.org/) 18+。

```bash
npm install -g @v-kit/cli
```

## 使用前准备

**安装插件**需要系统里能调用 **`cursor`** 或 **`code`** 命令。请在对应编辑器中打开命令面板，执行 **「Shell Command: Install 'cursor' command in PATH」**（Cursor）或 **「Shell Command: Install 'code' command in PATH」**（VS Code）。

![在编辑器中安装 cursor / code 命令](https://raw.githubusercontent.com/stekovinbranturry/vkit/main/images/install-command.png)

安装完成后，在终端执行 `cursor --version` 或 `code --version` 确认可用。

**管理 Node 端口**仅支持 **macOS**（依赖 `lsof`），无需额外配置。


## 使用

```bash
vkit              # 进入主菜单，选择工具
vkit port         # 管理 Node 端口
vkit run          # 运行 Scripts
vkit vsix-sync    # 同步 VS Code 插件到 Cursor
vkit vsix         # 打开 安装 VS Code / Cursor 插件表单

# 直接下载并安装某个插件
vkit vsix ms-python.python
vkit vsix esbenp.prettier-vscode --version 11.0.0
vkit vsix ms-python.python --out ./extensions/
```

### 运行 Scripts

```bash
vkit run
```

或在主菜单选择 **「运行 Scripts」**。从**当前工作目录及子目录**扫描 scripts（不向上查找 monorepo 根）。

### 管理 Node 端口

```bash
vkit port
```

## 链接

- [GitHub](https://github.com/stekovinbranturry/vkit)
- [问题反馈](https://github.com/stekovinbranturry/vkit/issues)
