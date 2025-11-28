---
title: API 参考
---

# API 参考

## createProxyPlugin(options?)

创建并返回符合 Vite 规范的插件对象。常规用法是直接放入 `vite.config.ts` 的 `plugins` 数组中。

- `options`：可选 [`ProxyPluginOptions`](./configuration.md)。
- **返回值**：Vite 插件实例，并附带运行时控制方法（在 Dev Server 初始化后可调用）。

## ViteProxyPlugin

类构造函数，等价于 `createProxyPlugin` 内部实现。适合需要显式持有实例、或在非 Vite 配置文件中复用的场景。

```ts
import { ViteProxyPlugin } from "vite-enhanced-proxy";

const plugin = new ViteProxyPlugin({ env: ProxyEnv.Local });
plugin.updateEnvironment(ProxyEnv.Test);
```

### 实例方法

| 方法 | 描述 |
| --- | --- |
| `updateEnvironment(env)` | 切换当前运行环境 |
| `updateTargets(partialTargets)` | 合并 / 覆盖代理目标 |
| `enableProxy()` | 启用代理 |
| `disableProxy()` | 禁用代理 |
| `getState()` | 返回 `{ env, enabled, targets }` 等信息 |

## ProxyLogger

日志工具类，一般不需要手动实例化，但可以在自定义场景中复用。

| 方法 | 描述 |
| --- | --- |
| `debug(message)` | 输出调试日志 |
| `info(message)` | 输出普通信息 |
| `warn(message)` | 警告信息 |
| `error(message)` | 错误信息 |
| `logRequest(method, url)` | 记录请求 |
| `logResponse(method, url, status, duration?)` | 记录响应 |
| `logError(method, url, error)` | 记录代理错误 |
| `logWebSocketConnection(url, protocols?)` | WS 连接日志 |
| `logWebSocketMessage(url, message, direction)` | WS 消息日志 |
| `logSSEConnection(method, url)` | SSE 连接日志 |
| `logSSEMessage(url, message)` | SSE 消息日志 |

## 类型辅助

- `ProxyEnv`：内置环境枚举，包含 `Local/Test/Dev/Sit/Uat/Prod`
- `LogLevel`：日志级别枚举
- `WebSocketConfig` / `SSEConfig`：WS/SSE 相关配置
- `ProxyPluginOptions<TEnv extends string = ProxyEnv>`：核心配置泛型，可通过自定义 `TEnv` 强化类型安全

```ts
export enum MyEnv {
  Dev = "dev",
  Test = "test",
  Prod = "prod"
}

createProxyPlugin<MyEnv>({
  env: MyEnv.Dev,
  targets: {
    [MyEnv.Dev]: { v3: "http://localhost:8000/api/v3/backend" },
    [MyEnv.Test]: { v3: "https://test.example.com/api/v3/backend" }
  }
});
```

## 版本兼容

- Vite：`^3 - ^7`
- Node.js：`>= 16`

如需了解近期改动与升级注意事项，请关注 GitHub Releases。
