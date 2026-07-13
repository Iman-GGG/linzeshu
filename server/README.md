# 林则鼠 后端（Mock API）

快速启动：

1. 进入目录：

```bash
cd server
```

2. 安装依赖并启动：

```bash
npm install
npm run start
```

默认监听 `http://localhost:3000`。

说明：
- 这是一个用于开发与联调的后端 stub，提供示例接口：`/api/v1/report`、`/api/v1/records`、`/api/v1/heatmap`、`/api/v1/content/search` 和 AI 模拟端点 `/api/v1/ai/respond`。
- 数据保存在 `server/data/store.json`（文件存储）以便快速测试。
