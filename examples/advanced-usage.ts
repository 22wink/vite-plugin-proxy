// vite.config.ts - 高级用法示例
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

      // 过滤器
      requestFilter: (url, method) => {
        // 只记录 API 相关的请求
        return url.includes("/api/");
      },
      
      responseFilter: (url, method, status) => {
        // 只记录错误响应和慢请求
        return status >= 400;
      },

      // 中间件
      middleware: [
        // 添加认证头
        async (proxyReq, req, res, options) => {
          const token = process.env.API_TOKEN || "dev-token";
          proxyReq.setHeader("Authorization", `Bearer ${token}`);
        },

        // 添加追踪ID
        async (proxyReq, req, res, options) => {
          const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          proxyReq.setHeader("X-Trace-ID", traceId);
        }
      ],

      // 自定义重写规则
      rewriteRules: {
        "/api/v3": "/api/v3/backend",
        "/api/v2": "/api/v2/backend"
      },

      // 自定义代理配置
      customProxyConfig: {
        timeout: 30000,
        followRedirects: true
      },

      // 仅在开发模式启用
      devOnly: true,
      enabled: true
    })
  ]
}); 