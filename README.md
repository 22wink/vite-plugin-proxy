# vite-enhanced-proxy

[![npm version](https://badge.fury.io/js/vite-enhanced-proxy.svg)](https://badge.fury.io/js/vite-enhanced-proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个功能强大的 Vite 代理插件，提供彩色日志、环境切换、过滤器、中间件等高级功能。

## ✨ 特性

- 🎨 **彩色日志** - 美观的控制台输出，支持自定义颜色
- 🔄 **环境切换** - 轻松在多个后端环境间切换
- 📊 **性能监控** - 自动记录请求响应时间
- 🎯 **智能过滤** - 支持请求/响应过滤器
- 🔧 **中间件支持** - 可扩展的请求处理管道
- 📝 **完整的 TypeScript 支持** - 完善的类型定义
- ⚡ **零依赖** - 仅使用 Node.js 内置功能
- 📋 **详细数据记录** - 支持记录请求/响应头、请求体、响应体等详细信息
- 🔍 **查询参数显示** - 自动解析并显示URL查询参数

## 📦 安装

```bash
npm install vite-enhanced-proxy --save-dev
# 或者
yarn add vite-enhanced-proxy -D
# 或者
pnpm add vite-enhanced-proxy -D
```

## 🚀 快速开始

### 基础用法

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { createProxyPlugin, ProxyEnv } from "vite-enhanced-proxy";

export default defineConfig({
  plugins: [
    createProxyPlugin({
      env: ProxyEnv.Local,
      targets: {
        [ProxyEnv.Local]: {
          v3: "http://localhost:8000/api/v3",
          v2: "http://localhost:8000/api/v2",
          flow: "http://localhost:8002"
        }
      }
    })
  ]
});
```

### 完整配置示例

```typescript
import { defineConfig } from "vite";
import { createProxyPlugin, ProxyEnv, LogLevel } from "vite-enhanced-proxy";

export default defineConfig({
  plugins: [
    createProxyPlugin({
      // 环境配置
      env: ProxyEnv.Development,
      
      // 代理目标配置
      targets: {
        [ProxyEnv.Local]: {
          v3: "http://localhost:8000/api/v3",
          v2: "http://localhost:8000/api/v2",
          flow: "http://localhost:8002"
        },
        [ProxyEnv.Development]: {
          v3: "https://dev-api.example.com/v3",
          v2: "https://dev-api.example.com/v2"
        },
        [ProxyEnv.Staging]: {
          v3: "https://staging-api.example.com/v3",
          v2: "https://staging-api.example.com/v2"
        }
      },

      // 日志配置
      logger: {
        level: LogLevel.DEBUG,
        colorful: true,
        timestamp: true,
        showMethod: true,
        showStatus: true,
        prefix: "[API代理]",
        // 详细信息配置
        showRequestHeaders: true,
        showRequestBody: true,
        showResponseHeaders: true,
        showResponseBody: true,
        showQueryParams: true,
        maxBodyLength: 2000,
        prettifyJson: true
      },

      // 启用/禁用
      enabled: true,
      devOnly: true,

      // 过滤器
      requestFilter: (url, method) => url.includes("/api/"),
      responseFilter: (url, method, status) => status >= 400,

      // 自定义代理配置
      customProxyConfig: {
        timeout: 30000
      }
    })
  ]
});
```

## 🎯 配置选项

### ProxyPluginOptions

| 选项                | 类型                     | 默认值           | 描述               |
| ------------------- | ------------------------ | ---------------- | ------------------ |
| `env`               | `ProxyEnv`               | `ProxyEnv.Local` | 代理环境           |
| `targets`           | `Partial<ProxyTargets>`  | -                | 自定义代理目标     |
| `logger`            | `LoggerConfig`           | -                | 日志配置           |
| `requestFilter`     | `RequestFilter`          | -                | 请求过滤器         |
| `responseFilter`    | `ResponseFilter`         | -                | 响应过滤器         |
| `middleware`        | `ProxyMiddleware[]`      | `[]`             | 中间件数组         |
| `customProxyConfig` | `Partial<ProxyOptions>`  | -                | 自定义代理配置     |
| `rewriteRules`      | `Record<string, string>` | -                | URL重写规则        |
| `enabled`           | `boolean`                | `true`           | 是否启用代理       |
| `devOnly`           | `boolean`                | `false`          | 仅在开发模式下启用 |

### LoggerConfig

| 选项                  | 类型       | 默认值          | 描述                |
| --------------------- | ---------- | --------------- | ------------------- |
| `level`               | `LogLevel` | `LogLevel.INFO` | 日志级别            |
| `colorful`            | `boolean`  | `true`          | 是否启用颜色        |
| `timestamp`           | `boolean`  | `true`          | 显示时间戳          |
| `showMethod`          | `boolean`  | `true`          | 显示HTTP方法        |
| `showStatus`          | `boolean`  | `true`          | 显示状态码          |
| `showError`           | `boolean`  | `true`          | 显示错误信息        |
| `prefix`              | `string`   | `'[Proxy]'`     | 日志前缀            |
| `showRequestHeaders`  | `boolean`  | `false`         | 显示请求头详情      |
| `showRequestBody`     | `boolean`  | `false`         | 显示请求体数据      |
| `showResponseHeaders` | `boolean`  | `false`         | 显示响应头详情      |
| `showResponseBody`    | `boolean`  | `false`         | 显示响应体数据      |
| `maxBodyLength`       | `number`   | `1000`          | 请求/响应体最大长度 |
| `prettifyJson`        | `boolean`  | `true`          | 美化JSON格式显示    |
| `showQueryParams`     | `boolean`  | `false`         | 显示查询参数        |

## 🌈 预定义环境

| 环境                    | 说明         |
| ----------------------- | ------------ |
| `ProxyEnv.Local`        | 本地开发环境 |
| `ProxyEnv.Development`  | 开发环境     |
| `ProxyEnv.Staging`      | 预发布环境   |
| `ProxyEnv.Production`   | 生产环境     |
| `ProxyEnv.Testing`      | 测试环境     |

## 🎨 日志输出示例

```bash
# 正常请求
2024-01-15 14:30:25 [Proxy] [GET   ] 🚀 代理到: http://localhost:8000/api/v3/user
2024-01-15 14:30:25 [Proxy] [GET   ] ✅ 200 http://localhost:8000/api/v3/user (156ms)

# 错误请求
2024-01-15 14:30:26 [Proxy] [POST  ] 🚀 代理到: http://localhost:8000/api/v3/login
2024-01-15 14:30:26 [Proxy] [POST  ] ❌ 404 http://localhost:8000/api/v3/login (89ms)

# 代理错误
2024-01-15 14:30:27 [Proxy] [GET   ] 💥 代理错误: http://localhost:8000/api/v3/test - ECONNREFUSED
```

## 🔧 高级用法

### 使用过滤器

```typescript
createProxyPlugin({
  env: ProxyEnv.Local,
  targets: {
    [ProxyEnv.Local]: {
      v3: "http://localhost:8000/api/v3"
    }
  },

  // 只记录 POST 请求
  requestFilter: (url, method) => method === "POST",

  // 只记录错误响应
  responseFilter: (url, method, status) => status >= 400
});
```

### 使用中间件

```typescript
createProxyPlugin({
  env: ProxyEnv.Local,
  targets: {
    [ProxyEnv.Local]: {
      v3: "http://localhost:8000/api/v3"
    }
  },
  middleware: [
    // 添加认证头
    async (proxyReq, req, res, options) => {
      proxyReq.setHeader("Authorization", "Bearer " + getToken());
    },

    // 记录请求时间
    async (proxyReq, req, res, options) => {
      console.log(`请求时间: ${new Date().toISOString()}`);
    }
  ]
});
```

### 运行时控制

```typescript
import { ViteProxyPlugin, ProxyEnv } from "vite-enhanced-proxy";

const plugin = new ViteProxyPlugin({
  env: ProxyEnv.Local,
  targets: {
    [ProxyEnv.Local]: {
      v3: "http://localhost:8000/api/v3"
    }
  }
});

// 切换环境
plugin.updateEnvironment(ProxyEnv.Development);

// 禁用代理
plugin.disableProxy();

// 获取状态
const state = plugin.getState();
console.log("当前环境:", state.env);
```

## 🎯 API 参考

### createProxyPlugin(options?)

创建代理插件实例。

**参数：**
- `options` - 可选的配置选项

**返回：**
- Vite Plugin 对象

### ViteProxyPlugin

插件类，用于高级控制。

**方法：**
- `updateEnvironment(env)` - 切换环境
- `updateTargets(targets)` - 更新代理目标
- `enableProxy()` - 启用代理
- `disableProxy()` - 禁用代理
- `getState()` - 获取当前状态

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如果你遇到任何问题或有功能建议，请在 [GitHub Issues](https://github.com/yourusername/vite-enhanced-proxy/issues) 中告诉我们。 