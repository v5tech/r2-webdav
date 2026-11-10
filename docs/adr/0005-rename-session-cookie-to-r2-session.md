# ADR-0005 — 会话 cookie 与派生常量改名为 r2_session

- **日期**: 2026-11-10
- **状态**: 已接受
- **修订**: 取代 [ADR-0003](./0003-simplify-to-single-credential-jwt-cookie.md) 中 `fd_session` / `fd_session_v1` 的命名与派生常量. 单口令、JWT cookie、双重鉴权、不引入 D1 的架构仍以 ADR-0003 为准.

## 背景

ADR-0003 制定时沿用 FlareDrive 时代的命名: cookie 为 `fd_session`, 派生消息为 `fd_session_v1`. 项目更名为 R2 WebDAV 后, 代码、CONTEXT、README 已统一为 `r2_session` / `r2_session_v1`. ADR-0003 正文保留历史, 但其中的常量名已与实现不一致; 继续按旧名实现会得到错误的派生公式.

## 决策

- Cookie 名使用 `r2_session`.
- 派生密钥公式: `HMAC-SHA256(key = WEBDAV_PASSWORD, msg = "r2_session_v1")`.
- 不新增独立 env var; 改密码仍使全部 JWT 失效.
- 旧 `fd_session` cookie 与旧派生密钥签发的 JWT 一律失效; 部署后现有会话需重新登录一次.

## 其它已评估方案

- **保留 `fd_session` 以兼容旧 cookie**: 拒. 派生消息同时变化, 兼容需要双密钥/双 cookie 校验, 增加攻击面与复杂度; 单用户场景一次重新登录成本可接受.
- **只改 cookie 名, 不改派生消息**: 拒. 命名仍不一致, 且无法通过一次部署完成旧会话失效.

## 后果

- 现有浏览器会话失效, 需重新登录; WebDAV Basic auth 不受影响.
- 回归测试覆盖 `r2_session` 的登录、验签、logout、`/api/me`、`/api/trash`.
- 后续若再改名, 只需更新 `SESSION_COOKIE_NAME`; login/logout 的 `Set-Cookie` 与 `extractSession` 已统一引用该常量.
