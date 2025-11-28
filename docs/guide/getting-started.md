---
title: 快速上手
---

# 快速上手

vite-enhanced-proxy 是一个适用于 Vite `dev` 服务器的增强型代理插件。它提供环境切换、彩色日志、中间件、过滤器、WebSocket/SSE 支持等能力，帮助团队在多后端协同、复杂接口调试场景下保持清晰可控。

## 安装

```bash
# npm
npm install vite-enhanced-proxy -D

# pnpm
pnpm add vite-enhanced-proxy -D

# yarn
yarn add vite-enhanced-proxy -D
```

> 插件对 Vite `^3 || ^4 || ^5 || ^6 || ^7` 版本兼容，Node.js 需不低于 16。

## 快速示例

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { createProxyPlugin, ProxyEnv } from "vite-enhanced-proxy";

export default defineConfig({
  plugins: [
    createProxyPlugin({
      env: ProxyEnv.Local
    })
  ]
});
```

对应的 JavaScript 版本：

```js
// vite.config.js (ESM)
import { defineConfig } from "vite";
import { createProxyPlugin, ProxyEnv } from "vite-enhanced-proxy";

export default defineConfig({
  plugins: [createProxyPlugin({ env: ProxyEnv.Local })]
});
```

```js
// vite.config.js (CommonJS)
const { defineConfig } = require("vite");
const { createProxyPlugin, ProxyEnv } = require("vite-enhanced-proxy");

module.exports = defineConfig({
  plugins: [createProxyPlugin({ env: ProxyEnv.Local })]
});
```

## 完整配置骨架

```ts
import { defineConfig } from "vite";
import {
  createProxyPlugin,
  ProxyEnv,
  LogLevel,
  type ProxyPluginOptions
} from "vite-enhanced-proxy";

export default defineConfig({
  plugins: [
    createProxyPlugin({
      env: ProxyEnv.Local,
      targets: {
        [ProxyEnv.Local]: {
          v3: "http://localhost:8000/api/v3/backend",
          "/ws": {
            target: "ws://localhost:3000",
            ws: { enabled: true, logConnections: true }
          }
        }
      },
      logger: {
        level: LogLevel.DEBUG,
        colorful: true,
        timestamp: true,
        showRequestHeaders: true,
        showResponseBody: true
      },
      requestFilter: (url, method) => method === "POST",
      responseFilter: (url, method, status) => status >= 400,
      middleware: [
        (proxyReq, req) => {
          proxyReq.setHeader("X-Debug-User", req.headers["x-user"] ?? "dev");
        }
      ],
      wsMiddleware: [
        (ws, req) => {
          console.log("WS 连接建立:", req.url);
        }
      ],
      sseMiddleware: [
        (proxyReq) => {
          proxyReq.setHeader("Authorization", `Bearer ${process.env.TOKEN}`);
        }
      ]
    } satisfies ProxyPluginOptions)
  ]
});
```

## 下一步

- 阅读 [`配置 / 核心选项`](./configuration.md) 了解所有可配置字段
- 查看 [`高级用法`](./advanced.md) 掌握过滤器、中间件、WS、SSE 等能力
- 如果想将代理配置拆分为独立文件，请参考 [`外部配置文件`](./external-config.md)

