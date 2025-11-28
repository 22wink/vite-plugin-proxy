---
title: 故障排查
---

# 故障排查

## 颜色不显示

```ts
process.env.NO_COLOR = undefined;
process.env.FORCE_COLOR = "1";

createProxyPlugin({
  logger: {
    colorful: false // 如希望禁用颜色
  }
});
```

## 代理不生效

1. 确认 `enabled` 为 `true`
2. 若设置了 `devOnly: true`，请确认当前正在运行 `vite dev`
3. 检查 `env` 与 `targets` 是否匹配
4. 确认目标服务器可以访问，必要时抓包或直接访问目标地址

## 日志过多

```ts
createProxyPlugin({
  logger: {
    level: LogLevel.ERROR
  },
  requestFilter: (url) => url.includes("/重要接口/"),
  responseFilter: (_, __, status) => status >= 500
});
```

## 详细日志导致性能下降

1. 将 `level` 调整为 `INFO` 或 `WARN`
2. 使用 `maxBodyLength`、`maxWsMessageLength`、`maxSseMessageLength` 控制输出
3. 在生产环境设定 `devOnly: true`

```ts
createProxyPlugin({
  logger: {
    level: LogLevel.ERROR,
    colorful: false,
    showRequestHeaders: false,
    showRequestBody: false,
    showResponseHeaders: false,
    showResponseBody: false
  },
  devOnly: true
});
```

## WebSocket / SSE 无日志

请检查：

- 是否启用了 `webSocket` / `sse` 对应配置
- `logger.showWsMessages`/`showSseMessages` 是否为 `true`
- `webSocketFilter` 是否误过滤了路径

## 仍有疑问？

- 查看 [API 参考](./api.md) 获取全部方法说明
- 在 GitHub Issues 中反馈问题：<https://github.com/22wink/vite-enhanced-proxy/issues>
