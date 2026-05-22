# Spec: FlareDrive 二次开发 — Scope B (单口令 + UI 现代化)

> 与 [CONTEXT.md](./CONTEXT.md) 和 [docs/adr/](./docs/adr/) 共同构成项目契约. 术语以 CONTEXT.md 为准, 不可逆架构决策见 ADR (当前生效 ADR-0003, 取代 ADR-0001 / 0002).

## 1. Objective

### 我们在建什么

在保持 FlareDrive 原有 WebDAV 协议能力与现有部署体验的前提下做三件事:

1. **修缺陷** — 上手地图标记的 6 项安全/正确性 bug (Basic auth 时序攻击、PROPFIND XML 转义、`driveid` 多桶后门、cdnjs pdf.js、根目录死代码、`utils/s3.ts`、README 阈值文档).
2. **UI 现代化** — 把现有 CRA + MUI v5 的桌面端 UI 重写为基于 shadcn/ui + Tailwind 的响应式 SPA, 覆盖桌面/平板/移动浏览器, 含暗色模式、中/英 i18n、图片/视频/PDF 在线预览.
3. **登录页替换 Basic 弹窗** — 用自定义登录页 + JWT cookie 会话取代浏览器原生 Basic auth 弹窗 UX, 同时 WebDAV 协议层继续接受 Basic auth (双重鉴权), 保证第三方客户端零重配.

### 用户

- **所有者 (Owner)** — 部署者本人. 主要通过第三方 WebDAV 客户端 (rclone / 手机文件管理器 / NAS) 做日常文件操作; 用 Web UI 偶尔浏览、上传、预览.
- **公共读取者 (Public reader)** — 仅当 `WEBDAV_PUBLIC_READ=1` 时存在.

### 成功定义

见 §8. 所有条目可被自动化或手工复现验证.

## 2. Tech Stack

| 类别 | 选型 | 版本 | 说明 |
|---|---|---|---|
| 部署平台 | Cloudflare Pages | — | Pages Functions 自动发现 |
| 文件存储 | Cloudflare R2 | — | binding `BUCKET` 不变 |
| 鉴权数据 | 环境变量 + JWT cookie | — | **不引入** D1/KV |
| 前端框架 | React | 18.x | 不升 19 |
| 构建工具 | Vite | ^7 | 替换 CRA |
| 路由 | React Router | ^7 | |
| 类型系统 | TypeScript | ^5.5 | strict |
| 样式 | Tailwind CSS | ^3.4 | |
| 组件库 | shadcn/ui | latest | 复制进 `src/components/ui/` |
| 状态/数据 | TanStack Query | ^5 | |
| 表单 | react-hook-form + zod | ^7 / ^3 | |
| i18n | react-i18next | ^14 | 中文默认 |
| 暗色模式 | 手写 (prefers-color-scheme + localStorage) + Tailwind `dark:` | — | 不装 next-themes |
| PDF 预览 | `pdfjs-dist` | latest | 本地 npm 包替代 cdnjs |
| 代码高亮 (预览) | Shiki | latest | lazy import |
| JWT | `hono/jwt` 或 `jose` | — | 仅用工具函数, 不引入 Hono 框架 |
| 测试 (单元) | Vitest + RTL | latest | |
| 测试 (E2E) | Playwright | latest | 仅核心闭环 |
| Lint | ESLint 9 flat | latest | |
| 格式化 | Prettier | latest | 单引号/无分号/Tab 宽 2 |
| 包管理 | npm | Node 20 LTS+ | |
| 工具链 | wrangler | latest | 仅本地 Pages dev, 不用 D1 命令 |

## 3. Commands

| 命令 | 用途 |
|---|---|
| `npm install` | 装依赖 |
| `npm run dev` | Vite 前端开发服务器 |
| `npm run pages:dev` | `wrangler pages dev` 全栈本地 |
| `npm run build` | Vite 构建 → `dist/` |
| `npm run preview` | 预览构建产物 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run test` / `test:watch` | Vitest |
| `npm run test:e2e` | Playwright |

提交前必跑: `npm run typecheck && npm run lint && npm run test`.

## 4. Project Structure

```
/
├── CONTEXT.md
├── SPEC.md
├── PLAN.md
├── TASKS.md
├── README.md                   # Phase 3 末重写
├── LICENSE
├── docs/adr/
│   ├── 0001-...md (Superseded)
│   ├── 0002-...md (Superseded)
│   └── 0003-simplify-to-single-credential-jwt-cookie.md (Active)
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
│   ├── api/                    # 3 个独立 Pages Function 文件
│   │   ├── login.ts            # POST /api/login
│   │   ├── logout.ts           # POST /api/logout
│   │   └── me.ts               # GET /api/me
│   └── _shared/
│       ├── auth.ts             # 常量时间比较 / JWT 签发与验签
│       └── xml.ts              # PROPFIND 转义
├── src/                        # 前端 (Vite)
│   ├── main.tsx
│   ├── App.tsx                 # 路由
│   ├── components/
│   │   ├── ui/                 # shadcn 原语
│   │   ├── files/              # 文件网格/列表、面包屑、预览
│   │   ├── upload/             # 上传抽屉、进度条
│   │   ├── textpad/            # TextPad 重写
│   │   └── layout/             # AppShell / Header / Sidebar
│   ├── pages/
│   │   ├── login.tsx
│   │   ├── files.tsx           # 主视图 (/ 与 /files/*)
│   │   └── settings.tsx        # 语言 / 主题
│   ├── lib/
│   │   ├── api.ts              # /api/* 客户端
│   │   ├── webdav.ts           # PROPFIND 解析 / multipart 上传
│   │   ├── i18n.ts
│   │   ├── theme.ts
│   │   └── utils.ts
│   ├── hooks/
│   ├── locales/{zh,en}.json
│   └── styles/globals.css
├── tests/{unit,integration}/
├── e2e/
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── eslint.config.js
├── .prettierrc
├── playwright.config.ts
├── vitest.config.ts
├── wrangler.toml               # 仅 BUCKET binding, 无 D1
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

### 前端示例

```tsx
import { useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { listFiles } from '@/lib/api'
import { cn, formatBytes } from '@/lib/utils'

interface FileGridProps {
  path: string
  selection: Set<string>
  onSelectionChange: (next: Set<string>) => void
  className?: string
}

export function FileGrid({ path, selection, onSelectionChange, className }: FileGridProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['files', path],
    queryFn: () => listFiles(path),
  })
  if (isLoading) return <FileGridSkeleton />
  return (
    <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6', className)}>
      {data?.map((file) => (
        <FileCard key={file.key} file={file} selected={selection.has(file.key)} />
      ))}
    </div>
  )
}
```

### 后端示例

```ts
// functions/api/login.ts
import { verifyCredentials, signSessionJwt } from '@functions/_shared/auth'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { username, password } = await ctx.request.json<{ username: string; password: string }>()
  if (!verifyCredentials(username, password, ctx.env)) {
    return new Response(JSON.stringify({ error: 'invalid_credentials' }), { status: 401 })
  }
  const token = await signSessionJwt(ctx.env.WEBDAV_PASSWORD, { sub: 'owner' })
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `fd_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`,
    },
  })
}
```

## 6. Testing Strategy

### 三层

1. **Unit (Vitest)** — `tests/unit/`. 纯函数: 常量时间比较、JWT 签发验签、XML 转义.
2. **Integration (Vitest + miniflare)** — `tests/integration/`. 本地 Pages Functions 全链路, 含 /api/login → /api/me, /webdav/ 的双重鉴权.
3. **E2E (Playwright)** — `e2e/`. 仅核心闭环: 登录 → 上传 → 预览 → 重命名 → 删除 → 注销. 桌面 chromium 一种.

### 覆盖

- 必须有: `_shared/auth.ts`, `_shared/xml.ts`, multipart 上传切片逻辑.
- 不强求行覆盖率%, 关键路径绿就行.
- 不为 UI 组件写单元 (留给 E2E).

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
- 新增 `/api/*` 端点 (目前只 3 个, 多了要重评估是否上 Hono).
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
- **S2**: `/login` 表单输入正确 `WEBDAV_USERNAME` + `WEBDAV_PASSWORD` 后, 重定向到 `/`, 浏览器持有 `fd_session` HttpOnly cookie.
- **S3**: 在 Cloudflare 仪表盘修改 `WEBDAV_PASSWORD` 并重新部署后, 持原 cookie 的浏览器下次请求被踢回 `/login` (JWT 签名验证失败).
- **S4**: `curl -u user:pass https://.../webdav/` 仍可成功 (Basic auth 协议层未受影响).
- **S5**: Basic auth 比较用常量时间, 不再有原 `===` 字符串等值的时序差异.

### 协议正确性
- **S6**: PROPFIND 响应中含 `<>&"'` 等特殊字符的文件名经 XML parser 解析后等于原始字符串.
- **S7**: 不同子域 (`a.example.com` / `b.example.com`) 访问命中同一 R2 桶 (driveid 后门已移除).
- **S8**: 浏览器 Network 面板看不到 cdnjs 请求, PDF 缩略图/预览仍工作.
- **S9**: README 中文件大小阈值与代码 `SIZE_LIMIT` 一致 (100 MB).

### 文件 UI
- **S10**: 上传 1MB / 99MB / 200MB 文件成功 (multipart 在 100MB 阈值切换).
- **S11**: 删除文件直接调 R2 delete, 不进任何回收站 (本期不做回收站).
- **S12**: 客户端搜索仅过滤当前目录, 跨目录搜索不支持 (与现状一致).
- **S13**: 缩略图: jpg/png/gif/webp/mp4/pdf 生成, 其它显默认 mime 图标.
- **S14**: 在线预览: 图片 (`<img>`), 视频 (`<video>` 整文件加载), 音频 (`<audio>`), PDF (本地 pdfjs), 文本 < 2MB (`<pre>`), 代码 (Shiki lazy). 其它显"请下载"提示.

### 多端与体验
- **S15**: 视口 375 × 667 至 1920 × 1080 之间, 主视图无横向滚动、文字不溢出、按钮可触.
- **S16**: 暗色模式开关切换后立即生效, 刷新后保留. 系统级 `prefers-color-scheme` 在用户未显式设定时遵守.
- **S17**: 语言切换 (中/英) 后所有可见文本立即更换, 无遗漏硬编码英文.
- **S18**: TextPad 入口存在, 可创建/编辑/保存 .txt / .md 文件 (体验不弱于现有版本).

### 代码质量
- **S19**: Vite 构建初始 bundle ≤ 500 KB (gzipped).
- **S20**: `npm run typecheck` / `lint` / `test` 全绿.
- **S21**: `npm run test:e2e` 核心闭环全绿.
- **S22**: 根目录 `Main.tsx` / `TextPadDrawer.tsx` / `utils/s3.ts` 已删, `grep -rn '@mui\|react-scripts' .` 仅命中 `package-lock.json` 历史.
- **S23**: Lighthouse (生产部署, 桌面 viewport) Performance ≥ 90, Accessibility ≥ 90.

## 9. Open Questions

- **OQ-1 — JWT 库选型**: `hono/jwt` (轻) vs `jose` (功能全). 实施时按 bundle 占用决定, 不影响 Success Criteria.
- **OQ-2 — `pdfjs-dist` bundle 实际尺寸**: Vite tree-shake 后若 > 1 MB (gzip), 走 lazy load worker. 不影响验收.
- **OQ-3 — iOS Safari 拖拽上传兼容性**: 部分 iOS 版本不支持 HTML5 拖拽, 需点选按钮兜底. Phase 2 实测后定 fallback 形态.
- **OQ-4 — multipart 中断的孤儿 part 清理**: R2 自动会清吗? Phase 2 实测后定, 不归类为 bug.
- **OQ-5 — 在线预览的 `<video>` 大视频体验**: 不做 Range 支持, 拖拽进度条会重新下载. 单用户场景判断可接受, 若用户反馈差再单独评估.

---

> 文档收口于 2026-05-22 (Scope B 锁定). 实施期若发生与本 spec 冲突的决策, **先更新本 spec, 再写代码**.
