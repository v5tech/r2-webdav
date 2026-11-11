# Spec: FlareDrive 二次开发 — Scope B (单口令 + UI 现代化)

> 与 [CONTEXT.md](./CONTEXT.md) 和 [docs/adr/](./docs/adr/) 共同构成项目契约. 术语以 CONTEXT.md 为准, 不可逆架构决策见 ADR. ADR-0003 的会话命名与范围判断分别由 [ADR-0005](./docs/adr/0005-rename-session-cookie-to-r2-session.md) / [ADR-0006](./docs/adr/0006-include-trash-in-scope-b.md) 修订.

## 1. Objective

### 我们在建什么

在保持 FlareDrive 原有 WebDAV 协议能力与现有部署体验的前提下做四件事:

1. **修缺陷** — 上手地图标记的 6 项安全/正确性 bug (Basic auth 时序攻击、PROPFIND XML 转义、`driveid` 多桶后门、cdnjs pdf.js、根目录死代码、`utils/s3.ts`、README 阈值文档).
2. **UI 现代化** — 把现有 CRA + MUI v5 的桌面端 UI 重写为基于 shadcn/ui + Tailwind 的响应式 SPA, 覆盖桌面/平板/移动浏览器, 含暗色模式、中/英 i18n、图片/视频/PDF 在线预览.
3. **登录页替换 Basic 弹窗** — 用自定义登录页 + JWT cookie 会话取代浏览器原生 Basic auth 弹窗 UX, 同时 WebDAV 协议层继续接受 Basic auth (双重鉴权), 保证第三方客户端零重配.
4. **回收站** — DELETE 软删除到内部命名空间, 14 天保留, 支持查看/恢复/彻底删除; 见 [ADR-0006](./docs/adr/0006-include-trash-in-scope-b.md).

### 用户

- **所有者 (Owner)** — 部署者本人. 主要通过第三方 WebDAV 客户端 (rclone / 手机文件管理器 / NAS) 做日常文件操作; 用 Web UI 偶尔浏览、上传、预览.
- **公共读取者 (Public reader)** — 仅当 `WEBDAV_PUBLIC_READ=1` 时存在.

### Scope B 范围 (2026-05-22 锁定; 回收站于 2026-11-10 纳入, 见 ADR-0006)

#### 在范围内

- 修复上手地图中识别出的安全/正确性缺陷 (Basic auth 时序攻击、PROPFIND XML 转义、`driveid` 后门、cdnjs pdf.js、根目录死代码、`utils/s3.ts` 死代码、README 阈值文档).
- 构建工具现代化 (CRA → Vite).
- UI 全面重做于 shadcn/ui + Tailwind, 桌面/平板/移动响应式.
- 自定义登录页 + JWT cookie 会话, 替代浏览器 Basic auth 弹窗.
- WebDAV `/webdav/*` 双重鉴权 (cookie 或 Basic auth 二选一通过).
- 文件操作功能集 (与现有持平 + 在线预览): 浏览/上传/下载/重命名/移动/删除/多选批操作/缩略图.
- 回收站 (软删除 + 还原): DELETE 软删除到内部命名空间, 14 天保留, 机会式清理; 见 ADR-0006.
- 在线预览 (图片/视频/PDF).
- 文本笔记 (TextPad, 保留).
- 暗色模式.
- 国际化骨架 (中/英).

#### 不在范围内

- 多用户、用户管理界面、逐用户配额.
- 应用令牌 / 可吊销凭据 / 多客户端独立凭据.
- D1 / KV / 任何新数据库依赖.
- 公开分享链接 (细粒度文件分享).
- 审计日志.
- 存储占用看板.
- 键盘快捷键.
- 登录失败 rate limit (默认不做; 若需可在 Cloudflare 仪表盘 Rate Limiting Rules 配置).
- 服务端递归搜索 (保留现状: 客户端当前目录过滤).
- 服务端 WebDAV 协议扩展.
- Markdown 在线编辑增强、WebDAV 配置向导.
- 计费、移动端原生 App、PWA 离线、Electron/Tauri 桌面壳.
- 打 zip 下载、跨目录批量移动、文件版本历史.

### 成功定义

见 §8. 所有条目可被自动化或手工复现验证.

## 2. Tech Stack

| 类别            | 选型                                                          | 版本         | 说明                                                                                                             |
| --------------- | ------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| 部署平台        | Cloudflare Pages                                              | —            | Pages Functions 自动发现                                                                                         |
| 文件存储        | Cloudflare R2                                                 | —            | binding `BUCKET` 不变                                                                                            |
| 鉴权数据        | 环境变量 + JWT cookie                                         | —            | **不引入** D1/KV                                                                                                 |
| 前端框架        | React                                                         | 19.x         | 当前主版本                                                                                                       |
| 构建工具        | Vite                                                          | ^8           | 替换 CRA                                                                                                         |
| 路由            | React Router                                                  | ^7           |                                                                                                                  |
| 类型系统        | TypeScript                                                    | ^6           | strict                                                                                                           |
| 样式            | Tailwind CSS                                                  | ^4           | 现代浏览器底线: Safari 16.4+ / Chrome 111+ / Firefox 128+ (ADR-0004)                                             |
| 组件库          | shadcn/ui                                                     | 4.x          | 复制进 `src/components/ui/`; new-york style; `shadcn` 装为本地 dep (`shadcn/tailwind.css` 提供 data-\* variants) |
| 状态/数据       | TanStack Query                                                | ^5           |                                                                                                                  |
| 表单            | react-hook-form + zod                                         | ^7 / ^4      |                                                                                                                  |
| i18n            | react-i18next                                                 | ^17          | 中文默认                                                                                                         |
| 暗色模式        | 手写 (prefers-color-scheme + localStorage) + Tailwind `dark:` | —            | 不装 next-themes                                                                                                 |
| PDF 预览        | `pdfjs-dist`                                                  | latest       | 本地 npm 包替代 cdnjs                                                                                            |
| 代码高亮 (预览) | Shiki                                                         | latest       | lazy import                                                                                                      |
| JWT             | Web Crypto API                                                | —            | 使用现有签发/验签工具函数, 不引入额外 JWT 库                                                                     |
| 测试 (单元)     | Vitest + RTL                                                  | latest       |                                                                                                                  |
| 测试 (E2E)      | Chrome DevTools MCP / agent-browser                           | —            | agent 即时驱动真实浏览器 (CDP), 不维护 spec 文件                                                                 |
| Lint            | ESLint 9 flat                                                 | latest       |                                                                                                                  |
| 格式化          | Prettier                                                      | latest       | 单引号/无分号/Tab 宽 2                                                                                           |
| 包管理          | npm                                                           | Node 20 LTS+ |                                                                                                                  |
| 工具链          | wrangler                                                      | latest       | 仅本地 Pages dev, 不用 D1 命令                                                                                   |

## 3. Commands

| 命令                              | 用途                          |
| --------------------------------- | ----------------------------- |
| `npm install`                     | 装依赖                        |
| `npm run dev`                     | Vite 前端开发服务器           |
| `npx wrangler pages dev dist --r2 BUCKET` | 全栈本地调试 (Workflow C) |
| `npm run build`                   | Vite 构建 → `dist/`           |
| `npm run preview`                 | 预览构建产物                  |
| `npm run typecheck`               | `tsc --noEmit`                |
| `npm run lint` / `lint:fix`       | ESLint                        |
| `npm run format` / `format:check` | Prettier                      |
| `npm run test` / `test:watch`     | Vitest                        |

提交前必跑: `npm run typecheck && npm run lint && npm run test`.

## 4. Project Structure

```
/
├── CONTEXT.md
├── SPEC.md
├── README.md                   # 英文入口
├── README.zh.md                # 中文入口
├── LICENSE
├── docs/adr/
│   ├── 0001-...md (Superseded)
│   ├── 0002-...md (Superseded)
│   ├── 0003-simplify-to-single-credential-jwt-cookie.md (Active)
│   ├── 0004-tailwind-v4-shadcn-4.md (Active)
│   ├── 0005-rename-session-cookie-to-r2-session.md (Active)
│   ├── 0006-include-trash-in-scope-b.md (Active)
│   └── 0007-delete-failure-status-semantics.md (Active)
├── functions/                  # Cloudflare Pages Functions
│   ├── webdav/                 # WebDAV 协议层, 现有保留
│   │   ├── [[path]].ts         # 入口 + 双重鉴权 (cookie or Basic)
│   │   ├── propfind.ts
│   │   ├── put.ts
│   │   ├── post.ts
│   │   ├── get.ts
│   │   ├── head.ts
│   │   ├── mkcol.ts
│   │   ├── copy.ts
│   │   ├── move.ts
│   │   ├── delete.ts
│   │   └── utils.ts            # 去 driveid 后门
│   ├── api/                    # 4 个独立 Pages Function 文件
│   │   ├── login.ts            # POST /api/login
│   │   ├── logout.ts           # POST /api/logout
│   │   ├── me.ts               # GET /api/me
│   │   └── trash.ts            # GET/POST/DELETE /api/trash
│   └── _shared/
│       ├── auth.ts             # 常量时间比较 / JWT 签发与验签
│       ├── r2.ts               # 内部命名空间前缀 / listAll
│       ├── trash.ts            # 14 天 TTL / 机会式清理
│       └── xml.ts              # PROPFIND 转义
├── src/                        # 前端 (Vite)
│   ├── main.tsx
│   ├── App.tsx                 # 路由
│   ├── components/
│   │   ├── ui/                 # shadcn 原语
│   │   ├── files/              # 文件网格/列表、面包屑与上传
│   │   ├── preview/            # 图片、PDF、文本等预览
│   │   ├── textpad/            # TextPad 重写
│   │   └── layout/             # AppShell / Header / Sidebar
│   ├── pages/
│   │   ├── login.tsx
│   │   ├── files.tsx           # 主视图 (/ 与 /files/*)
│   │   ├── settings.tsx        # 语言 / 主题
│   │   └── trash.tsx           # 回收站 (/trash)
│   ├── lib/
│   │   ├── api.ts              # /api/* 客户端
│   │   ├── webdav.ts           # PROPFIND 解析 / multipart 上传
│   │   ├── trash.ts            # 回收站 API 客户端
│   │   ├── i18n.ts
│   │   ├── theme.ts
│   │   └── utils.ts
│   ├── hooks/
│   ├── locales/{zh,en}.json
│   └── styles/globals.css
├── tests/unit/                 # Vitest 单元与组件测试
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
├── .prettierrc
├── vitest.config.ts
├── wrangler.toml.example       # BUCKET binding 模板, 无 D1
├── package.json
└── package-lock.json
```

路径别名: `@/*` → `src/*`.

**待删** (Phase 0):

- `/Main.tsx`, `/TextPadDrawer.tsx` (根目录死代码)
- `/utils/s3.ts`
- 全部 `react-scripts` 配置

## 5. Code Style

- **TypeScript strict**, 禁 `any`.
- **命名**: camelCase / PascalCase / SCREAMING_SNAKE_CASE; 组件文件 PascalCase, 其它 kebab-case.
- **导入顺序**: 标准库 → 第三方 → `@/*` → 相对路径. ESLint 排序.
- **不写防御代码** — 边界 (HTTP/外部) 处用 zod 校验, 内部信任契约.
- **错误处理** — 抛 Error 子类带上下文, 边界统一映射为 JSON.
- **不留死代码** — 同次改动产物的废代码同步删.

## 6. Testing Strategy

### 两层

1. **Unit / Component (Vitest + RTL)** — `tests/unit/`. 覆盖纯函数、鉴权工具、WebDAV 工具、React 组件和页面行为.
2. **Browser E2E (agent-browser / CDP)** — 不维护 spec 文件. 使用本地 mock 做核心闭环与响应式验收; 生产只做只读复查. 截图和日志保存在仓库外并脱敏, 不纳入 Git.

### 覆盖

- 必须有: `_shared/auth.ts`, `_shared/xml.ts`, multipart 上传切片逻辑.
- 关键 UI 组件和页面行为也需要单元测试, 不能只依赖浏览器验收.
- 不强求行覆盖率%, 关键路径和回归场景必须可重复验证.

## 7. Boundaries

### 总是 (Always)

- 提交前跑 `typecheck && lint && test`.
- 凭据比较用常量时间.
- 任何 WebDAV verb handler 加进 `functions/webdav/` 时同步考虑双重鉴权适用性.
- 引入新领域术语 → 更新 CONTEXT.md.
- 做出难逆架构决策 → 写 ADR.
- 所有用户数据进 PROPFIND XML 之前必经 `escapeXml()`.

### 先问 (Ask First)

- 新增 npm 依赖.
- 新增环境变量或 binding (含 D1/KV — 当前明确不引入).
- 新增 `/api/*` 端点 (默认保持裸 Pages Functions; 仅当端点数 > 5 时重评估是否引入 Hono, 默认答案是不引入. 见 ADR-0002 已废止决策与 ADR-0003 §决策第 5 条).
- 修改 WebDAV 协议层语义.
- 接入第三方服务.
- 引入 GitHub Actions CI.

### 永不 (Never)

- 提交密钥到 git.
- 跳 git hooks.
- 在日志/错误响应/URL 中暴露完整 JWT 或 cookie 值.
- 引入外链 CDN 脚本 (CSP 不允许).
- 在 `functions/webdav/*` 里加 JSON 业务端点; 在 `functions/api/*` 里加 WebDAV verb.
- 在 PROPFIND 响应里输出未转义的用户数据.
- 把 `WEBDAV_PASSWORD` 明文写入任何持久化或日志.
- 把 JWT secret 写成独立 env var (必须从 `WEBDAV_PASSWORD` 派生, 维持"改密码即全失效"性质).

## 8. Success Criteria

### 部署与鉴权

- **S1**: 全新部署后, 访问任意非 `/login` 路径自动跳 `/login`.
- **S2**: `/login` 表单输入正确 `WEBDAV_USERNAME` + `WEBDAV_PASSWORD` 后, 重定向到 `/`, 浏览器持有 `r2_session` HttpOnly cookie. cookie 内 JWT payload 含 `sub=owner` + `iss=<origin>` + `iat` + `exp`.
- **S3**: 在 Cloudflare 仪表盘修改 `WEBDAV_PASSWORD` 并重新部署后, 持原 cookie 的浏览器下次请求被踢回 `/login` (JWT 签名验证失败, **不回退 Basic**).
- **S4**: `curl -u user:pass https://.../webdav/` 仍可成功 (Basic auth 协议层未受影响).
- **S5**: Basic auth 比较用常量时间, 不再有原 `===` 字符串等值的时序差异.
- **S25**: 请求同时携带**有效 cookie** + **错误 Basic header** → 响应 200 (cookie 优先生效).
- **S26**: 请求携带**过期/无效 cookie** + **无 Basic header** → 响应 401, 不回退到 Basic 鉴权 (不下发 `WWW-Authenticate: Basic`), 浏览器应跳 `/login`.
- **S27**: 改 `WEBDAV_PASSWORD` env var 重新部署后, 第三方 WebDAV 客户端**只需在其配置中把密码字段换为新值**即可继续工作, 无需重装/重配其它任何参数.

### 协议正确性

- **S6**: PROPFIND 响应中含 `<>&"'` 等特殊字符的文件名经 XML parser 解析后等于原始字符串.
- **S7**: 不同子域 (`a.example.com` / `b.example.com`) 访问命中同一 R2 桶 (driveid 后门已移除).
- **S8**: 浏览器 Network 面板看不到 cdnjs 请求, PDF 缩略图/预览仍工作.
- **S9**: README 中文件大小阈值与代码 `SIZE_LIMIT` 一致 (100 MB).
- **S24**: rclone v1.65+ 将端点配置为 `webdav` remote 后, `rclone copy local.txt remote:/` 与 `rclone ls remote:/` 双向成功; 同样对 BD File Manager (Android) 或 Cx File Explorer 任选其一手测一次通过.

### 文件 UI

- **S10**: 上传 1MB / 99MB / 200MB 文件成功 (multipart 在 100MB 阈值切换).
- **S11**: DELETE 为软删除: 对象先复制到 `_$r2webdav$/trash/<timestamp>/`, 保留 14 天; `/trash` 支持查看/恢复/彻底删除; 过期条目在后续 DELETE 请求中按约 10% 概率清理 (ADR-0006). 单文件或集合目标自身失败返回 500; 集合成员部分失败返回 207 Multi-Status (ADR-0007).
- **S12**: 客户端搜索仅过滤当前目录, 跨目录搜索不支持 (与现状一致).
- **S13**: 缩略图: jpg/png/gif/webp/mp4/pdf 生成, 其它显默认 mime 图标.
- **S14**: 在线预览: 图片 (`<img>`), 视频 (`<video>` 整文件加载), 音频 (`<audio>`), PDF (本地 pdfjs), 文本 ≤ 1 MB (`<pre>`), 代码 (Shiki lazy). 其它显"请下载"提示.

### 多端与体验

- **S16**: 暗色模式开关切换后立即生效, 刷新后保留. 系统级 `prefers-color-scheme` 在用户未显式设定时遵守.
- **S17**: 语言切换 (中/英) 后所有可见文本立即更换, 无遗漏硬编码英文.
- **S18**: TextPad 分别新建 `.md` 与 `.txt` 文件各一份, 内容含中英文混排 + 特殊字符 (`<`, `>`, `&`, `'`, `"`, `\t`, 换行); 保存上传 → 关闭浏览器 → 重新打开预览; 内容与原输入字符级一致.

### 代码质量

- **S19**: Vite 构建初始 bundle ≤ 500 KB (gzipped).
- **S20**: `npm run typecheck` / `lint` / `test` 全绿.
- **S21**: 核心闭环全过 — agent 通过 Chrome DevTools MCP / agent-browser 连接本地真实浏览器, 在 `320` / `390` / `768` / `1280+` 宽度下分别跑同一闭环 (登录 → 上传 → 预览 → 重命名 → 删除 → 注销) 均通过; 各尺寸下均无横向滚动、无元素溢出; 截图与日志保存在仓库外并脱敏, 不纳入 Git.
- **S22**: 根目录 `Main.tsx` / `TextPadDrawer.tsx` / `utils/s3.ts` 已删, `grep -rn '@mui\|react-scripts' .` 仅命中 `package-lock.json` 历史.
- **S23**: Lighthouse (生产部署, 桌面 viewport) Performance ≥ 90, Accessibility ≥ 90.

## 9. Open Questions

原列问题均已有实现或明确边界: JWT 使用 Web Crypto API, PDF 按需加载, 上传按钮提供拖拽兜底, multipart 生命周期见 README, 视频 Range 支持仍不在范围内. 当前无额外开放问题.

---

> 文档收口于 2026-05-22 (Scope B 锁定). 2026-11-10 更新: 回收站纳入 Scope B ([ADR-0006](./docs/adr/0006-include-trash-in-scope-b.md)); 会话命名同步为 `r2_session` ([ADR-0005](./docs/adr/0005-rename-session-cookie-to-r2-session.md)). 实施期若发生与本 spec 冲突的决策, **先更新本 spec, 再写代码**.
