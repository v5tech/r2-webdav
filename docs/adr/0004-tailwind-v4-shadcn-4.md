# ADR-0004 — Phase 1 中段升级到 Tailwind v4 + shadcn 4

- **日期**: 2026-05-23
- **状态**: 已接受
- **修订**: [SPEC.md](../../SPEC.md) §技术选型 `Tailwind CSS | ^3.4` → `^4`; [SPEC.md](../../SPEC.md) §技术选型 `shadcn/ui | latest` 含义具体化为 "shadcn 4.x". 上次会话决策日志 (handoff 2026-05-22) #3 中 "Phase 2/3 升 v4 + shadcn 4 是反向通路, 不属本期决策" 被本 ADR 替代.

## 背景

Phase 0 (T0.5, commit `f37cdc8`) 完成 Tailwind + shadcn 初始化时:

- SPEC.md §技术选型钉死 Tailwind `^3.4`. 选项是 shadcn 4 强制 Tailwind v4 (彼时项目 SPEC 已先签 Tailwind v3, 不愿同期联动升级), 或 shadcn 2.9 (兼容 v3 但配色 token 已切 oklch).
- 走 shadcn 2.9.0 + Tailwind v3.4. 已知坑: 2.9 给 v3 项目写的 `:root` 用 oklch 而 `tailwind.config.ts` 中 `colors.background: 'hsl(var(--bg))'` 默认包装会破环 oklch; 修正方案是改 `colors.background: 'var(--background)'` 裸引用直通. 该 workaround 记录在 handoff 2026-05-22 已知坑 #2.

Phase 1 中段 (T1.13 起步前) 重新评估:

- shadcn 2.9 CLI 拉取 `@latest add` 走 `electron-to-chromium` 时 npmmirror 偶发 ECONNRESET 是触发器, 非动因.
- 真动因: **跟最新版本** (用户明示). v4 已发布 ~1 年 (2026-05 视角), 生态稳定, shadcn 4 同步切默认; v3 + shadcn 2.9 是历史包袱通路.
- 重评估的代价点已变: Phase 2 即将写大量 shadcn 组件与主题/暗色切换; 在那之前换 v4 是一次性 ~30 分钟工作, 在 Phase 2 末或 Phase 3 换则要重做 globals.css + 重生所有已写组件.

## 决策

**一次性升级 Tailwind v3 → v4, shadcn 2.9 → 4.8, 撤销 v3 配置, 不留双轨**:

1. **依赖**:
   - 卸 `tailwindcss@^3.4`, `autoprefixer`, `tailwindcss-animate`.
   - 装 `tailwindcss@^4`, `@tailwindcss/vite@^4`, `tw-animate-css`, `shadcn@^4.8` (本地依赖, 而非纯 CLI `npx`).
2. **构建管线**:
   - 删 `postcss.config.js` (v4 通过 `@tailwindcss/vite` 集成 Lightning CSS, 不再需要 PostCSS 配置).
   - 删 `tailwind.config.ts` (v4 CSS-first 配置, 主题移到 `globals.css` 的 `@theme inline` 块).
   - `vite.config.ts` 加 `tailwindcss()` 插件.
3. **`src/styles/globals.css`**: 完整替换为 shadcn 4 manual install 模板 (neutral baseColor), 含:
   - `@import "tailwindcss"; @import "tw-animate-css"; @import "shadcn/tailwind.css";`
   - `@custom-variant dark (&:is(.dark *));`
   - `@theme inline { … }` 块, 含全 24 个 `--color-*` 映射 + 7 档 `--radius-*` 比例缩放 (`*0.6 / *0.8 / *1 / *1.4 / *1.8 / *2.2 / *2.6`).
   - `:root` / `.dark` 块, `--radius: 0.625rem`; chart-1..5 调色板为 v4 默认彩色 (shadcn 4 官方 neutral), 而非 v3 灰阶.
   - `@layer base { * { @apply border-border outline-ring/50; } body { @apply bg-background text-foreground; } }`.
4. **`components.json`**: `tailwind.config: ""` (空字符串, 表示 v4 无 JS 配置文件); `style: "new-york"` 保留. 其余 alias 不动. **shadcn primitive 生成不进本 ADR 范围** — `src/components/ui/` 在迁移 commit 后仍为空目录, primitive 由后续 task (T1.13 起) 用对应 preset 拉取, 届时再决定是否切 `radix-nova` / `nova` 等 v4 专用 style.
5. **浏览器底线**: 接受 Tailwind v4 的现代浏览器要求 — Safari 16.4+ / Chrome 111+ / Firefox 128+. 单用户场景, 所有者 = 部署者本人可控浏览器; 公共读取者匿名访问主路径是第三方 WebDAV 客户端 (rclone / 手机文件管理器), Web UI 是辅助入口, 旧浏览器降级到样式略乱但数据可访问.

## 其它已评估方案

- **方案 A — 继续 v3 + shadcn 2.9** (保 SPEC 不动): 拒. 与"跟最新版本"动机冲突; Phase 2 写组件量大, 拖到 Phase 2 末再升, 边际成本更高 (需重写更多文件).
- **方案 B — 推迟到 Phase 2 末或 Phase 3 末**: 拒. 中间会跨 globals.css 改写两次 (Phase 2 写主题切换时 + 升级时), 多余工作. 现在升, 后续所有 shadcn 4 默认假设直通.
- **方案 C — 部分升级 (Tailwind 升 v4, shadcn 留 2.9)**: 拒. shadcn 2.9 给 v3 写的组件假设 `hsl(var(--xxx))` 包装, v4 下需手动改回 oklch 直通, 比一次性全升复杂.

## 后果

**正面**:

- 单一权威源: `globals.css` 直接复制 shadcn 4 官方 neutral 模板, 后续 `shadcn add` 命令的默认假设全部直通, 无 workaround.
- 文档/代码同步: 用户跟着 shadcn / Tailwind 官方文档操作即可, 不需读取 handoff 已知坑 #2 解释 v3 + 2.9 的特殊配色.
- 配置面收窄: 从 `tailwind.config.ts` + `postcss.config.js` (两文件) 缩到 `globals.css` 一处 (`@theme inline`).
- 构建链整合: v4 用 Lightning CSS 替代 autoprefixer + PostCSS 链, 构建更快 (本次实测 build 时间持平, 但理论上后续 watch 重建会更快).
- Phase 2 起的所有 shadcn 4 组件、主题切换、暗色模式都按官方默认工作, 行为可预测.

**负面/代价**:

- **浏览器底线提到 Safari 16.4+ / Chrome 111+ / Firefox 128+**. v3 项目无此约束. 接受理由见决策 §6.
- **SPEC.md 改了"已锁"的版本字段**. Scope B 在 2026-05-22 锁定但允许就实施细节做反向通路 ADR. 这一条本 ADR 在 §修订一节注明.
- **mid-phase 一次性 churn**: 1 个 commit (本次), 涉 7 个文件 (`package.json` `package-lock.json` `vite.config.ts` `components.json` `globals.css` + 删 `tailwind.config.ts` `postcss.config.js`) + 4 个新 ui 原语. 接受理由: 本次 Phase 1 尚无 Tailwind 实际渲染面 (legacy 全 MUI `sx`, T1.13 之前的 `src/components/ui/` 是空目录), 升级影响面已最小.
- **`shadcn` 加为本地 dep** (而非纯 CLI npx): 约 +X MB devDep 大小 (主要是 `@radix-ui/colors` + cli 自身), 但避免下次 CLI 网络 ECONNRESET 阻塞.

## 不可逆性

- **反向回到 v3 + shadcn 2.9**: 流程 = 卸 v4 包 / 装回 v3 + autoprefixer + tailwindcss-animate / 重写 `postcss.config.js` + `tailwind.config.ts` / 重写 `globals.css` (改回 `@tailwind base/components/utilities` + `@layer base { :root { ... } }` 形式) / `npx shadcn@2.9 add --overwrite` 重生 4 原语. 实测工作量 ~30 分钟. **非焊死决策**.
- 现有部署者升级: 无运行时变化, 部署体验零差异. 仅本地构建链变 — 一次 `npm install` 即可.
