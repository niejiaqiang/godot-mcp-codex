# Godot MCP Codex

[English](./README_EN.md) | 中文

一个面向 Codex、Claude 和其他 MCP 客户端的 Godot MCP 工具集。它由 Godot 编辑器插件和 FastMCP Node 服务端组成，让 AI 可以读取场景、编辑节点和脚本、诊断 UI 布局、管理信号、搜索项目文件、检查资源信息。

## 直接可用吗？

可以，但这不是“云端即开即用”的服务，而是一套本地开发工具链。

使用者仍然需要：

1. 先把仓库 `git clone` 到本地
2. 本地打开一个 Godot 项目，并启用 `addons/godot_mcp`

原因：
- MCP 的 Node 服务端是本地运行的
- Godot 插件必须存在于本地项目里，AI 才能操作场景、节点和资源

所以正常使用方式是：本地 clone、本地 build、本地 Godot 项目启用插件、本地 MCP 客户端连接。

## 如何接入自己的游戏项目？

如果你只是想使用这套 MCP，不一定要把这个仓库本身当成你的游戏仓库。

常见用法有两种：

### 方案 A：直接打开仓库自带示例项目

适合先验证整条链路是否正常。

1. `git clone` 本仓库
2. 安装 server 依赖并构建
3. 用 Godot 打开仓库根目录下的 `project.godot`
4. 在 MCP 客户端里配置 `server/dist/index.js`

### 方案 B：接入你自己的 Godot 游戏项目

适合正式开发。

1. `git clone` 本仓库到本地任意目录
2. 把 `addons/godot_mcp` 复制到你自己的 Godot 项目 `addons/` 下
3. 用 Godot 打开你的游戏项目，并启用插件
4. MCP 客户端仍然指向这个仓库里的 `server/dist/index.js`

也就是说：
- 不需要先打开你的游戏项目再 clone
- 正常顺序是先 clone 到本地，再把插件接入你的 Godot 项目
- 正式使用时，通常把这个仓库当作 MCP 源码仓库，把插件同步到自己的游戏项目

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/niejiaqiang/godot-mcp-codex.git
cd godot-mcp-codex
```

### 2. 构建 MCP 服务端

```bash
cd server
npm install
npm run build
cd ..
```

### 3. 配置 MCP 客户端

在 Codex、Claude Desktop、Claude Code 或其他兼容 MCP 的客户端中加入类似配置：

```json
{
  "mcpServers": {
    "godot-mcp-codex": {
      "command": "node",
      "args": [
        "PATH_TO_YOUR_PROJECT/server/dist/index.js"
      ],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

注意：把 `PATH_TO_YOUR_PROJECT` 替换为你本机上的实际绝对路径。

保存后重启你的 MCP 客户端。

### 4. 在 Godot 中启用插件

如果使用仓库自带示例项目：

1. 打开 Godot
2. 导入本仓库根目录下的 `project.godot`
3. 确认插件已经启用

如果接入你自己的 Godot 项目：

1. 把 `addons/godot_mcp` 复制到你的项目 `addons/` 目录
2. 用 Godot 打开你的项目
3. 在 `项目 > 项目设置 > 插件` 里启用 `Godot MCP`

## 功能特性

- 稳定的 `stdio` 主链路，适合 Codex 等桌面 MCP 客户端
- 场景与节点自动化，支持创建、查询、修改 Godot 内容
- 脚本编辑支持，包括读取、写入、模板生成
- UI 布局诊断能力，包括子树快照、问题检测、自动修复、控件对齐
- 信号工具，支持查看、连接、断开、审计节点信号
- 项目文件访问，支持目录列举、文本读取、项目搜索
- 资源检查能力，支持资源列表、资源信息、资源依赖分析
- 可选 SSE / HTTP 传输，适合支持这些链路的客户端

## 高价值工具

- `find_nodes`, `get_node_subtree`, `batch_update_node_properties`
- `inspect_control_layouts`, `diagnose_layout_issues`, `auto_fix_layout_issues`, `align_controls`
- `list_node_signals`, `get_node_signal_info`, `list_node_signal_connections`
- `connect_node_signal`, `disconnect_node_signal`, `disconnect_all_node_signal_connections`
- `list_directory`, `read_text_file`, `search_project_files`
- `list_resources`, `get_resource_info`, `get_resource_dependencies`
- `create_theme_resource`, `assign_theme_to_control`
- `get_plugin_sync_status`

## 仓库里有没有无关内容？

目前仓库主体是可解释且可直接使用的：
- `addons/godot_mcp`：Godot 插件
- `server`：FastMCP Node 服务端
- `project.godot` / `TestScene.tscn`：示例项目
- `docs/`：文档

我已经移除了明显偏个人或无关的内容：
- `.DS_Store`
- `CLAUDE.md`
- `claude_desktop_config.json`

保留下来的示例项目文件不是无关内容，它们是为了让别人快速验证插件和服务端是否正常工作。

## 排障

### 连接问题

- 确认插件已在 Godot 的项目插件设置中启用
- 检查 Godot 控制台是否有报错
- 确认 MCP 客户端启动时能正常拉起 `server/dist/index.js`

### 插件未生效

- 修改配置后重新加载 Godot 项目
- 检查 Godot 控制台错误信息
- 确保 MCP 客户端配置里的路径使用绝对路径

## 仓库结构说明

本仓库有意保留以下结构：
- 根目录是 MCP 源码仓库
- `addons/godot_mcp` 是 Godot 插件
- `server` 是 Node / FastMCP 服务端
- `project.godot` 与 `TestScene.tscn` 是最小示例项目

如果你要接入自己的 Godot 游戏项目，通常只需要把 `addons/godot_mcp` 同步到目标项目的 `addons` 目录。

## 文档

更详细的内容可以继续看 `docs/`：

- [Getting Started](docs/getting-started.md)
- [Installation Guide](docs/installation-guide.md)
- [Command Reference](docs/command-reference.md)
- [Architecture](docs/architecture.md)

## 许可证

本项目使用 MIT License，详见 [LICENSE](LICENSE)。
