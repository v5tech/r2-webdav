# Tasks: FlareDrive Scope B

> 与 [SPEC.md](./SPEC.md) / [PLAN.md](./PLAN.md) 配对. 每项含验收 (Acceptance) 与验证 (Verify), 顺序按依赖. 单项标准: ≤5 文件, 单坐次可完成.

任务编号: `T<Phase>.<Index>`. 全部约 46 条, 估时 ~6.5 天 (经 Architect 评审修订, 原 ~4 天乐观).

---

## Phase 0 — 清债 & Vite & Tailwind/shadcn (~1.5 天)

### T0.1 — 删根目录死代码

- **Acceptance**: `/Main.tsx` `/TextPadDrawer.tsx` `/utils/s3.ts` 不存在. `grep -rn '@aws-sdk\|aws4fetch\|S3Client' .` 零命中.
- **Verify**: `ls Main.tsx TextPadDrawer.tsx utils/s3.ts 2>&1` 全 No such file.
- **Files**: 3 (删除).

### T0.2 — 卸 CRA, 装 Vite + 配置

- **Acceptance**: `package.json` 移除 `react-scripts`, 新增 `vite` `@vitejs/plugin-react`. `vite.config.ts` 含 React 插件 + `@/*` alias. `index.html` 在仓库根.
- **Verify**: `npm install` 成功; `npm run build` 至少进入构建阶段.
- **Files**: 4.

### T0.3 — 入口与导入修正

- **Acceptance**: `src/index.js` → `src/main.tsx` (createRoot). 替换 CRA-only API. 静态资源导入合规.
- **Verify**: `npm run typecheck` 无 error; `npm run dev` 浏览器看到既有 UI.
- **Files**: ≤5.

### T0.4 — Tailwind + PostCSS

- **Acceptance**: `tailwind.config.ts` content 指向 `src/**`. `postcss.config.js`. `src/styles/globals.css` 三指令. main.tsx 导入.
- **Verify**: 临时给某组件加 `className="bg-red-500"` 渲染红色后回滚.
- **Files**: 4.

### T0.5 — shadcn 初始化

- **Acceptance**: `npx shadcn@latest init` 完成. `components.json` 存在. `src/lib/utils.ts` 含 `cn()`. `src/components/ui/` 已创建.
- **Verify**: `npx shadcn@latest add button` 后引入页面渲染正常, 回滚.
- **Files**: ~5.

### T0.6 — ESLint flat + Prettier

- **Acceptance**: `eslint.config.js` (flat) 含 typescript-eslint + react + react-hooks + import. `.prettierrc`: singleQuote / semi false / tabWidth 2. `package.json` 加 lint / format 脚本.
- **Verify**: `npm run lint` 无 error; `npm run format:check` 通过.
- **Files**: 3.

### T0.7 — Vitest 骨架

- **Acceptance**: `vitest.config.ts` 存在. `tests/unit/sanity.test.ts` 一个 trivial 测试. `package.json` 新增 `test` / `test:watch` 脚本. **不引入 Playwright** (E2E 走 Chrome DevTools MCP / agent-browser, 不固化 spec).
- **Verify**: `npm run test` 绿.
- **Files**: 3.

### T0.8 — Phase 0 集成烟测

- **Acceptance**: Vite dev 上跑既有 UI 闭环: 列目录 → 上传小文件 → 看缩略图 → 删除. 控制台无 fatal error.
- **Verify**: 手测; 截图保留作回归基线.
- **Files**: 0.

---

## Phase 1 — Bug 修复 & 鉴权升级 (~1 天)

### T1.1 — `_shared/auth.ts` 常量时间比较与 Basic 校验

- **Acceptance**: 导出 `constantTimeEqual(a, b): boolean` (XOR 短路安全) 与 `verifyBasic(authHeader, env): boolean` (Basic 解码 + 常量时间比对 `WEBDAV_USERNAME` `WEBDAV_PASSWORD`).
- **Verify**: 单元测试覆盖等长/不等长/空串/正确/错误.
- **Files**: 2.

### T1.2 — `_shared/auth.ts` JWT 工具

- **Acceptance**: 新增 `deriveSessionSecret(password)`, `signSessionJwt(env, payload, ttlSec)`, `verifySessionJwt(env, token, origin)`. HS256, 派生密钥公式 **`HMAC-SHA256(key = WEBDAV_PASSWORD, msg = "fd_session_v1")`**. JWT payload 含 `sub='owner'` / `iss=<origin>` / `iat` / `exp`. `extractSession(request)` 从 cookie 取 `fd_session`.
- **Verify**: 单元: sign → verify 圆桌通过; 过期 / 错签 / 篡改 token / iss mismatch 各返 null.
- **Files**: 2.

### T1.3 — `_shared/xml.ts` 转义函数

- **Acceptance**: `escapeXml(s)` 处理 `& < > " '` 与 unicode.
- **Verify**: 单元覆盖各特殊字符; `xmllint` 解析输出通过.
- **Files**: 2.

### T1.4 — PROPFIND XML 转义修复

- **Acceptance**: `functions/webdav/propfind.ts` 所有用户数据插值经 `escapeXml()`.
- **Verify**: 上传文件名 `a<b>"c'd&e.txt`, PROPFIND 响应 `xmllint --noout` 通过, displayname decode 后等于原名.
- **Files**: 1.

### T1.5 — 删 driveid 多桶后门

- **Acceptance**: `functions/webdav/utils.ts:parseBucketPath` 删 `env[driveid]` 分支与 hostname 解析, 永远返 `env.BUCKET`.
- **Verify**: 不同子域命中同一桶.
- **Files**: 1.

### T1.6 — pdfjs 切本地 npm 包

- **Acceptance**: `src/app/transfer.ts` 中 cdnjs 动态 import 改为 `import * as pdfjs from 'pdfjs-dist'`. worker 用 `import.meta.url`. 装依赖.
- **Verify**: 生成 PDF 缩略图浏览器 Network 无 cdnjs 请求.
- **Files**: 2.

### T1.7 — README 阈值文档

- **Acceptance**: README "≥128MB" → "≥100 MB", 与代码 `SIZE_LIMIT` 一致.
- **Verify**: `grep -n "128" README.md` 无误导描述.
- **Files**: 1.

### T1.8 — WebDAV `[[path]].ts` 双重鉴权改造

- **Acceptance**: 单 commit 完整改完. 删原 `===` 比较. 鉴权流程**严格按下列顺序**:
  1. 有 cookie 且 `verifySessionJwt(env, token, origin)` 通过 → 放行.
  2. **有 cookie 但验签失败 → 直接 401, 不回退 Basic** (减少攻击面; 浏览器侧由 RequireAuth 跳 `/login`).
  3. 无 cookie 且 `verifyBasic(authHeader, env)` 通过 → 放行.
  4. `WEBDAV_PUBLIC_READ === "1"` 且 method ∈ {GET, HEAD, PROPFIND} → 匿名放行. **写操作 (PUT/POST/DELETE/MOVE/COPY/MKCOL) 不享受此短路**.
  5. 全否 → 401. 写操作 401 时**不发 `WWW-Authenticate: Basic`** (避免浏览器弹原生 Basic 框, 与自定义登录页冲突).
- **Verify**: 用 curl 五条命令分别走五种路径, 状态码符合预期.
- **Files**: 1.

### T1.9 — `/api/login` 端点

- **Acceptance**: `functions/api/login.ts` POST: 解 JSON `{username, password}`, 调 `verifyBasic` 风格的明文比较, 通过则签 JWT 并 Set-Cookie `fd_session` (HttpOnly Secure SameSite=Lax Max-Age=604800).
- **Verify**: curl POST 正确密码返 200 + cookie; 错误密码返 401.
- **Files**: 1.

### T1.10 — `/api/logout` 端点

- **Acceptance**: `functions/api/logout.ts` POST: Set-Cookie 清除 (Max-Age=0).
- **Verify**: 调用后浏览器 cookie 消失.
- **Files**: 1.

### T1.11 — `/api/me` 端点

- **Acceptance**: `functions/api/me.ts` GET: 验 cookie JWT, 返 `{ok: true}` 或 401.
- **Verify**: 有效 cookie 返 200; 无 cookie 或 cookie 过期返 401.
- **Files**: 1.

### T1.12 — 装 React Router + 路由表

- **Acceptance**: 装 `react-router-dom@^7`. `App.tsx` 改 BrowserRouter, 路由表: `/login`, `/files-legacy` (临时挂老 UI), `/` 重定向到 `/files-legacy`.
- **Verify**: 浏览器分别访问 `/login` 与 `/files-legacy` 正确路由.
- **Files**: 2.

### T1.13 — Login 页 UI

- **Acceptance**: `src/pages/login.tsx` shadcn 表单 (Card + Input + Button), react-hook-form + zod 校验. 提交到 `/api/login`. 成功跳 `/`. 失败 toast.
- **Verify**: 浏览器手测正确/错误密码两条路径.
- **Files**: 1.

### T1.14 — `use-auth` hook + `RequireAuth` 守卫

- **Acceptance**: `src/hooks/use-auth.ts` 调 `/api/me`. `src/components/auth/RequireAuth.tsx` 守卫: 未登录跳 `/login`. 在路由表给 `/files-legacy` 套上.
- **Verify**: 清 cookie 后访问 `/files-legacy` 自动跳 `/login`.
- **Files**: 2.

### T1.15 — Phase 1 集成验证

- **Acceptance**: PLAN §2 Phase 1 "验证关" 全过.
- **Verify**:
  1. 手测 + 单元/集成测试全绿.
  2. **本地复现"改密码即 cookie 失效"**: 启动 `wrangler pages dev`, 用现行 `WEBDAV_PASSWORD` 登录拿到 cookie; 编辑 `.dev.vars` 把 `WEBDAV_PASSWORD` 换为新值; kill 并重启 wrangler dev; 持原 cookie 访问 `/api/me` 应返 401; `curl -u user:<旧密码>` 也应 401; `curl -u user:<新密码>` 200.
  3. **五状态码矩阵**: 按 T1.8 acceptance 五条路径分别 curl 验证.
- **Files**: 0.

---

## Phase 2a — 布局 + 文件 CRUD + 上传 (~2 天)

> 进入时细化, 此处概要:

- **T2a.1** 装依赖: TanStack Query v5, react-hook-form, zod, react-i18next, i18next-browser-languagedetector.
- **T2a.2** `lib/api.ts` — `/api/*` 客户端 (fetch wrapper + TanStack Query keys).
- **T2a.3** `lib/webdav.ts` — 从 `src/app/transfer.ts` 迁出 PROPFIND 解析 / multipart / 缩略图. _(注: 按增量策略实施 — T2a.3a 当前只迁 PROPFIND `fetchPath` + `FileItem` 类型 (`src/lib/types.ts`); multipart 留给 T2a.13, thumbnail/blobDigest 留给 T2a.13 或 T2a.10, copyPaste/createFolder 留给 T2a.11. `src/app/transfer.ts` 暂保留作 legacy backing, Phase 2b 删 MUI 时一并清.)_
- **T2a.4** `lib/i18n.ts` + `locales/zh.json` + `locales/en.json` 初版. **同步开启 ESLint `i18next/no-literal-string` 规则**, 后续组件边写边抽.
- **T2a.5** `lib/theme.ts` — prefers-color-scheme + localStorage 基础设施 (UI 切换按钮留到 2b).
- **T2a.6** `components/layout/AppShell` + `Header (无切换按钮)` + `Sidebar` (响应式 sheet 切换). 注: 此 task 涉及 3 组件 + 1 viewport hook, 接近 5 文件上限.
- **T2a.7** `components/files/Breadcrumb`.
- **T2a.8** `FileGrid` / `FileList` + 视图模式切换.
- **T2a.9** `SortControls`.
- **T2a.10** `FileCard` / `FileRow` + 上下文菜单.
- **T2a.11** `NewFolderDialog` / `RenameDialog`.
- **T2a.12** `useFileSelection` + `SelectionToolbar` (批量删/批量下载).
- **T2a.13** `UploadDropZone` + `UploadDrawer` (复用 multipart).
- **T2a.14** `SearchBar` (客户端当前目录过滤).
- **T2a.15** `pages/files.tsx` 组装.
- **T2a.16** Phase 2a 集成验证 — agent 通过 Chrome DevTools MCP 在三尺寸 (375 / 768 / 1280) 跑 "登录 → 上传 → 重命名 → 删除" 全过 (截图存 `docs/e2e-evidence/phase2a-<viewport>.png`); ESLint i18next 规则跑通.

---

## Phase 2b — 预览 + TextPad + i18n + 暗色 (~1.5 天)

> 进入时细化, 此处概要:

- **T2b.1** `PreviewDialog` 骨架 + 类型分发.
- **T2b.2** `ImagePreview` / `VideoPreview` / `AudioPreview`.
- **T2b.3** `PdfPreview` (本地 pdfjs, 分页器).
- **T2b.4** `TextPreview` / `CodePreview` (Shiki lazy import + 按文件后缀按需注册语言).
- **T2b.5** `components/textpad/TextPadDrawer` 重写 (Sheet 形态).
- **T2b.6** `Header` 加主题/语言切换图标按钮.
- **T2b.7** i18n 全量清查 (lint 规则在 2a 已开, 此处人眼通读所有页面切英文眼检漏抽).
- **T2b.8** `pages/settings.tsx` (语言 / 主题).
- **T2b.9** 删旧 MUI 组件 + 卸 `@mui/*` `@emotion/*` 依赖 + 删 `/files-legacy` 路由.
- **T2b.10** CSP Report-Only 验证 — 临时 `_headers` 加 `Content-Security-Policy-Report-Only`, agent 通过 MCP 跑 smoke + 预览/TextPad/切语言/切主题, 控制台无 CSP 违规告警 (截图归档).
- **T2b.11** Phase 2b 集成验证 (S14/S16/S17/S18 通过).

---

## Phase 3 — 收尾 (~1 天)

- **T3.1** `_headers` 文件 enforce 模式 (CSP + nosniff + Referrer-Policy + Permissions-Policy; CSP 含 `worker-src 'self' blob:` + `script-src 'self' 'wasm-unsafe-eval'`).
- **T3.2** README 重写 (现代化部署 + 登录 UX 说明 + **可选 rate limit 配置指引** 引导部署者去 Cloudflare 仪表盘加 Rate Limiting Rule).
- **T3.3** `docs/development.md` 本地开发指引 + `.dev.vars` 用法 + 改密码本地复现步骤.
- **T3.4** Lighthouse 跑 + 修 < 90 项.
- **T3.5** MCP 三尺寸冒烟 — agent 通过 Chrome DevTools MCP 连接本地浏览器, 依次切换 viewport (375x667 / 768x1024 / 1280x800), 每个 viewport 跑完整闭环 (登录 → 上传 → 预览 → 重命名 → 删除 → 注销), 截图归档到 `docs/e2e-evidence/phase3-<viewport>.png`, 三尺寸均无横向滚动/溢出.
- **T3.6** rclone 真实回归 + 手机文件管理器 (BD/Cx 任一) 真实手测 (S24).
- **T3.7** S1-S27 手动验收, 每条标记结果.

---

## 任务追踪

Phase 0 八条 (#1-#8) 已在任务追踪系统内, 依赖链锁定 (无变化). Phase 1 起进入时再批量登记.

实施期间, 若发现任务漏拆或顺序需调整, 优先**回来改本文件**, 再写代码.
