---
title: 外部配置
---

# 外部配置文件

插件支持自动加载项目根目录下的代理配置文件，并与内联配置合并。支持的文件名及优先级（从高到低）：

1. `proxy.config.ts`
2. `proxy.config.js`
3. `proxy.config.cjs`
4. `proxy.config.mjs`
5. `proxy.config.json`

命中后立即停止继续查找。

## TypeScript 示例

```ts
// proxy.config.ts
import { LogLevel } from "vite-enhanced-proxy";

export default {
  env: "dev",
  logger: { level: LogLevel.INFO },
  targets: {
    dev: {
      v3: "http://localhost:8000/api/v3/backend",
      flow: "http://localhost:8002",
      auth: { target: "http://localhost:7001", path: "/api/auth", rewrite: "/" }
    },
    prod: {
      "/api": { target: "https://api.example.com", rewrite: "/" }
    }
  },
  rewriteRules: {
    "/flow": "/"
  }
};
```

## ESM / CJS

```js
// proxy.config.mjs
export default {
  env: "dev",
  targets: {
    dev: { v2: "http://localhost:8000/api" }
  }
};
```

```js
// proxy.config.cjs
module.exports = {
  env: "dev",
  targets: {
    dev: {
      v1: "http://localhost:8000/api/v1/backend",
      "/oss": { target: "http://localhost:9000", rewrite: "/oss" }
    }
  }
};
```

## JSON

```json
{
  "env": "dev",
  "targets": {
    "dev": {
      "v3": "http://localhost:8000/api/v3/backend",
      "flow": "http://localhost:8002",
      "auth": { "target": "http://localhost:7001", "path": "/api/auth", "rewrite": "/" },
      "/ws": {
        "target": "ws://localhost:3000",
        "ws": { "enabled": true, "logConnections": true, "logMessages": true }
      },
      "/events": {
        "target": "http://localhost:3000",
        "sse": {
          "enabled": true,
          "logConnections": true,
          "logMessages": true,
          "retryInterval": 3000
        }
      }
    }
  },
  "rewriteRules": {
    "/flow": "/"
  }
}
```

> JSON 不支持函数、枚举、注释，如需编写中间件或引用 `LogLevel`，应使用 TS/JS。

## 合并策略

1. **外部配置优先**：当存在同名字段时，外部配置会覆盖内联配置
2. **运行时操作**：通过 `plugin.updateTargets()` 等方法修改时，会基于合并结果继续更新
3. **热重载**：当 Vite Dev Server 重新加载插件时会重新读取配置文件，便于协作修改

## defineProxyConfig

如果希望在 TS 中获得更强的类型推断，可以使用可选的 `defineProxyConfig`（若存在）包裹导出。该函数仅用于类型提示，对运行时没有影响。
