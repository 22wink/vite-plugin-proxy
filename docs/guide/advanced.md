---
title: 高级用法
---

# 高级用法

本节涵盖过滤器、中间件、WebSocket、SSE 以及动态 targets 等高级能力。

## 请求/响应过滤器

```ts
createProxyPlugin({
  env: ProxyEnv.Local,
  requestFilter: (url, method) => method === "POST",
  responseFilter: (url, method, status) => status >= 400
});
```

- `requestFilter` 返回 `true` 时才会记录请求日志
- `responseFilter` 返回 `true` 时才会记录响应日志

## 中间件

```ts
createProxyPlugin({
  middleware: [
    async (proxyReq, req) => {
      proxyReq.setHeader("Authorization", `Bearer ${getToken()}`);
    },
    async () => {
      console.log("请求时间:", new Date().toISOString());
    }
  ]
});
```

中间件执行顺序即数组顺序，可用于注入 Header、记录指纹、统计耗时等。

## WebSocket 代理

```ts
createProxyPlugin({
  targets: {
    [ProxyEnv.Local]: {
      "/ws": {
        target: "ws://localhost:3000",
        ws: {
          enabled: true,
          logConnections: true,
          logMessages: true,
          maxMessageLength: 2_000,
          prettifyMessages: true,
          timeout: 30_000
        }
      }
    }
  },
  wsMiddleware: [
    async (ws, req) => {
      console.log("WS 连接:", req.url);
    }
  ],
  webSocketFilter: (url) => url.startsWith("/ws/"),
  logger: {
    showWsConnections: true,
    showWsMessages: true
  }
});
```

## SSE 代理

```ts
createProxyPlugin({
  targets: {
    [ProxyEnv.Local]: {
      "/events": {
        target: "http://localhost:3000",
        sse: {
          enabled: true,
          logConnections: true,
          logMessages: true,
          maxMessageLength: 2_000,
          prettifyMessages: true,
          retryInterval: 3_000,
          headers: { "Cache-Control": "no-cache" }
        }
      }
    }
  },
  sseMiddleware: [
    async (proxyReq) => {
      proxyReq.setHeader("Authorization", `Bearer ${getToken()}`);
    }
  ],
  logger: {
    showSseConnections: true,
    showSseMessages: true
  }
});
```

## 动态 targets 与对象化配置

```ts
createProxyPlugin({
  env: ProxyEnv.Local,
  targets: {
    [ProxyEnv.Local]: {
      v3: "http://localhost:8000/api/v3/backend",
      v2: "http://localhost:8000/api/backend",
      flow: "http://localhost:8002",
      auth: { target: "http://localhost:9000", path: "/api/auth", rewrite: "/auth" },
      "/oss": { target: "https://oss.example.com", rewrite: "/oss" }
    }
  },
  rewriteRules: {
    "/flow": "/",
    "/api": "/api"
  }
});
```

要点：

- `v3/v2/v1` 等键会被自动映射成常见路径
- 任意键会被规范成 `/{key}`
- 以 `/` 开头的键可直接视为完整路径
- `rewrite` 优先级：对象内部 > `rewriteRules`
