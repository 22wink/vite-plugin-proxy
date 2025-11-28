---
title: 核心配置
---

# 核心配置

本文整理了 `createProxyPlugin` 可接收的全部选项，并给出默认值与典型场景。

## ProxyPluginOptions

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `env` | `ProxyEnv` \| `string` | `ProxyEnv.Local` | 当前生效的代理环境 |
| `targets` | `Partial<ProxyTargets<TEnv>>` | - | 针对不同环境的代理目标集合 |
| `logger` | [`LoggerConfig`](./logging.md) | - | 日志配置 |
| `requestFilter` | `RequestFilter` | - | 控制哪些请求被记录 |
| `responseFilter` | `ResponseFilter` | - | 控制哪些响应被记录 |
| `middleware` | `ProxyMiddleware[]` | `[]` | HTTP 请求中间件 |
| `wsMiddleware` | `WebSocketMiddleware[]` | `[]` | WebSocket 中间件 |
| `sseMiddleware` | `SSEMiddleware[]` | `[]` | SSE 中间件 |
| `webSocketFilter` | `WebSocketFilter` | - | 控制接入的 WebSocket |
| `customProxyConfig` | `Partial<ProxyOptions>` | - | 透传给 `http-proxy` 的原始配置 |
| `rewriteRules` | `Record<string, string>` | - | URL 重写映射 |
| `webSocket` | `WebSocketConfig` | - | WS 全局配置 |
| `sse` | `SSEConfig` | - | SSE 全局配置 |
| `enabled` | `boolean` | `true` | 是否启用代理 |
| `devOnly` | `boolean` | `false` | 仅在 `vite dev` 生效 |

### targets 结构

```ts
type ProxyTarget =
  | string
  | {
      target: string;
      path?: string;
      rewrite?: string;
      ws?: WebSocketConfig;
      sse?: SSEConfig;
    };
```

- 当值为 **字符串** 时，插件会根据键名推导路径：`v3 -> /api/v3`、`v2 -> /api`、`v1 -> /api/v1`、其他键 -> `/{key}`。
- 当值为 **对象** 时，可独立控制 `target/path/rewrite`，并针对单一路径开启 WS / SSE。
- 以 `/` 开头的键会直接视为路径，例如 `"/oss"`。

### rewrite 优先级

`对象.rewrite > rewriteRules[path] > path 本身`

## 配置文件分层

1. 内联配置：写在 `createProxyPlugin({...})` 中
2. 外部配置：自动加载 `proxy.config.*`（详见[外部配置](./external-config.md)）
3. 运行时更新：通过 `ViteProxyPlugin` 实例方法调用（详见[运行时控制](./runtime.md)）

插件会将三者合并，后者覆盖前者。

## 示例：多环境 + 重写

```ts
createProxyPlugin({
  env: "dev",
  targets: {
    dev: {
      v3: "http://localhost:8000/api/v3/backend",
      flow: "http://localhost:8002",
      "/ws": {
        target: "ws://localhost:3000",
        ws: { enabled: true, logConnections: true, logMessages: true }
      }
    },
    test: {
      api: { target: "https://test.example.com", path: "/api", rewrite: "/" }
    },
    prod: {
      "/api": { target: "https://api.example.com", rewrite: "/" }
    }
  },
  rewriteRules: {
    "/flow": "/"
  }
});
```

## 与 Vite 原生 proxy 配置的关系

vite-enhanced-proxy 代替了 `server.proxy` 的部分职责，并在内部使用 `http-proxy`. 若已经配置 `server.proxy`，建议将相关规则迁移至本插件，以获得统一的日志与中间件能力。仍需使用 `server.proxy` 的情况下，也可以两者并存，但请确保路径不冲突。
