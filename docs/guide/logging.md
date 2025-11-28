---
title: 日志系统
---

# 日志系统

日志是 vite-enhanced-proxy 的核心能力之一。通过 `LoggerConfig` 可以控制输出内容、颜色、级别以及 WS/SSE 相关的细节。

## LoggerConfig

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `level` | `LogLevel` | `LogLevel.INFO` | 日志级别 (`DEBUG/INFO/WARN/ERROR`) |
| `colorful` | `boolean` | `true` | 是否启用彩色输出 |
| `timestamp` | `boolean` | `true` | 显示时间戳 |
| `showMethod` | `boolean` | `true` | 显示 HTTP 方法 |
| `showStatus` | `boolean` | `true` | 显示状态码 |
| `showError` | `boolean` | `true` | 显示错误详情 |
| `prefix` | `string` | `[Proxy]` | 自定义日志前缀 |
| `showRequestHeaders` | `boolean` | `false` | 打印请求头 |
| `showRequestBody` | `boolean` | `false` | 打印请求体 |
| `showResponseHeaders` | `boolean` | `false` | 打印响应头 |
| `showResponseBody` | `boolean` | `false` | 打印响应体 |
| `showQueryParams` | `boolean` | `false` | 打印查询参数 |
| `maxBodyLength` | `number` | `1000` | 请求/响应体最大输出长度 |
| `prettifyJson` | `boolean` | `true` | 将 JSON 美化后输出 |
| `showWsConnections` | `boolean` | `false` | 打印 WebSocket 连接日志 |
| `showWsMessages` | `boolean` | `false` | 打印 WebSocket 消息 |
| `maxWsMessageLength` | `number` | `1000` | WS 消息截断长度 |
| `showSseConnections` | `boolean` | `false` | 打印 SSE 连接日志 |
| `showSseMessages` | `boolean` | `false` | 打印 SSE 消息 |
| `maxSseMessageLength` | `number` | `1000` | SSE 消息截断长度 |

## 实战配置

### 仅观察错误

```ts
createProxyPlugin({
  logger: {
    level: LogLevel.ERROR,
    colorful: false,
    showRequestBody: false,
    showResponseBody: false
  }
});
```

### 调试模式：打印所有细节

```ts
createProxyPlugin({
  logger: {
    level: LogLevel.DEBUG,
    showRequestHeaders: true,
    showRequestBody: true,
    showResponseHeaders: true,
    showResponseBody: true,
    showQueryParams: true,
    maxBodyLength: 10_000
  }
});
```

### WebSocket / SSE 观察

```ts
createProxyPlugin({
  logger: {
    showWsConnections: true,
    showWsMessages: true,
    maxWsMessageLength: 2_000,
    showSseConnections: true,
    showSseMessages: true,
    maxSseMessageLength: 2_000
  }
});
```

## 性能建议

1. 详细日志会消耗更多 CPU/IO。生产环境建议将 `level` 设为 `ERROR`，必要时搭配 `devOnly: true`。
2. 通过 `requestFilter` / `responseFilter` 精准过滤，避免无意义日志。
3. 利用 `maxBodyLength`、`maxWsMessageLength`、`maxSseMessageLength` 控制输出长度。

## 日志示例

``` text
2024-01-15 14:30:25 [Proxy] [GET   ] 🚀 代理到: http://localhost:8000/api/v3/backend/user
2024-01-15 14:30:25 [Proxy] [GET   ] ✅ 200 http://localhost:8000/api/v3/backend/user (156ms)

2024-01-15 14:30:26 [Proxy] [POST  ] ❌ 404 http://localhost:8000/api/v3/backend/login (89ms)

2024-01-15 14:30:28 [Proxy] [POST  ] 📤 详细请求: http://localhost:8000/api/v3/backend/login
  查询参数: {"redirect": "/dashboard"}
  请求头:
    content-type: application/json
  请求体: {...}
```
