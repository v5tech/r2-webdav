# Plan: FlareDrive Scope B 实施计划

> 与 [SPEC.md](./SPEC.md) / [CONTEXT.md](./CONTEXT.md) 配对. 本文不重复需求, 只回答 "怎么按何顺序、怕什么、怎么知道走对了". 当前生效 ADR: 0003 (取代 0001/0002).

## 1. 组件依赖图

```
┌─────────────────────────────────────────────────────────┐
│   Phase 0 — 清债 & Vite 迁移 & Tailwind/shadcn 初始化     │
│   ~1.5 天                                                │
│   删死代码 · CRA→Vite · Tailwind+PostCSS · shadcn init   │
│   ESLint flat · Prettier · Vitest 骨架                  │
└──────────────────────┬──────────────────────────────────┘
                       │ 构建工具就位才能动 UI 与新端点
                       ▼
┌─────────────────────────────────────────────────────────┐
│   Phase 1 — Bug 修复 & 鉴权升级 (~1 天)                   │
│   常量时间 Basic · PROPFIND XML 转义 · driveid 去除       │
│   pdfjs 本地化 · README 阈值 · /api/login /logout /me     │
│   JWT 工具 (HMAC-SHA256, msg='fd_session_v1', iss=origin) │
│   WebDAV [[path]].ts 双重鉴权 · 登录页 + 路由守卫         │
└──────────────────────┬──────────────────────────────────┘
                       │ 鉴权打通才能在 UI 调用 API
                       ▼
┌─────────────────────────────────────────────────────────┐
│   Phase 2a — 布局 + 文件 CRUD + 上传 (~2 天)              │
│   AppShell 响应式 · Breadcrumb · 文件网格/列表 · 排序     │
│   上传抽屉 (复用 multipart) · 多选/批量 · 文件夹/重命名    │
│   客户端搜索 (当前目录过滤) · pages/files.tsx 组装         │
│   i18n / theme 基础设施铺设 (lint 规则就此开启)            │
└──────────────────────┬──────────────────────────────────┘
                       │ 主功能就位才做次级
                       ▼
┌─────────────────────────────────────────────────────────┐
│   Phase 2b — 预览 + TextPad + i18n + 暗色 (~1.5 天)        │
│   PreviewDialog (img/video/audio/pdf/text/code-lazy)     │
│   TextPad 重写 · Header 主题/语言切换 · i18n 全量清查      │
│   pages/settings.tsx · 删旧 MUI + 卸依赖                   │
│   Phase 2 末 CSP Report-Only 验证                          │
└──────────────────────┬──────────────────────────────────┘
                       │ 全部主功能就位才做收尾
                       ▼
┌─────────────────────────────────────────────────────────┐
│   Phase 3 — 收尾 (~1 天)                                  │
│   CSP enforce + safety headers · README 重写 (含 rate    │
│   limit 部署提示) · 本地开发文档 · Lighthouse · MCP 驱动  │
│   三尺寸冒烟 (截图存证) · rclone 真实回归 · S1-S27 验收    │
└─────────────────────────────────────────────────────────┘
```

**总估时**: ~6.5 天 (原 ~4 天乐观, 按 Architect 评审后修正).

## 2. 阶段细则

### Phase 0 — 清债 & Vite 迁移 & Tailwind/shadcn 初始化 (~1.5 天)

**目标**: 现代化脚手架, 保留既有 UI 可运行作回归基线.

**主要工作**:

- 删根目录 `Main.tsx`, `TextPadDrawer.tsx`, `utils/s3.ts`.
- 卸 `react-scripts`. 装 `vite` + `@vitejs/plugin-react` + Tailwind + autoprefixer + postcss. _(注: Phase 1 中段已升 Tailwind v4 + shadcn 4, 卸 autoprefixer/postcss/tailwindcss-animate, 装 `@tailwindcss/vite` + `tw-animate-css` + 本地 `shadcn` dep. 见 [ADR-0004](./docs/adr/0004-tailwind-v4-shadcn-4.md).)_
- `src/index.js` → `src/main.tsx` (`createRoot`).
- `index.html` 迁至仓库根.
- 装 shadcn (init), 生成 `components.json` + `src/lib/utils.ts` + `src/components/ui/`.
- ESLint 9 flat + Prettier + tsconfig (`@/*` alias).
- Vitest 骨架文件 (E2E 走 Chrome DevTools MCP / agent-browser, 不固化 spec).

**不做**:

- 不动 `functions/` 目录.
- 不引入 React Router (Phase 1 才需要).
- 不替换业务组件 (Phase 2 才做).

**验证关 ✅**:

- `npm run dev` 启动后浏览器看到既有 MUI UI.
- `npm run build` 产生 `dist/`, `wrangler pages dev dist` 部署预览可用.
- `npm run typecheck` / `lint` / `test` 全绿.

### Phase 1 — Bug 修复 & 鉴权升级 (~1 天)

**目标**: 修协议层缺陷; 上线自定义登录页 + JWT cookie 会话; WebDAV 双重鉴权.

**后端 (`functions/`)**:

- `_shared/auth.ts`:
  - `constantTimeEqual(a, b): boolean` — 等长 XOR 短路安全比较.
  - `verifyBasic(authHeader, env): boolean` — Basic auth 解码 + 常量时间比较, 替代 `[[path]].ts:65-69` 的 `===`.
  - `deriveSessionSecret(password): Promise<CryptoKey>` — `HMAC-SHA256(key = password, msg = "fd_session_v1")` 派生 256-bit 密钥. `msg` 是版本化常量, 未来若需"主动让全会话失效"可升 `v2`.
  - `signSessionJwt(env, payload, ttlSec): Promise<string>` — HS256, payload 含 `sub`/`iss`/`iat`/`exp`, `iss` 取请求 origin.
  - `verifySessionJwt(env, token, origin): Promise<payload | null>` — 校验签名 + `iss` 匹配当前 origin + 未过期.
  - `extractSession(request): string | null` — 从 cookie 提取 `fd_session`.
- `_shared/xml.ts`:
  - `escapeXml(s): string` — `& < > " '` 转义.
- `api/login.ts` — POST: 接 `{username, password}`, 校验, 签 JWT, set-cookie.
- `api/logout.ts` — POST: 清 cookie.
- `api/me.ts` — GET: 验 cookie, 返 `{ok}` 或 401.
- `webdav/[[path]].ts` 改造 (单 commit 完整改完):
  - 删原 env 字符串 `===` 比较.
  - 鉴权流程: 有 cookie → `verifySessionJwt` 通过则放行; **失败则直接 401 (不回退 Basic)**.
  - 无 cookie → 试 Basic; 通过则放行.
  - `WEBDAV_PUBLIC_READ=1` 短路**仅限 GET / HEAD / PROPFIND** 三个只读 verbs.
  - 全否则 401, 写操作不发 `WWW-Authenticate: Basic` (避免浏览器弹原生 Basic 框).
- `webdav/propfind.ts`:
  - 所有用户数据插值经 `escapeXml()`.
- `webdav/utils.ts`:
  - `parseBucketPath` 删 `env[driveid]` 分支与 hostname 解析.
- 前端引用调整: `src/app/transfer.ts` 内 `import('https://cdnjs...')` → `import * as pdfjs from 'pdfjs-dist'`. 装依赖. worker 路径用 `import.meta.url`.
- README: 修 "≥128MB" → "≥100 MB".

**前端 (`src/`)**:

- 装 `react-router-dom@^7`.
- `src/App.tsx` 增 BrowserRouter + 路由表: `/login`, `/`, `/files/*`. `/files/*` 暂渲染既有 MUI 主界面 (Phase 2a 替换).
- `src/pages/login.tsx` — shadcn 表单 (Input + Button + Card), `react-hook-form` + zod. 提交到 `/api/login`, 成功跳 `/`.
- `src/hooks/use-auth.ts` — 调 `/api/me` 判断登录态.
- `src/components/auth/RequireAuth.tsx` — 守卫, 未登录跳 `/login`.

**风险**:

- **R1.1**: JWT 实现细节出错 (HMAC key/msg 颠倒、`iss` 验证遗漏、时间窗) → 鉴权门洞. **缓解**: 单元测试覆盖 sign/verify 正反案例 (含 iss mismatch、过期、篡改); 集成测试覆盖 cookie 流.
- **R1.2**: WebDAV `[[path]].ts` 改造若回滚不干净, 出现"双套同时生效"或"全空"两种坏态. **缓解**: 该文件单 commit 一次性改完.
- **R1.3**: 前端老路径与新路由表打架, MUI 主界面突然渲染 404. **缓解**: 临时把老主界面挂到 `/files-legacy`, Phase 2a 替换时再切.
- **R1.4**: 本地复现"改密码 → JWT 失效"路径不直观. **缓解**: 在 `T1.15` 写一段操作步骤 — 修改 `.dev.vars` 的 `WEBDAV_PASSWORD` 后 kill+restart wrangler dev, 持原 cookie 调 `/api/me` 应 401.

**验证关 ✅**:

- 浏览器访问 `/` 跳 `/login`; 表单错误密码返红字; 正确登录跳 `/files-legacy` (老 UI), 浏览器持有 fd_session cookie. JWT 含 `iss` 等于 origin.
- 改 `.dev.vars` `WEBDAV_PASSWORD` 重启 wrangler dev 后旧 cookie 被踢 (验签失败 → 401, 不回退 Basic).
- `curl -u user:pass /webdav/` 200 列目录; 不带 auth 401 (写操作返 401 不发 `WWW-Authenticate`).
- 含特殊字符文件名的 PROPFIND 经 `xmllint` 解析通过.
- 不同子域命中同一桶.
- PDF 缩略图生成 Network 面板无 cdnjs.
- 单元测试 `_shared/auth.ts` 与 `_shared/xml.ts` 全绿.

### Phase 2a — 布局 + 文件 CRUD + 上传 (~2 天)

**目标**: 主功能闭环 (上传/浏览/CRUD/搜索) 在 shadcn 下跑通, 移动响应式达标.

**主要工作 (顺序)**:

- 装 TanStack Query / react-hook-form / zod / react-i18next / i18next-browser-languagedetector.
- `src/lib/`:
  - `api.ts` — `/api/*` 客户端 (fetch wrapper).
  - `webdav.ts` — 从 `src/app/transfer.ts` 迁出: PROPFIND 解析、multipart 上传、缩略图生成、各 verb 包装.
  - `i18n.ts` — react-i18next 初始化 + 语言检测. **同时开启 `eslint-plugin-i18next/no-literal-string` 规则**, 后续组件边写边抽, 避免 2b 末轮一次性回填.
  - `theme.ts` — 监听 prefers-color-scheme, 持久化偏好 (UI 切换按钮在 2b 接).
- `src/locales/zh.json` / `en.json` — 空骨架, 字符串边写边补.
- `src/components/layout/AppShell + Header + Sidebar` (响应式 sheet 切换).
- `src/components/files/`:
  - `Breadcrumb`, `FileGrid` / `FileList` + 视图切换, `SortControls`, `FileCard` / `FileRow` + 上下文菜单.
  - `NewFolderDialog`, `RenameDialog`.
  - `useFileSelection` + `SelectionToolbar` (批量删 / 批量下载).
  - `SearchBar` (复用既有客户端过滤).
- `src/components/upload/UploadDropZone` + `UploadDrawer` (复用 multipart).
- `src/pages/files.tsx` 组装.

**风险**:

- **R2a.1**: shadcn 组件在小屏 Dialog 全屏化问题. **缓解**: 用 shadcn `Sheet` 替代窄屏 Dialog.
- **R2a.2**: multipart 上传重构进度 XHR 与 Vite HMR 配合问题. **缓解**: `webdav.ts` 切片逻辑单元测试覆盖.

**验证关 ✅**:

- 375px / 768px / 1280px 三种视口下完成 "登录 → 上传 → 重命名 → 删除" 全流程, 无横向滚动.
- 上传 200MB 文件成功 (验证 multipart 仍工作).
- ESLint `no-literal-string` 全跑过 (所有可见字符串已接 `t()`).

### Phase 2b — 预览 + TextPad + i18n + 暗色 (~1.5 天)

**目标**: 收齐次级功能, 删旧 MUI, 阶段末跑一次 CSP Report-Only.

**主要工作 (顺序)**:

- `src/components/files/PreviewDialog` 骨架 + 类型分发.
- `src/components/files/preview/`:
  - `ImagePreview` / `VideoPreview` / `AudioPreview`.
  - `PdfPreview` (本地 pdfjs, 分页器).
  - `TextPreview` / `CodePreview` (Shiki lazy).
- `src/components/textpad/TextPadDrawer` 重写 (Sheet 形态).
- `src/components/layout/Header` 加主题/语言切换图标.
- 全量 i18n 字符串清查 (此时 lint 规则已开, 应零遗漏).
- `src/pages/settings.tsx`.
- 删 `src/Main.tsx` / `FileGrid.tsx` / `Header.tsx` / `UploadDrawer.tsx` / `MultiSelectToolbar.tsx` / `MimeIcon.tsx` / `ProgressDialog.tsx` / `TextPadDrawer.tsx` 等 MUI 旧件.
- `package.json` 卸 `@mui/*` + `@emotion/*`.
- 删 `/files-legacy` 路由.
- **CSP Report-Only 验证**: 临时在 `_headers` 加 `Content-Security-Policy-Report-Only: default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; worker-src 'self' blob:; script-src 'self' 'wasm-unsafe-eval'; ...`. agent 通过 MCP 跑 smoke + 翻预览/TextPad/切语言/切主题各一次, 控制台无 CSP 违规告警.

**风险**:

- **R2b.1**: i18n 提取仍有漏 (lint 规则有盲点, 如动态字符串拼接). **缓解**: 阶段末一次手动通读所有页面切英文眼检.
- **R2b.2**: Shiki bundle 失控. **缓解**: 强制 lazy import + 按文件后缀按需注册语言.
- **R2b.3**: pdfjs worker 在 CSP 下被拦. **缓解**: 此阶段就走 Report-Only 提前发现, Phase 3 切 enforce 时已知配置.

**验证关 ✅**:

- 图片/视频/音频/PDF/文本/代码各预览类型可用.
- 系统暗色 → 首次访问页面深色; 手动切浅色刷新仍浅色.
- 切英文 → 整界面英文; 切中文 → 全中文.
- TextPad 创建 → 编辑 (含中英文+特殊字符) → 保存 → 关浏览器重开 → 内容字符级一致.
- 旧 MUI 文件全删, `grep -r '@mui'` 仅 lockfile 历史.
- 浏览器控制台无 CSP-Report-Only 违规告警.

### Phase 3 — 收尾 (~1 天)

**目标**: 安全 header / 文档 / 性能 / 验收清单 / 真实回归.

**主要工作**:

- `_headers` 静态文件 (Pages 原生) 加 enforce 模式 CSP + 安全 header. 基线策略:
  ```
  Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; worker-src 'self' blob:; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  ```
- README 重写 (现代化部署步骤 + 自定义登录说明 + **可选: Cloudflare Rate Limiting Rules 配置指引**, 让部署者知道 login 端点没代码级 rate limit).
- `docs/development.md` — 本地开发指引 (`.dev.vars` 用法, wrangler pages dev, 改密码本地复现验证).
- Lighthouse 跑生产 URL, 修 Perf/A11y < 90 项.
- **MCP 三尺寸冒烟** — agent 通过 Chrome DevTools MCP / agent-browser 连接本地浏览器, 依次切换 viewport (`375x667` / `768x1024` / `1280x800`), 每个 viewport 跑完整闭环 (登录 → 上传 → 预览 → 重命名 → 删除 → 注销), 截图归档到 `docs/e2e-evidence/phase3-<viewport>.png`.
- **rclone 真实回归** (S24): 本地配 webdav remote 指向生产, `rclone copy` + `rclone ls` 双向通; **手机文件管理器 BD/Cx 任选一手测一次往返**.
- 手动跑 S1-S27 验收单, 每条标记结果.

**验证关 ✅**:

- Lighthouse Performance ≥ 90, Accessibility ≥ 90.
- MCP 三尺寸冒烟全过, 截图归档完整.
- rclone 真实回归通过.
- 手机文件管理器手测通过.
- S1-S27 全过.
- 浏览器控制台无 CSP enforce 违规.

## 3. 阶段间并行

单人开发, 物理无并行. 阶段内灵活:

- **Phase 1 内**: bug 修复 (XML / driveid / pdfjs) 与登录端点/守卫互不影响, 顺手切换.
- **Phase 2a 内**: 文件组件 / 上传 / 搜索 大致独立, 先后顺序按个人偏好.
- **Phase 2b 内**: 预览 / TextPad / i18n 清查 / 暗色 大致独立.

跨阶段严格顺序.

## 4. 系统性风险与全局缓解

| 风险                                           | 影响                       | 缓解                                                                                                                                  |
| ---------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **JWT 签名失误 (HMAC key/msg 颠倒、iss 漏验)** | 鉴权绕过                   | `_shared/auth.ts` 单元测试强制覆盖正反案例; 集成测试覆盖 cookie/Basic 双重鉴权分流; **`_shared/` 任何改动后 git hook 强制跑相关测试** |
| **WebDAV 改动引入回归**                        | 第三方客户端断连           | Phase 1 末手测 rclone 一次; Phase 3 末再测一次 (S24)                                                                                  |
| **bundle 失控**                                | UI 慢                      | Phase 2b 末 `npm run build -- --analyze` 看 chunk; 关注 pdfjs / Shiki                                                                 |
| **i18n 提取漏 + 暗色样式覆盖漏**               | 二者作"末轮一次性清"代价高 | **i18n lint 规则在 Phase 2a 一开始就开**, 边写边抽; 2b 末再人眼通读一次切英文眼检                                                     |
| **CSP 配后某资源突然 404**                     | 上线后才发现               | Phase 2b 末用 CSP-Report-Only 全路径验证, Phase 3 切 enforce 时已知配置                                                               |
| **登录端点无 rate limit**                      | 暴力破解                   | 本期不实现; README 显式提示部署者在 Cloudflare 仪表盘配 Rate Limiting Rules (建议: 同 IP /api/login POST 5 次/15 分钟即 30 分钟封禁)  |

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

本 PLAN 已经过 Software Architect 评审 (2026-05-22), 主要修订点已落地. 后续如发生与本 PLAN 冲突的实施决策, **先回来改 PLAN/SPEC, 再写代码**.
