# R2 WebDAV 术语与上下文

> 仅词汇表. 不放实现细节、不放规格. 术语变更时即时更新.

## 部署模型

**单用户网盘.** R2 WebDAV 只服务一位所有者. 无租户、无逐用户数据、无角色分层. 所有者以自己身份登录; 其余访问者要么走匿名公共只读 (启用时), 要么被拒.

- 明确不做 (2026-05-21 决定): 多用户、用户管理界面、逐用户配额、运维侧管理控制台.
- 本项目内 **"管理后台"特指现代化的所有者文件管理 UI**, 并非位于用户之上的管理员面板. 若将来需求中"管理后台"再指运维/管理员控制台, 必须当场点出术语冲突.
- **"多端适配"特指响应式 Web** — 同一份 SPA 在桌面 / 平板 / 移动端浏览器自适应布局. 不包含 PWA 离线、Electron/Tauri 桌面壳、iOS/Android 原生 App.
- **核心价值是 WebDAV** (2026-05-22 重申). Web UI 是辅助入口, 服务于"看一眼"; 真实文件操作主要走第三方 WebDAV 客户端 (rclone / 手机文件管理器 / NAS / Windows 资源管理器映射).

## 角色

- **所有者 (Owner)** — 唯一鉴权主体. 通过 Web UI 或第三方 WebDAV 客户端对整个桶具备全量读写权.
- **公共读取者 (Public reader)** — 匿名访客. 仅在 `WEBDAV_PUBLIC_READ=1` 时被允许 `GET`/`HEAD`/`PROPFIND`. 不可写.

## 凭据

**单一口令模型** (2026-05-22 简化, 替代之前的双轨方案):

- **凭据 (Credential)** — 由 Cloudflare Pages 环境变量 `WEBDAV_USERNAME` + `WEBDAV_PASSWORD` 配置的一对用户名/密码. 同时是所有者登录 Web UI 与配置第三方 WebDAV 客户端使用的口令. 服务端永不在 D1 / KV / 任何持久化中保存; 仅运行时从环境变量读取并做常量时间比较. 改密码 = 在 Cloudflare 仪表盘修改环境变量并重新部署.
- **派生密钥 (Derived secret)** — JWT 签名密钥, 从 `WEBDAV_PASSWORD` 派生而来. 公式: `HMAC-SHA256(key = WEBDAV_PASSWORD, msg = "r2_session_v1")`. `msg` 是版本化常量, 将来若需"主动让所有会话失效但不改密码"可升 `v2`. **不另设独立 env var** — 派生关系保证"改密码 = 全 JWT 自动失效", 且无需密钥同步.
- **会话 (Session)** — Web UI 登录成功后服务端签发的 JWT, 以 HttpOnly cookie 形态承载. 签名密钥为上述派生密钥. JWT payload 含 `sub: 'owner'` + `iss: <origin>` (防跨部署 cookie 互认) + 标准 `iat` / `exp`. 默认 7 天过期.
- **双重鉴权 (Dual auth)** — `/webdav/*` 端点的鉴权策略: 优先尝试解析 cookie 内 JWT, 验签通过即放行; **cookie 存在但验签失败不回退 Basic** — 直接 401 (减少攻击面, 改密码后旧 cookie 走完 /login 重发). 无 cookie 或 cookie 为空时尝试 `Authorization: Basic` header; Basic 通过即放行. 全否则 401. `WEBDAV_PUBLIC_READ=1` 的匿名短路**仅限 GET / HEAD / PROPFIND** 三个只读 verbs, 不覆盖任何写操作.

> 术语警示: 不要把 "App token" 写成 "API key" / "API token" — 当前**无应用令牌概念** (ADR-0001 双轨方案已废, 见 ADR-0003). 若将来需要可吊销凭据, 引入新术语而非复用历史词.

## 存储命名空间

- **用户命名空间 (User namespace)** — 所有不带 `_$r2webdav$/` 前缀的 R2 key. 在目录列表中可见, 由所有者拥有, 启用公共读取时可被公共读取者看到.
- **内部命名空间 (Internal namespace)** — `_$r2webdav$/` 前缀下的 key. 对 `PROPFIND` 不可见 (`functions/webdav/utils.ts:44`). 视作实现层, 绝不在用户界面中暴露. 当前子前缀: `_$r2webdav$/thumbnails/<sha1>.png` (缩略图), `_$r2webdav$/trash/<timestamp>/<original-key>` (DELETE 软删除回收站).

## 资源类型

- **文件/对象 (File / Object)** — 用户命名空间内的非目录 R2 对象.
- **目录 (Directory / Collection)** — 以 `contentType: application/x-directory` 标记的零字节占位对象 (`mkcol.ts`). 不存在真正的"目录"实体, 只是 R2 key 前缀的约定.

## 持久化

- **R2** — 文件主体与缩略图. 唯一持久化层.
- **环境变量** — `WEBDAV_USERNAME`, `WEBDAV_PASSWORD`, `WEBDAV_PUBLIC_READ` 经 Cloudflare Pages 仪表盘配置. 不在 git 里, 不在 D1 里.
- **不引入** D1、KV、Durable Objects、外部数据库.

## "二次开发" 范围 (Scope B, 2026-05-22 锁定)

### 在范围内

- 修复上手地图中识别出的安全/正确性缺陷 (Basic auth 时序攻击、PROPFIND XML 转义、`driveid` 后门、cdnjs pdf.js、根目录死代码、`utils/s3.ts` 死代码、README 阈值文档).
- 构建工具现代化 (CRA → Vite).
- UI 全面重做于 shadcn/ui + Tailwind, 桌面/平板/移动响应式.
- 自定义登录页 + JWT cookie 会话, 替代浏览器 Basic auth 弹窗.
- WebDAV `/webdav/*` 双重鉴权 (cookie 或 Basic auth 二选一通过).
- 文件操作功能集 (与现有持平 + 在线预览): 浏览/上传/下载/重命名/移动/删除/多选批操作/缩略图.
- 在线预览 (图片/视频/PDF).
- 文本笔记 (TextPad, 保留).
- 暗色模式.
- 国际化骨架 (中/英).

### 不在范围内

- 多用户、用户管理界面、逐用户配额.
- 应用令牌 / 可吊销凭据 / 多客户端独立凭据.
- D1 / KV / 任何新数据库依赖.
- 回收站 (软删除 + 还原).
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
