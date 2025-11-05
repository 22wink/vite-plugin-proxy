# Vite Proxy Plugin

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
# 将插件文件放入项目的 build/ 目录
# 或者直接复制源代码到你的项目中
```

## 🚀 快速开始

### 基础用法

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { createProxyPlugin, ProxyEnv } from "./build";

export default defineConfig({
  plugins: [
    // 最简单的用法
    createProxyPlugin({
      env: ProxyEnv.Local
    })
  ]
});
```

### 完整配置示例

```typescript
import { defineConfig } from "vite";
import { createProxyPlugin, ProxyEnv, LogLevel } from "./build";

export default defineConfig({
  plugins: [
    createProxyPlugin({
      // 环境配置
      env: ProxyEnv.ZengYikuan,

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

### 详细日志配置示例

```typescript
// 仅显示请求详情
createProxyPlugin({
  env: ProxyEnv.Local,
  logger: {
    level: LogLevel.DEBUG,
    showRequestHeaders: true,
    showRequestBody: true,
    showQueryParams: true,
    showResponseHeaders: false,
    showResponseBody: false
  }
});

// 仅显示响应详情
createProxyPlugin({
  env: ProxyEnv.Local,
  logger: {
    level: LogLevel.DEBUG,
    showRequestHeaders: false,
    showRequestBody: false,
    showResponseHeaders: true,
    showResponseBody: true,
    maxBodyLength: 5000, // 显示更长的响应体
    prettifyJson: true
  }
});

// 完全详细模式
createProxyPlugin({
  env: ProxyEnv.Local,
  logger: {
    level: LogLevel.DEBUG,
    showRequestHeaders: true,
    showRequestBody: true,
    showResponseHeaders: true,
    showResponseBody: true,
    showQueryParams: true,
    maxBodyLength: 10000,
    prettifyJson: true
  }
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

| 环境             | 说明         |
| ---------------- | ------------ |
| `ProxyEnv.Local` | 本地开发环境 |

## 🎨 日志输出示例

```bash
# 正常请求
2024-01-15 14:30:25 [Proxy] [GET   ] 🚀 代理到: http://localhost:8000/api/v3/backend/user
2024-01-15 14:30:25 [Proxy] [GET   ] ✅ 200 http://localhost:8000/api/v3/backend/user (156ms)

# 错误请求
2024-01-15 14:30:26 [Proxy] [POST  ] 🚀 代理到: http://localhost:8000/api/v3/backend/login
2024-01-15 14:30:26 [Proxy] [POST  ] ❌ 404 http://localhost:8000/api/v3/backend/login (89ms)

# 代理错误
2024-01-15 14:30:27 [Proxy] [GET   ] 💥 代理错误: http://localhost:8000/api/v3/backend/test - ECONNREFUSED

# 详细日志示例（启用DEBUG级别时）
2024-01-15 14:30:28 [Proxy] [POST  ] 📤 详细请求: http://localhost:8000/api/v3/backend/login
  查询参数: {"redirect": "/dashboard"}
  请求头:
    content-type: application/json
    authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
  请求体: {
    "username": "admin",
    "password": "******"
  }

2024-01-15 14:30:28 [Proxy] [POST  ] 📥 ✅ 详细响应: 200 http://localhost:8000/api/v3/backend/login (134ms)
  响应头:
    content-type: application/json
    set-cookie: session=abc123; Path=/; HttpOnly
  响应体: {
    "code": 200,
    "message": "登录成功",
    "data": {
      "user": {
        "id": 1,
        "username": "admin"
      },
      "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    }
  }
```

## 🔧 高级用法

### 使用过滤器

```typescript
createProxyPlugin({
  env: ProxyEnv.Local,

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

### 自定义代理目标

```typescript
createProxyPlugin({
  env: ProxyEnv.Local,
  targets: {
    [ProxyEnv.Local]: {
      v3: "http://my-custom-server:8000/api/v3/backend",
      v2: "http://my-custom-server:8000/api/v2/backend"
    }
  }
});
```

### 运行时控制

```typescript
import { ViteProxyPlugin } from "./build";

const plugin = new ViteProxyPlugin({
  env: ProxyEnv.Local
});

// 切换环境
plugin.updateEnvironment(ProxyEnv.ZengYikuan);

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

### ProxyLogger

日志工具类。

**方法：**

- `debug(message)` - 调试日志
- `info(message)` - 信息日志
- `warn(message)` - 警告日志
- `error(message)` - 错误日志
- `logRequest(method, url)` - 记录请求
- `logResponse(method, url, status, duration?)` - 记录响应
- `logError(method, url, error)` - 记录错误

## 🐛 故障排除

### 颜色不显示

```typescript
// 检查环境变量
process.env.NO_COLOR = undefined;
process.env.FORCE_COLOR = "1";

// 或者在配置中禁用颜色
createProxyPlugin({
  logger: {
    colorful: false
  }
});
```

### 代理不工作

1. 检查 `enabled` 选项是否为 `true`
2. 确认环境配置正确
3. 检查目标服务器是否可访问

### 日志过多

```typescript
// 调整日志级别
createProxyPlugin({
  logger: {
    level: LogLevel.ERROR // 只显示错误
  }
});

// 或使用过滤器
createProxyPlugin({
  requestFilter: url => url.includes("/important-api/")
});

// 禁用详细信息
createProxyPlugin({
  logger: {
    level: LogLevel.INFO, // 使用INFO级别，不显示详细信息
    showRequestHeaders: false,
    showRequestBody: false,
    showResponseHeaders: false,
    showResponseBody: false
  }
});
```

### 详细日志性能影响

当启用详细日志功能时，请注意：

1. **性能影响**: 详细日志会增加内存使用和CPU消耗，特别是在高频请求时
2. **推荐设置**: 在生产环境中建议设置 `level: LogLevel.ERROR` 或更高级别
3. **数据长度限制**: 使用 `maxBodyLength` 控制显示的数据长度，避免控制台输出过长
4. **选择性启用**: 根据调试需要选择性启用特定的详细信息选项

```typescript
// 生产环境推荐配置
createProxyPlugin({
  logger: {
    level: LogLevel.ERROR,
    colorful: false,
    showRequestHeaders: false,
    showRequestBody: false,
    showResponseHeaders: false,
    showResponseBody: false
  },
  devOnly: true // 仅在开发模式启用
});
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
