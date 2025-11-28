---
title: 运行时控制
---

# 运行时控制

除了作为普通 Vite 插件使用外，vite-enhanced-proxy 还暴露了 `ViteProxyPlugin` 类，用于在运行中切换环境、启停代理或查询状态。

## 获取实例

```ts
import { ViteProxyPlugin, ProxyEnv } from "vite-enhanced-proxy";

const plugin = new ViteProxyPlugin({
  env: ProxyEnv.Local
});

export default defineConfig({
  plugins: [plugin]
});
```

或者在 `createProxyPlugin` 返回值中访问内部实例：

```ts
const proxyPlugin = createProxyPlugin({ env: ProxyEnv.Local });
export default defineConfig({ plugins: [proxyPlugin] });

// dev server 启动后
proxyPlugin.updateEnvironment(ProxyEnv.Prod);
```

## 可用方法

| 方法 | 说明 |
| --- | --- |
| `updateEnvironment(env)` | 切换当前环境 |
| `updateTargets(targets)` | 替换/合并目标配置 |
| `enableProxy()` | 启用代理 |
| `disableProxy()` | 禁用代理 |
| `getState()` | 获取状态（当前 env、是否启用、targets 等） |

## 示例：CLI 切换

```ts
// scripts/switch-env.ts
import { ViteProxyPlugin, ProxyEnv } from "vite-enhanced-proxy";

const plugin = new ViteProxyPlugin({
  env: ProxyEnv.Local
});

plugin.updateEnvironment(process.argv[2] as ProxyEnv);
console.log("已切换至", plugin.getState().env);
```

## 与 Vite Dev Server 的关系

- 这些方法仅在 Dev Server 运行时生效
- 切换环境会重新建立代理上下文，日志器也会随之更新
- `disableProxy` 可用于快速对比「原始请求」与「代理请求」
