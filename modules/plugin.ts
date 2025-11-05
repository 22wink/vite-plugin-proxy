import type { Plugin, ProxyOptions } from "vite";
import type {
  ProxyPluginOptions,
  ProxyTargets,
  ProxyTarget,
  PluginState,
  ProxyMiddleware
} from "./types";
import { ProxyEnv, LogLevel } from "./types";
import { createLogger, ProxyLogger } from "./logger";

// 默认代理目标配置
const DEFAULT_PROXY_TARGETS: ProxyTargets = {
  local: {
    v1: "http://localhost:8000/api/v1/backend"
  },
  development: {
    v1: "http://localhost:8000/api/v1/backend"
  },
  staging: {
    v1: "http://localhost:8000/api/v1/backend"
  },
  production: {
    v1: "http://localhost:8000/api/v1/backend"
  },
  testing: {
    v1: "http://localhost:8000/api/v1/backend"
  }
};

class ViteProxyPlugin {
  private state: PluginState;
  private logger: ProxyLogger;
  private middleware: ProxyMiddleware[];
  private requestFilter?: (url: string, method: string) => boolean;
  private responseFilter?: (
    url: string,
    method: string,
    status: number
  ) => boolean;

  constructor(private options: ProxyPluginOptions = {}) {
    // 初始化状态
    this.state = this.initializeState();

    // 初始化日志器
    this.logger = createLogger(this.options.logger);

    // 初始化中间件
    this.middleware = this.options.middleware || [];

    // 设置过滤器
    this.requestFilter = this.options.requestFilter;
    this.responseFilter = this.options.responseFilter;

    // 注意：不在构造函数中输出日志，避免打包时也显示
  }

  private initializeState(): PluginState {
    const env = this.options.env || ProxyEnv.Local;
    const targets = { ...DEFAULT_PROXY_TARGETS, ...this.options.targets };

    return {
      env,
      targets,
      logger: {
        level: LogLevel.INFO,
        colorful: true,
        timestamp: true,
        showMethod: true,
        showStatus: true,
        showError: true,
        prefix: "[Proxy]",
        showRequestHeaders: false,
        showRequestBody: false,
        showResponseHeaders: false,
        showResponseBody: false,
        maxBodyLength: 1000,
        prettifyJson: true,
        showQueryParams: false,
        ...this.options.logger
      },
      enabled: this.options.enabled !== false
    };
  }

  private createRewriteRule(prefix: string) {
    return (path: string) => path.replace(new RegExp(`^${prefix}`), "");
  }

  private async executeMiddleware(
    proxyReq: any,
    req: any,
    res: any,
    options: any
  ): Promise<void> {
    for (const middleware of this.middleware) {
      try {
        await middleware(proxyReq, req, res, options);
      } catch (error) {
        this.logger.error(`中间件执行失败: ${error}`);
      }
    }
  }

  private createProxyConfig(
    target: string,
    rewritePath?: string
  ): ProxyOptions {
    const startTime = new Map<string, number>();

    return {
      target,
      changeOrigin: true,
      rewrite: rewritePath ? this.createRewriteRule(rewritePath) : undefined,
      ...this.options.customProxyConfig,
      configure: (proxy, options) => {
        // 请求开始
        proxy.on("proxyReq", async (proxyReq, req, res) => {
          const method = req.method || "GET";
          const originalUrl = req.url || "";
          const requestKey = `${method}:${originalUrl}`;

          // 构建完整的真实后端URL
          // 需要应用rewrite规则来重新构建完整URL，保持与响应阶段一致
          let rewrittenPath = originalUrl;
          if (rewritePath) {
            rewrittenPath = this.createRewriteRule(rewritePath)(originalUrl);
          }
          const fullUrl = `${target}${rewrittenPath}`;

          // 记录开始时间
          startTime.set(requestKey, Date.now());

          // 应用过滤器
          if (
            this.requestFilter &&
            !this.requestFilter(req.url || "", method)
          ) {
            return;
          }

          // 执行中间件
          await this.executeMiddleware(proxyReq, req, res, options);

          // 记录基础请求日志 - 显示完整的真实后端URL
          this.logger.logRequest(method, fullUrl);

          // 记录详细请求信息（当启用DEBUG级别时）
          if (this.logger.shouldLog(4)) {
            // LogLevel.DEBUG = 4
            const requestHeaders = proxyReq.getHeaders
              ? proxyReq.getHeaders()
              : req.headers;
            let requestBody: any = null;

            // 尝试捕获请求体 (需要在中间件中处理)
            if ((req as any).body) {
              requestBody = (req as any).body;
            } else if (
              method === "POST" ||
              method === "PUT" ||
              method === "PATCH"
            ) {
              // 对于有请求体的方法，提示需要中间件支持
              requestBody = "请求体数据需要在中间件中捕获";
            }

            this.logger.logDetailedRequest(method, fullUrl, {
              headers: requestHeaders,
              body: requestBody,
              queryParams: true
            });
          }
        });

        // 响应返回
        proxy.on("proxyRes", (proxyRes, req, res) => {
          const method = req.method || "GET";
          const originalUrl = req.url || "";
          const status = proxyRes.statusCode || 0;
          const requestKey = `${method}:${originalUrl}`;

          // 构建完整的真实后端URL（响应阶段）
          // 需要应用rewrite规则来重新构建完整URL
          let rewrittenPath = originalUrl;
          if (rewritePath) {
            rewrittenPath = this.createRewriteRule(rewritePath)(originalUrl);
          }
          const fullResponseUrl = `${target}${rewrittenPath}`;

          // 计算响应时间
          const duration = startTime.has(requestKey)
            ? Date.now() - startTime.get(requestKey)!
            : undefined;
          startTime.delete(requestKey);

          // 应用过滤器
          if (
            this.responseFilter &&
            !this.responseFilter(originalUrl, method, status)
          ) {
            return;
          }

          // 记录基础响应日志 - 显示完整的真实后端URL
          this.logger.logResponse(method, fullResponseUrl, status, duration);

          // 记录详细响应信息（当启用DEBUG级别时）
          if (this.logger.shouldLog(4)) {
            // LogLevel.DEBUG = 4
            const responseHeaders = proxyRes.headers;
            let responseBody: any = null;

            // 尝试捕获响应体
            if (proxyRes.readable) {
              let chunks: Buffer[] = [];
              proxyRes.on("data", (chunk: Buffer) => {
                chunks.push(chunk);
              });

              proxyRes.on("end", () => {
                try {
                  const bodyBuffer = Buffer.concat(chunks);
                  const bodyText = bodyBuffer.toString("utf8");

                  // 尝试解析JSON
                  try {
                    responseBody = JSON.parse(bodyText);
                  } catch {
                    responseBody = bodyText;
                  }

                  this.logger.logDetailedResponse(
                    method,
                    fullResponseUrl,
                    status,
                    {
                      headers: responseHeaders,
                      body: responseBody,
                      duration
                    }
                  );
                } catch (error) {
                  this.logger.logDetailedResponse(
                    method,
                    fullResponseUrl,
                    status,
                    {
                      headers: responseHeaders,
                      body: `响应体解析失败: ${error}`,
                      duration
                    }
                  );
                }
              });
            } else {
              // 如果响应不可读，仅记录头部信息
              this.logger.logDetailedResponse(method, fullResponseUrl, status, {
                headers: responseHeaders,
                body: "响应体不可读或已被消费",
                duration
              });
            }
          }
        });

        // 错误处理
        proxy.on("error", (err, req, res) => {
          const method = req.method || "GET";
          const originalUrl = req.url || "";
          const requestKey = `${method}:${originalUrl}`;

          // 构建完整的真实后端URL（错误阶段）
          let rewrittenPath = originalUrl;
          if (rewritePath) {
            rewrittenPath = this.createRewriteRule(rewritePath)(originalUrl);
          }
          const fullErrorUrl = `${target}${rewrittenPath}`;

          // 清理计时器
          startTime.delete(requestKey);

          // 记录错误日志 - 显示完整的真实后端URL
          this.logger.logError(method, fullErrorUrl, err);
        });

        // 调用自定义配置
        if (this.options.customProxyConfig?.configure) {
          this.options.customProxyConfig.configure(proxy, options);
        }
      }
    };
  }

  private generateProxyConfig(): Record<string, ProxyOptions> {
    if (!this.state.enabled) {
      this.logger.info("代理已禁用");
      return {};
    }

    const currentTargets =
      this.state.targets[this.state.env] || this.state.targets[ProxyEnv.Local];
    const proxy: Record<string, ProxyOptions> = {};

    this.logger.debug(`生成代理配置 - 目标: ${JSON.stringify(currentTargets)}`);

    // 应用自定义重写规则
    const customRewrites = this.options.rewriteRules || {};

    // Flow接口代理
    if (currentTargets.flow) {
      const path = "/api/flow";
      proxy[path] = this.createProxyConfig(
        currentTargets.flow,
        customRewrites[path] || path
      );
      this.logger.debug(`添加Flow代理: ${path} -> ${currentTargets.flow}`);
    }

    // V3接口代理
    if (currentTargets.v3) {
      const path = "/api/v3";
      proxy[path] = this.createProxyConfig(
        currentTargets.v3,
        customRewrites[path] || path
      );
      this.logger.debug(`添加V3代理: ${path} -> ${currentTargets.v3}`);
    }

    // V2接口代理（通用API）
    if (currentTargets.v2) {
      const path = "/api";
      proxy[path] = this.createProxyConfig(
        currentTargets.v2,
        customRewrites[path] || path
      );
      this.logger.debug(`添加V2代理: ${path} -> ${currentTargets.v2}`);
    }

    return proxy;
  }

  // 插件主要方法
  getPlugin(): Plugin {
    return {
      name: "vite-proxy-plugin",
      apply: "serve", // 仅在开发模式下应用
      config: (config, { command }) => {
        // 在开发模式下配置代理
        if (command === "serve") {
          // 如果设置了仅开发模式且当前不是开发模式，则跳过
          if (this.options.devOnly && command !== "serve") {
            this.logger.info("跳过代理配置 - 非开发模式");
            return;
          }

          const proxyConfig = this.generateProxyConfig();

          if (Object.keys(proxyConfig).length > 0) {
            config.server = config.server || {};
            config.server.proxy = {
              ...proxyConfig,
              ...config.server.proxy // 保留已有的代理配置
            };

            this.logger.info(
              `代理配置已应用 - 共 ${Object.keys(proxyConfig).length} 个路由`
            );
          }
        }
      },
      configureServer: server => {
        this.logger.info(`代理插件已初始化 - 环境: ${this.state.env}`);
        this.logger.info("开发服务器已启动，代理插件激活");
      }
    };
  }

  // 公共方法
  updateEnvironment(env: ProxyEnv): void {
    this.state.env = env;
    this.logger.info(`环境已切换到: ${env}`);
  }

  updateTargets(targets: Partial<ProxyTargets>): void {
    this.state.targets = { ...this.state.targets, ...targets };
    this.logger.info("代理目标已更新");
  }

  enableProxy(): void {
    this.state.enabled = true;
    this.logger.info("代理已启用");
  }

  disableProxy(): void {
    this.state.enabled = false;
    this.logger.info("代理已禁用");
  }

  getState(): Readonly<PluginState> {
    return { ...this.state };
  }
}

// 插件工厂函数
export function createProxyPlugin(options: ProxyPluginOptions = {}): Plugin {
  const pluginInstance = new ViteProxyPlugin(options);
  return pluginInstance.getPlugin();
}

// 导出插件类供高级用法
export { ViteProxyPlugin };

// 重新导出类型和枚举
export * from "./types";
export * from "./logger";
