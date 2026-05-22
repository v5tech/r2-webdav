# Plan: FlareDrive Scope B 实施计划

> 与 [SPEC.md](./SPEC.md) / [CONTEXT.md](./CONTEXT.md) 配对. 本文不重复需求, 只回答 "怎么按何顺序、怕什么、怎么知道走对了". 当前生效 ADR: 0003 (取代 0001/0002).

## 1. 组件依赖图

```
┌─────────────────────────────────────────────────────────┐
│   Phase 0 — 清债 & Vite 迁移 & Tailwind/shadcn 初始化     │
│   删死代码 · CRA→Vite · Tailwind+PostCSS · shadcn init   │
│   ESLint flat · Prettier · Vitest/Playwright 骨架        │
└──────────────────────┬──────────────────────────────────┘
                       │ 构建工具就位才能动 UI 与新端点
                       ▼
┌─────────────────────────────────────────────────────────┐
│   Phase 1 — Bug 修复 & 鉴权升级                           │
│   常量时间 Basic auth · PROPFIND XML 转义 · driveid 去除  │
│   pdfjs 本地化 · README 阈值 · /api/login /api/logout    │
│   /api/me · JWT 工具 · WebDAV [[path]].ts 双重鉴权        │
│   登录页 + 路由守卫                                       │
└──────────────────────┬──────────────────────────────────┘
                       │ 鉴权打通才能在 UI 调用 API
                       ▼
┌─────────────────────────────────────────────────────────┐
│   Phase 2 — UI 现代化全集                                 │
│   AppShell 响应式 · 文件网格/列表 · 面包屑 · 上传抽屉      │
│   多选/批量 · 文件夹/重命名 · 预览 (图/视频/PDF/文本/代码) │
│   TextPad 重写 · 客户端搜索 · 暗色模式 · i18n 中/英        │
│   删旧 MUI 组件 + 卸 MUI 依赖                             │
└──────────────────────┬──────────────────────────────────┘
                       │ 全部主功能就位才做收尾
                       ▼
┌─────────────────────────────────────────────────────────┐
│   Phase 3 — 收尾                                         │
│   CSP / safety headers · README 重写 · 本地开发文档        │
│   Lighthouse 修复 · Playwright 冒烟 · S1-S23 验收         │
└─────────────────────────────────────────────────────────┘
```

## 2. 阶段细则

### Phase 0 — 清债 & Vite 迁移 & Tailwind/shadcn 初始化 (~1 天)

**目标**: 现代化脚手架, 保留既有 UI 可运行作回归基线.

**主要工作**:
- 删根目录 `Main.tsx`, `TextPadDrawer.tsx`, `utils/s3.ts`.
- 卸 `react-scripts`. 装 `vite` + `@vitejs/plugin-react` + Tailwind + autoprefixer + postcss.
- `src/index.js` → `src/main.tsx` (`createRoot`).
- `index.html` 迁至仓库根.
- 装 shadcn (init), 生成 `components.json` + `src/lib/utils.ts` + `src/components/ui/`.
- ESLint 9 flat + Prettier + tsconfig (`@/*` alias).
- Vitest + Playwright 骨架文件.

**不做**:
- 不动 `functions/` 目录.
- 不引入 React Router (Phase 1 才需要).
- 不替换业务组件 (Phase 2 才做).

**验证关 ✅**:
- `npm run dev` 启动后浏览器看到既有 MUI UI.
- `npm run build` 产生 `dist/`, `wrangler pages dev dist` 部署预览可用.
- `npm run typecheck` / `lint` / `test` / `test:e2e` 全绿.

### Phase 1 — Bug 修复 & 鉴权升级 (~1 天)

**目标**: 修协议层缺陷; 上线自定义登录页 + JWT cookie 会话; WebDAV 双重鉴权.

**后端 (`functions/`)**:
- `_shared/auth.ts`:
  - `constantTimeEqual(a, b): boolean` — 等长 XOR 短路安全比较.
  - `verifyBasic(authHeader, env): boolean` — Basic auth 解码 + 常量时间比较, 替代 `[[path]].ts:65-69` 的 `===`.
  - `signSessionJwt(passwordSecret, payload, ttl): Promise<string>` — HS256, secret = HMAC-SHA256(passwordSecret).
  - `verifySessionJwt(passwordSecret, token): Promise<payload | null>`.
  - `extractSession(request): string | null` — 从 cookie 提取 fd_session.
- `_shared/xml.ts`:
  - `escapeXml(s): string` — `& < > " '` 转义.
- `api/login.ts` — POST: 接 `{username, password}`, 校验, 签 JWT, set-cookie.
- `api/logout.ts` — POST: 清 cookie.
- `api/me.ts` — GET: 验 cookie, 返 `{ok}` 或 401.
- `webdav/[[path]].ts` 改造:
  - 删原 env 字符串 `===` 比较.
  - 鉴权改成: `if (cookie && verifySessionJwt) return next; else if (basicAuth && verifyBasic) return next; else 401`.
  - `WEBDAV_PUBLIC_READ` 短路保留.
- `webdav/propfind.ts`:
  - 所有用户数据插值经 `escapeXml()`.
- `webdav/utils.ts`:
  - `parseBucketPath` 删 `env[driveid]` 分支与 hostname 解析.
- 前端引用调整: `src/app/transfer.ts` (后续会迁到 `src/lib/`) 内 `import('https://cdnjs...')` → `import * as pdfjs from 'pdfjs-dist'`. 装依赖. worker 路径用 `import.meta.url`.
- README: 修 "≥128MB" → "≥100 MB".

**前端 (`src/`)**:
- 装 `react-router-dom@^7`.
- `src/App.tsx` 增 BrowserRouter + 路由表: `/login`, `/`, `/files/*`. `/files/*` 暂渲染既有 MUI 主界面 (Phase 2 替换).
- `src/pages/login.tsx` — shadcn 表单 (Input + Button + Card), `react-hook-form` + zod. 提交到 `/api/login`, 成功跳 `/`.
- `src/hooks/use-auth.ts` — 调 `/api/me` 判断登录态.
- `src/components/auth/RequireAuth.tsx` — 守卫, 未登录跳 `/login`.

**风险**:
- **R1.1**: JWT 实现细节出错 (签名算法、时间窗) → 鉴权门洞. **缓解**: 单元测试覆盖 sign/verify 正反案例; 集成测试覆盖 cookie 流.
- **R1.2**: WebDAV `[[path]].ts` 改造若回滚不干净, 出现"双套同时生效"或"全空"两种坏态. **缓解**: 该文件单 commit 一次性改完.
- **R1.3**: 前端老路径与新路由表打架, MUI 主界面突然渲染 404. **缓解**: 临时把老主界面挂到 `/files-legacy`, Phase 2 替换时再切.

**验证关 ✅**:
- 浏览器访问 `/` 跳 `/login`; 表单错误密码返红字; 正确登录跳 `/files-legacy` (老 UI), 浏览器持有 fd_session cookie.
- 改 `WEBDAV_PASSWORD` env var 重部署后旧 cookie 被踢.
- `curl -u user:pass /webdav/` 200 列目录; 不带 auth 401.
- 含特殊字符文件名的 PROPFIND 经 `xmllint` 解析通过.
- 不同子域命中同一桶.
- PDF 缩略图生成 Network 面板无 cdnjs.
- 单元测试 `_shared/auth.ts` 与 `_shared/xml.ts` 全绿.

### Phase 2 — UI 现代化全集 (~2.5 天)

**目标**: 端用户 UI 全面 shadcn 化, 桌面+移动响应式; 暗色 + i18n + 预览 + TextPad.

**主要工作 (按完成顺序)**:
- 装 TanStack Query / react-hook-form / zod / react-i18next.
- `src/lib/`:
  - `api.ts` — `/api/*` 客户端 (fetch wrapper).
  - `webdav.ts` — 从 `src/app/transfer.ts` 迁出: PROPFIND 解析、multipart 上传、缩略图生成、各 verb 包装.
  - `i18n.ts` — react-i18next 初始化 + 语言检测.
  - `theme.ts` — 监听 prefers-color-scheme, 持久化偏好.
- `src/components/layout/`:
  - `AppShell.tsx` — Header + Sidebar (sheet 切换) + Outlet.
  - `Header.tsx` — Logo + 搜索框 + 主题/语言切换 + 用户菜单 (注销).
  - `Sidebar.tsx` — 简朴 (文件 / TextPad / 设置 三项).
- `src/components/files/`:
  - `Breadcrumb.tsx`.
  - `FileGrid.tsx` / `FileList.tsx` + 视图模式切换.
  - `SortControls.tsx`.
  - `FileCard.tsx` / `FileRow.tsx`.
  - `NewFolderDialog.tsx` / `RenameDialog.tsx`.
  - `useFileSelection` + `SelectionToolbar.tsx`.
  - `SearchBar.tsx` (复用既有客户端过滤逻辑).
  - `PreviewDialog.tsx` 与子渲染器: `ImagePreview` / `VideoPreview` / `AudioPreview` / `PdfPreview` / `TextPreview` / `CodePreview` (Shiki lazy).
- `src/components/upload/`:
  - `UploadDropZone.tsx` — 拖拽 + 点选.
  - `UploadDrawer.tsx` — 进度列表.
- `src/components/textpad/`:
  - `TextPadDrawer.tsx` 重写 (shadcn + Sheet); 保持现有 "Save & Upload" 语义.
- `src/pages/files.tsx` — 把上面零件组装起来.
- `src/pages/settings.tsx` — 语言 / 主题切换 (持久化 localStorage).
- `src/locales/zh.json` / `en.json` — 抽完全部硬编码字符串.
- 删旧 MUI 组件: `src/Main.tsx` / `FileGrid.tsx` / `Header.tsx` / `UploadDrawer.tsx` / `MultiSelectToolbar.tsx` / `MimeIcon.tsx` / `ProgressDialog.tsx` / `TextPadDrawer.tsx`.
- `package.json` 卸 `@mui/*` 与 `@emotion/*`.
- 删 `/files-legacy` 路由.

**风险**:
- **R2.1**: shadcn 组件在小屏 Dialog 全屏化问题. **缓解**: 用 shadcn `Sheet` 替代窄屏 Dialog.
- **R2.2**: multipart 上传重构进度 XHR 与 Vite HMR 配合问题. **缓解**: `webdav.ts` 切片逻辑单元测试覆盖.
- **R2.3**: i18n 提取遗漏硬编码英文. **缓解**: Phase 2 末打开 `eslint-plugin-i18next/no-literal-string` 跑一次全量修齐.
- **R2.4**: Shiki bundle 失控. **缓解**: 强制 lazy import + 按文件后缀按需注册语言.

**验证关 ✅**:
- 375px 视口完成 "登录 → 上传 → 预览 → 重命名 → 删除" 全流程, 无横向滚动.
- 上传 200MB 文件成功 (验证 multipart 仍工作).
- 图片/视频/音频/PDF/文本/代码各预览类型可用.
- 系统暗色 → 首次访问页面是深色; 手动切浅色刷新仍浅色.
- 切英文 → 整界面英文; 切中文 → 全中文.
- TextPad 创建 → 编辑 → 保存 → 文件出现在列表.
- 旧 MUI 文件全删, `grep -r '@mui'` 仅 lockfile 历史.

### Phase 3 — 收尾 (~0.5 天)

**目标**: 安全 header / 文档 / 性能 / 验收清单.

**主要工作**:
- `functions/_shared/headers.ts` — Hono 中间件 (这里实际没 Hono) 改为各 PagesFunction 共用一个 `withSafetyHeaders(response)` 包装函数; 或加 `_headers` 静态文件 (Pages 原生支持) — 优先后者更简单.
- `_headers` 加: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: ...`, `Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; worker-src 'self' blob:; ...`.
- README 重写 (现代化部署步骤 + 自定义登录说明).
- `docs/development.md` 本地开发指引.
- Lighthouse 跑生产 URL, 修 Perf/A11y < 90 项.
- Playwright `e2e/smoke.spec.ts` 实现并跑绿.
- 手动跑 S1-S23 验收单逐条标记.

**验证关 ✅**:
- Lighthouse Performance ≥ 90, Accessibility ≥ 90.
- Playwright smoke 全绿.
- S1-S23 全过.
- 浏览器控制台无 CSP 违规.

## 3. 阶段间并行

单人开发, 物理无并行. 阶段内灵活:

- **Phase 1 内**: bug 修复 (XML / driveid / pdfjs) 与登录端点/守卫互不影响, 顺手切换.
- **Phase 2 内**: 文件组件 / 预览 / i18n / 暗色 / TextPad 大致独立, 先后顺序按个人偏好.

跨阶段严格顺序.

## 4. 系统性风险与全局缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| **JWT 签名失误** | 鉴权绕过 | `_shared/auth.ts` 单元测试强制覆盖; 集成测试覆盖 cookie 解析与 WebDAV 双重鉴权分流 |
| **WebDAV 改动引入回归** | 第三方客户端断连 | Phase 1 末手测 rclone 一次; Phase 3 末再测一次 |
| **bundle 失控** | UI 慢 | Phase 2 末 `npm run build -- --analyze` 看 chunk; 关注 pdfjs / Shiki |
| **i18n 提取漏 + 暗色样式覆盖漏** | 二者作"末轮一次性清"代价高 | Phase 2 末 ESLint 规则强制扫一遍 |
| **CSP 配后某资源突然 404** | 上线后才发现 | Phase 3 CSP 开启后 Playwright 全路径扫一遍 |

## 5. 不在本计划内 (按 SPEC §1 / §7 边界)

- 多用户、用户管理、应用令牌、可吊销凭据.
- D1 / KV / 任何新数据库.
- 回收站、公开分享链接、审计日志、存储看板.
- 服务端递归搜索.
- 键盘快捷键.
- PWA / 原生 App.
- 视频 Range 拖拽支持.
- Markdown 在线渲染编辑增强.

## 6. 评审请求

请确认以下点, 通过后进 Phase 3 (Tasks 拆分):

1. 3 阶段顺序与依赖图是否合理?
2. 每阶段验证关清单是否覆盖足?
3. R1.2 (WebDAV `[[path]].ts` 单 commit 改完) 这个工程纪律你接受?
4. R2.1 (移动端 Dialog 切 Sheet) 接受?
5. 估时 (~4 天) 量级是否符合预期?
