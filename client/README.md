# 林则鼠 微信小程序 前端骨架

开发与调试：

1. 打开微信开发者工具，选择 `client` 文件夹作为项目目录。
2. 在 `utils/api.js` 中修改 `baseUrl` 指向后端服务地址（默认 `http://localhost:3000`）。
3. 主要页面：
  - `pages/home` 首页
  - `pages/guide` 劝烟前看看
  - `pages/camera` 我要劝烟（相机 stub）
  - `pages/records` 我的劝烟记录

说明：当前为前端交互骨架，摄像录制、权限、AI 逻辑为示例/占位，后续需替换为真实能力（小程序相机组件、MediaRecorder、云/本地 AI 对接）。
