# ADR-0002 — `/api/*` 用 Hono, `/webdav/*` 保留裸 Pages Functions

- **日期**: 2026-05-21
- **状态**: ⛔ **Superseded by [ADR-0003](./0003-simplify-to-single-credential-jwt-cookie.md) (2026-05-22)**

> **本决策已废止.** Scope B 简化后, `/api/*` 仅剩 3 个端点 (`/api/login`, `/api/logout`, `/api/me`), 不再值得引入 Hono. 当前生效方案: 全部端点保持裸 Pages Functions. 本文件保留作为决策演化记录.

---

## 背景

二次开发引入约 9 个新 JSON 端点 (登录、注销、搜索、令牌 CRUD、回收站列表/还原/永久删除、应用配置). 同时既有 `/webdav/*` 的 WebDAV 协议处理代码已稳定且已被理解, 在上手地图中详尽覆盖.

需要决定新代码是否使用框架, 以及与既有代码的组织边界.

## 决策

新增端点全部置于 `functions/api/[[path]].ts` 中由 Hono 路由处理. 现有 `functions/webdav/*` 一字不动, 仍保持"每个 HTTP 动词一个文件"的裸 Pages Functions 模式. 鉴权等共享逻辑抽到 `functions/_shared/`, 由 Hono 中间件与 `functions/webdav/[[path]].ts` 共用同一个实现.

## 其它已评估方案

- **方案 A — 全裸 Pages Functions**: 每个新端点一个 `.ts` 文件, 鉴权 copy-paste. 否决原因: 9 份相似鉴权代码易漏掉一处即引入越权风险; 无类型化路由与请求体校验; 后续加端点边际成本递增.
- **方案 C — 全栈 Hono + `_worker.js`**: 删除 `functions/`, 重写为 Pages Advanced Mode. 否决原因: 等同重写后端, 与"二次开发"定位冲突; 失去 Pages Functions 自动发现; 部署模型变更引入排查成本.

## 后果

**正面**:
- 新 JSON API 的开发体验显著好转 (类型化路由、zod 校验、cookie helper、统一错误格式).
- 鉴权策略集中于一处, 不可能某个端点忘加.
- 既有 WebDAV 处理零风险.

**负面/代价**:
- 仓库内并存两种后端写法, 新贡献者需理解 "**协议层 (WebDAV) 走裸函数, 业务层 (JSON API) 走 Hono**" 的边界. 必须在 README 与本 ADR 中明示.
- Hono 增加约 30KB Worker bundle. 对 Cloudflare Workers 冷启动几乎无感, 可忽略.
- 鉴权共享模块若改动, 同时影响 WebDAV 与 API, 需有回归测试覆盖.

**边界约束**:
- 任何 WebDAV 协议相关的代码不得迁入 Hono. 反之, 任何 JSON 业务端点不得新增到 `functions/webdav/`.
- `functions/_shared/` 只放双方真共享的代码 (鉴权、D1 客户端、错误格式), 不放仅一方使用的工具.
