# 题海无涯

基于 Next.js 14 App Router、React 18、TypeScript、Ant Design 5 的题库前端，连接同目录的 EndlessQuestion 后端。

## 本地启动

```bash
npm install
npm run dev
```

访问 http://localhost:3000 。默认将 `/api/*` 代理到 `http://127.0.0.1:8101/api/*`。

后端地址需要调整时，将 `.env.example` 复制为 `.env.local`，修改 `BACKEND_URL`（不包含 `/api`），然后重启前端。后端的 MySQL、Redis 及其他已启用服务需要自行就绪。全文搜索依赖 Elasticsearch。

## 页面

- `/`：首页、近期题库和题目、本浏览器最近刷题入口。
- `/banks`、`/banks/[bankId]`：题库浏览与题库内搜索。
- `/questions`、`/questions/[questionId]`：题目检索与 Markdown 刷题练习。
- `/banks/[bankId]/questions/[questionId]`：题库目录、答案折叠、跨页切题。
- `/user/login`、`/user/register`：登录注册及站内返回地址。
- `/user/profile`：资料、头像和年度签到。
- `/admin/questions`、`/admin/banks`、`/admin/users`：管理员内容与用户维护。
- `/admin/banks/[bankId]/questions`：题目批量关联和移除。

## 代码组织

- `src/lib/api.ts`：原生 fetch、响应解包、错误映射、详情访问告警冷却；业务 ID 使用字符串。
- `src/components/providers.tsx`：Ant Design 中文主题、查询缓存和登录态。
- `src/components/learning.tsx`：首页、列表、搜索、Markdown 和刷题组件。
- `src/components/account.tsx`：登录、路由权限、资料、上传和签到。
- `src/components/admin.tsx`：管理表格、编辑抽屉与题库关联。
- `src/app`：页面路由、站点元信息和响应式样式。

浏览器通过同源 Cookie 使用后端 Sa-Token 登录态（当前名为 `EndlessQuestion`）。权限以服务端返回为准，不保存密码或自行复制 Token。

题目详情不自动重试、不在窗口聚焦时刷新，也不预取相邻题目。收到业务码 110 后，在当前标签页暂停新的详情网络请求 60 秒；这不能代替后端频率限制。

头像上传使用 `file` 与 `biz=user_avatar`，限制 1 MB。题库封面仅填写图片 URL。签到返回的整数按从 1 开始的年内天数换算；签到不等于答题完成记录。最近刷题仅存储在当前浏览器。

## 检查与生产运行

```bash
npm test
npm run lint
npm run build
npm start
```

`npm test` 使用 Node 内置测试运行器验证 原生 fetch 请求契约、字符串 ID、登录失效、游客初始化、告警冷却和文件上传；测试模拟原生 fetch 响应，不访问或写入真实后端。

生产环境需配置实际后端地址并提供 HTTPS。未实现没有现成接口支撑的判分、错题本、题目收藏和跨设备学习进度。帖子模块按计划暂缓，需先确认数据表与运行环境。

首页导航提供题目与题库快捷搜索：350 毫秒防抖、分组结果、键盘选择与直接跳转；手机端通过搜索图标展开。
