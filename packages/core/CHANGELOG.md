# @v-kit/core

## 0.4.0

### Minor Changes

- 9f3f038: 新增「运行 Scripts」工具（按包 Tab 切换、多选批量运行）及 `vkit run` / `vkit port` 子命令；端口管理改用 InkUI DataTable；CLI 入口拆分为 dispatch 与各工具 entry 模块。

## 0.3.0

### Minor Changes

- 18bf9ec: 新增「查看管理 Node 端口」工具：列出 macOS 上 node 进程的 TCP 监听端口，支持过滤、Table 展示、选中高亮与 Confirm 确认后关闭占用进程。

## 0.2.0

## 0.1.1

### Patch Changes

- c3d0bed: 更新 README：精简文档，补充同步功能与升级提示说明。

## 0.1.0

### Minor Changes

- 7fd91c1: 新增「同步 VS Code 扩展到 Cursor」命令（`vkit vsix-sync`），交互式选择缺失的扩展并自动下载安装；新增启动时的新版本升级提示（update-notifier）。子进程调用迁移到 execa / which，安装逻辑更健壮。优化主面板：渐变大字标题、功能列表与键盘提示样式。

## 0.0.3

### Patch Changes

- 97ba18b: Re-enable npm provenance for published packages.

## 0.0.2

### Patch Changes

- 133a20f: Publish under the `@v-kit` scope; the CLI binary is now `vkit`.

## 0.0.1

### Patch Changes

- publish

## 0.0.2

### Patch Changes

- cee30de: publish

## 0.0.1

### Patch Changes

- 750ae21: first publish
