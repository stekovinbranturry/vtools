---
"@v-kit/cli": minor
"@v-kit/core": minor
---

新增「同步 VS Code 扩展到 Cursor」命令（`vkit vsix-sync`），交互式选择缺失的扩展并自动下载安装；新增启动时的新版本升级提示（update-notifier）。子进程调用迁移到 execa / which，安装逻辑更健壮。优化主面板：渐变大字标题、功能列表与键盘提示样式。
