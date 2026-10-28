# 🖥️ Solstice (至日) · 跨平台桌面客户端全景指南

Solstice 不仅支持以现代 Web 单页应用形式部署与在线体验，更原生提供了面向 **macOS** 与 **Windows** 的桌面端安装包。

---

## 🌟 为什么选择桌面客户端？

| 维度 | 网页端 (Web) | 桌面端 (macOS / Windows) |
| :--- | :--- | :--- |
| **启动速度** | 依赖浏览器网络加载 | 毫秒级秒开，原生进程加速 |
| **离线可用** | 需保持联网加载资源 | 100% 离线可用，内置 Graph-RAG 图谱推理 |
| **数据隐私** | 存储于浏览器 LocalStorage | 独享本地独立沙箱，个人经历与简历画卷绝对私有 |
| **沉浸体验** | 易受标签页与浏览器快捷键干扰 | 沉浸式天体暗黑界面、原生视网膜屏与标题栏深度融合 |
| **快捷入口** | 收藏夹 / 浏览器历史 | 桌面快捷方式、macOS Dock 栏、Windows 开始菜单一键唤起 |

---

## 📦 下载与安装形式

### 🍎 1. macOS 客户端
- **适用系统**：macOS 12 (Monterey) 及更高版本
- **安装包形式**：
  - **Apple Silicon (M 系列芯片)**：`Solstice-1.0.0-arm64.dmg`（推荐 M1 / M2 / M3 / M4 用户）
  - **Intel 架构芯片**：`Solstice-1.0.0-x64.dmg`
- **安装步骤**：
  1. 下载对应芯片的 `.dmg` 镜像文件并双击挂载；
  2. 将 **Solstice (至日)** 图标拖入右侧的 **Applications (应用程序)** 文件夹；
  3. 在“启动台 (Launchpad)”或“聚焦搜索 (Spotlight)”中搜索 `Solstice` 即可打开；
  > *首次打开提示“无法打开，因为无法验证开发者”？*
  > 进入 Mac **系统设置 ➔ 隐私与安全性 ➔ 安全性**，点击**“仍要打开”**即可。

---

### 🪟 2. Windows 客户端
- **适用系统**：Windows 10 / Windows 11 (64 位)
- **安装包形式**：
  - **标准安装向导 (Installer)**：`Solstice Setup 1.0.0.exe`（自动创建桌面快捷方式与开始菜单项）
  - **绿色免安装版 (Portable)**：`Solstice 1.0.0.exe`（单文件即点即用，支持放进 U 盘随时随地运行）
- **安装步骤**：
  1. 双击运行 `Solstice Setup 1.0.0.exe`；
  2. 选择安装目录（支持自定义路径）；
  3. 安装完成后直接从桌面图标一键启动。

---

## 🛠️ 本地开发与打包编译

如果你需要自行修改源码并打包属于你自己的桌面版本：

### 1. 注入工程养分
```bash
npm install
```

### 2. 本地开发与热重载调试
同时启动 Vite 开发服务器与 Electron 桌面容器：
```bash
npm run electron:dev
```

### 3. 生成桌面高清矢量图标
从 `public/solstice-logo.svg` 自动渲染并编译全套 macOS `.icns` 和高清 `.png` 图标：
```bash
npm run icons
```

### 4. 跨平台打包命令

```bash
# 生成当前操作系统的二进制包
npm run electron:pack

# 打包 macOS 安装程序 (.dmg 和 .zip)
npm run electron:build:mac

# 打包 Windows 安装程序 (.exe NSIS 与 Portable)
npm run electron:build:win

# 自动生成全平台分发文件
npm run electron:build
```

所有打包生成的最终可安装文件均存放于根目录的 `release/` 文件夹下。

---

## 🚀 持续集成与自动化发布 (CI/CD)

项目已内置 GitHub Actions 跨平台持续分发工作流 [`.github/workflows/desktop-release.yml`](.github/workflows/desktop-release.yml)。
- 当你在 GitHub 上推送版本 Tag（例如 `git tag v1.0.0 && git push --tags`）；
- 或在 GitHub 仓库 Actions 页面手动点击 **Run workflow**；
- 云端 GitHub Actions 虚拟机会自动启动 macOS 和 Windows 双矩阵节点，全自动完成构建并将 `.dmg` 与 `.exe` 安装包挂载到 Release 页面供全球用户极速下载。
