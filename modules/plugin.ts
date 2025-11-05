import type { Plugin, ProxyOptions } from "vite";
import type {
  ProxyPluginOptions,
  ProxyTargets,
  PluginState,
  ProxyMiddleware,
  EnvKey,
  ProxyRouteConfig
} from "./types";
import { ProxyEnv, LogLevel } from "./types";
import { createLogger, ProxyLogger } from "./logger";
import { loadExternalProxyConfig } from "./config-loader";

// 默认代理目标配置（置空，避免写死）
const DEFAULT_PROXY_TARGETS: ProxyTargets<ProxyEnv> = {} as ProxyTargets<ProxyEnv>;

class ViteProxyPlugin<TEnv extends string = EnvKey> {
  private state: PluginState<TEnv>;
  private logger: ProxyLogger;
  private middleware: ProxyMiddleware[];
  private requestFilter?: (url: string, method: string) => boolean;
  private responseFilter?: (
    url: string,
    method: string,
    status: number
  ) => boolean;

  constructor(private options: ProxyPluginOptions<TEnv> = {}) {
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

  private initializeState(): PluginState<TEnv> {
    const env = (this.options.env as TEnv) || (ProxyEnv.Local as unknown as TEnv);
    const targets = { ...(DEFAULT_PROXY_TARGETS as any), ...(this.options.targets as any) };

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
    } as PluginState<TEnv>;
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
        proxy.on("proxyRes", (proxyRes, req) => {
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

            // 检查是否是 SSE 流式响应
            const contentType = proxyRes.headers['content-type'] || '';
            const isSSE = contentType.includes('text/event-stream');

            // 对于 SSE 响应，不要尝试读取响应体，因为它是持续的流
            if (isSSE) {
              this.logger.logDetailedResponse(
                method,
                fullResponseUrl,
                status,
                {
                  headers: responseHeaders,
                  body: "[SSE Stream - Not Captured]",
                  duration
                }
              );
            } else if (proxyRes.readable) {
              // 尝试捕获普通响应体
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
        proxy.on("error", (err, req) => {
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
      (this.state.targets as any)[this.state.env as any] || ((this.state.targets as any)[ProxyEnv.Local as any] || (DEFAULT_PROXY_TARGETS as any)[ProxyEnv.Local]);
    const proxy: Record<string, ProxyOptions> = {};

    this.logger.debug(`生成代理配置 - 目标: ${JSON.stringify(currentTargets)}`);

    // 应用自定义重写规则
    const customRewrites = this.options.rewriteRules || {};

    // 默认键到路径的映射（兼容旧用法）
    const defaultPathMap: Record<string, string> = {
      v3: "/api/v3",
      v2: "/api",
      v1: "/api/v1"
    };

    // 动态遍历所有键（显式断言类型）
    const entries = Object.entries(currentTargets as Record<string, ProxyRouteConfig>);
    for (const [key, value] of entries) {
      if (!value) continue;

      let routePath: string;
      let target: string;
      let rewritePath: string;

      if (typeof value === "string") {
        target = value;
        routePath = defaultPathMap[key] || (key.startsWith("/") ? key : `/${key}`);
        rewritePath = customRewrites[routePath] || routePath;
      } else {
        target = value.target;
        const derivedPath = defaultPathMap[key] || (key.startsWith("/") ? key : `/${key}`);
        routePath = value.path || derivedPath;
        rewritePath = value.rewrite || customRewrites[routePath] || routePath;
      }

      if (!target || !routePath) continue;

      proxy[routePath] = this.createProxyConfig(target, rewritePath);
      this.logger.debug(`添加代理: ${key} -> ${routePath} => ${target} (rewrite: ${rewritePath})`);
    }

    return proxy;
  }

  // 插件主要方法
  getPlugin(): Plugin {
    return {
      name: "vite-proxy-plugin",
      apply: "serve", // 仅在开发模式下应用
      config: async (config, { command }) => {
        // 在开发模式下配置代理
        if (command === "serve") {
          // 如果设置了仅开发模式且当前不是开发模式，则跳过
          if (this.options.devOnly && command !== "serve") {
            this.logger.info("跳过代理配置 - 非开发模式");
            return;
          }

          // 优先加载外部配置
          const external = await loadExternalProxyConfig();
          if (external) {
            // 合并外部配置到现有选项（外部优先）
            this.options = { ...this.options, ...external } as ProxyPluginOptions<TEnv>;
            // 重新初始化状态和依赖
            this.state = this.initializeState();
            this.logger = createLogger(this.options.logger);
            this.middleware = this.options.middleware || [];
            this.requestFilter = this.options.requestFilter;
            this.responseFilter = this.options.responseFilter;
            this.logger.info("已加载外部 proxy.config 配置");
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
      configureServer: () => {
        this.logger.info(`代理插件已初始化 - 环境: ${this.state.env}`);
        this.logger.info("开发服务器已启动，代理插件激活");
      }
    };
  }

  // 公共方法
  updateEnvironment(env: TEnv): void {
    this.state.env = env;
    this.logger.info(`环境已切换到: ${env}`);
  }

  updateTargets(targets: Partial<ProxyTargets<TEnv>>): void {
    this.state.targets = { ...this.state.targets, ...targets } as ProxyTargets<TEnv>;
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

  getState(): Readonly<PluginState<TEnv>> {
    return { ...this.state } as Readonly<PluginState<TEnv>>;
  }
}

// 插件工厂函数
export function createProxyPlugin<TEnv extends string = EnvKey>(options: ProxyPluginOptions<TEnv> = {} as ProxyPluginOptions<TEnv>): Plugin {
  const pluginInstance = new ViteProxyPlugin<TEnv>(options);
  return pluginInstance.getPlugin();
}

// 导出插件类供高级用法
export { ViteProxyPlugin };

// 重新导出类型和枚举
export * from "./types";
export * from "./logger";
