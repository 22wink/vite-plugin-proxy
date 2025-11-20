import type { Plugin, ProxyOptions } from "vite";
import type {
  ProxyPluginOptions,
  ProxyTargets,
  PluginState,
  ProxyMiddleware,
  WebSocketMiddleware,
  SSEMiddleware,
  WebSocketFilter,
  EnvKey,
  ProxyRouteConfig,
  WebSocketConfig,
  SSEConfig,
  ExtendedProxyOptions
} from "./types.js";
import { ProxyEnv, LogLevel } from "./types.js";
import { createLogger, ProxyLogger } from "./logger.js";
import { loadExternalProxyConfig } from "./config-loader.js";

// 默认代理目标配置（置空，避免写死）
const DEFAULT_PROXY_TARGETS: ProxyTargets<ProxyEnv> = {} as ProxyTargets<ProxyEnv>;

class ViteProxyPlugin<TEnv extends string = EnvKey> {
  private state: PluginState<TEnv>;
  private logger: ProxyLogger;
  private middleware: ProxyMiddleware[];
  private wsMiddleware: WebSocketMiddleware[];
  private sseMiddleware: SSEMiddleware[];
  private requestFilter?: (url: string, method: string) => boolean;
  private responseFilter?: (
    url: string,
    method: string,
    status: number
  ) => boolean;
  private webSocketFilter?: WebSocketFilter;

  constructor(private options: ProxyPluginOptions<TEnv> = {}) {
    // 初始化状态
    this.state = this.initializeState();

    // 初始化日志器
    this.logger = createLogger(this.options.logger);

    // 初始化中间件
    this.middleware = this.options.middleware || [];
    this.wsMiddleware = this.options.wsMiddleware || [];
    this.sseMiddleware = this.options.sseMiddleware || [];

    // 设置过滤器
    this.requestFilter = this.options.requestFilter;
    this.responseFilter = this.options.responseFilter;
    this.webSocketFilter = this.options.webSocketFilter;

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
        showWsConnections: true,
        showWsMessages: false,
        maxWsMessageLength: 1000,
        showSseConnections: true,
        showSseMessages: false,
        maxSseMessageLength: 1000,
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

  private async executeWebSocketMiddleware(
    ws: any,
    req: any,
    socket: any,
    head: Buffer
  ): Promise<void> {
    for (const middleware of this.wsMiddleware) {
      try {
        await middleware(ws, req, socket, head);
      } catch (error) {
        this.logger.error(`WebSocket 中间件执行失败: ${error}`);
      }
    }
  }

  private getWebSocketConfig(routeConfig?: ProxyRouteConfig): WebSocketConfig {
    const defaultConfig: WebSocketConfig = {
      enabled: true,
      timeout: 30000,
      logConnections: true,
      logMessages: false,
      maxMessageLength: 1000,
      prettifyMessages: true,
      headers: {},
      protocols: undefined,
      ...this.options.webSocket
    };

    if (typeof routeConfig === 'object' && routeConfig.ws) {
      return { ...defaultConfig, ...routeConfig.ws };
    }

    return defaultConfig;
  }

  private getSSEConfig(routeConfig?: ProxyRouteConfig): SSEConfig {
    const defaultConfig: SSEConfig = {
      enabled: true,
      logConnections: true,
      logMessages: false,
      maxMessageLength: 1000,
      prettifyMessages: true,
      headers: {},
      retryInterval: 3000,
      ...this.options.sse
    };

    if (typeof routeConfig === 'object' && routeConfig.sse) {
      return { ...defaultConfig, ...routeConfig.sse };
    }

    return defaultConfig;
  }

  private isSSERequest(req: any): boolean {
    const acceptHeader = req.headers?.accept || '';
    return acceptHeader.includes('text/event-stream');
  }

  private async executeSSEMiddleware(
    proxyReq: any,
    req: any,
    res: any,
    options: any
  ): Promise<void> {
    for (const middleware of this.sseMiddleware) {
      try {
        await middleware(proxyReq, req, res, options);
      } catch (error) {
        this.logger.error(`SSE 中间件执行失败: ${error}`);
      }
    }
  }

  private createProxyConfig(
    target: string,
    rewritePath?: string,
    routeConfig?: ProxyRouteConfig
  ): ProxyOptions {
    const startTime = new Map<string, number>();
    const wsConfig = this.getWebSocketConfig(routeConfig);
    const sseConfig = this.getSSEConfig(routeConfig);
    
    // 获取路由级别的自定义代理配置
    const routeCustomConfig = typeof routeConfig === 'object' && routeConfig !== null && 'customProxyConfig' in routeConfig
      ? routeConfig.customProxyConfig
      : undefined;

    // 合并自定义配置：路由级别 > 全局级别
    const mergedCustomConfig: ExtendedProxyOptions = {
      ...this.options.customProxyConfig,
      ...routeCustomConfig
    };

    // 提取 HTTPS 相关选项（这些选项需要在 configure 中应用到 options）
    const httpsOptions: Record<string, any> = {};
    const httpsOptionKeys = [
      'rejectUnauthorized',
      'secure',
      'ca',
      'cert',
      'key',
      'passphrase',
      'pfx',
      'ciphers',
      'honorCipherOrder',
      'minVersion',
      'maxVersion'
    ];
    
    for (const key of httpsOptionKeys) {
      if (key in mergedCustomConfig) {
        httpsOptions[key] = (mergedCustomConfig as any)[key];
      }
    }

    // 提取标准 ProxyOptions（排除 HTTPS 选项）
    // 使用类型断言，因为我们会在下面删除 HTTPS 选项
    const standardProxyOptions = { ...mergedCustomConfig } as Partial<ProxyOptions>;
    for (const key of httpsOptionKeys) {
      delete (standardProxyOptions as any)[key];
    }

    return {
      target,
      changeOrigin: true,
      // 启用 WebSocket 支持
      ws: wsConfig.enabled,
      rewrite: rewritePath ? this.createRewriteRule(rewritePath) : undefined,
      timeout: wsConfig.timeout,
      // 应用标准代理选项
      ...standardProxyOptions,
      configure: (proxy, options) => {
        // 应用 HTTPS 选项到 options 对象
        if (Object.keys(httpsOptions).length > 0) {
          Object.assign(options, httpsOptions);
        }
        // 请求开始
        proxy.on("proxyReq", async (proxyReq, req, res) => {
          const method = req.method || "GET";
          const originalUrl = req.url || "";
          const requestKey = `${method}:${originalUrl}`;

          // 构建完整的真实后端URL
          let rewrittenPath = originalUrl;
          if (rewritePath) {
            rewrittenPath = this.createRewriteRule(rewritePath)(originalUrl);
          }
          const fullUrl = `${target}${rewrittenPath}`;

          // 记录开始时间
          startTime.set(requestKey, Date.now());

          // 检测 SSE 请求
          const isSSE = this.isSSERequest(req);
          if (isSSE && sseConfig.enabled) {
            // 执行 SSE 中间件
            await this.executeSSEMiddleware(proxyReq, req, res, options);
            
            // 记录 SSE 连接日志
            if (sseConfig.logConnections) {
              this.logger.logSSEConnection(method, fullUrl);
            }
          }

          // 应用过滤器
          if (
            this.requestFilter &&
            !this.requestFilter(req.url || "", method)
          ) {
            return;
          }

          // 执行中间件
          await this.executeMiddleware(proxyReq, req, res, options);

          // 记录基础请求日志（非 SSE 请求）
          if (!isSSE) {
            this.logger.logRequest(method, fullUrl);
          }
        });

        // 响应返回
        proxy.on("proxyRes", (proxyRes, req, res) => {
          const method = req.method || "GET";
          const originalUrl = req.url || "";
          const status = proxyRes.statusCode || 0;
          const requestKey = `${method}:${originalUrl}`;

          // 构建完整的真实后端URL（响应阶段）
          let rewrittenPath = originalUrl;
          if (rewritePath) {
            rewrittenPath = this.createRewriteRule(rewritePath)(originalUrl);
          }
          const fullResponseUrl = `${target}${rewrittenPath}`;

          // 检测 SSE 响应
          const isSSE = this.isSSERequest(req);
          if (isSSE && sseConfig.enabled) {
            // 设置 SSE 必需的响应头
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲
            
            // 应用自定义 SSE 头部
            if (sseConfig.headers) {
              Object.entries(sseConfig.headers).forEach(([key, value]) => {
                res.setHeader(key, value);
              });
            }

            // 如果配置了重试间隔，添加 retry 头部
            if (sseConfig.retryInterval) {
              res.setHeader('Retry-After', sseConfig.retryInterval.toString());
            }

            // 监听 SSE 数据流
            if (sseConfig.logMessages) {
              let buffer = '';
              proxyRes.on('data', (chunk: Buffer) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留最后一个不完整的行
                
                lines.forEach(line => {
                  if (line.trim()) {
                    this.logger.logSSEMessage(fullResponseUrl, line, sseConfig.maxMessageLength, sseConfig.prettifyMessages);
                  }
                });
              });
            }
          }

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

          // 记录基础响应日志（非 SSE 请求）
          if (!isSSE) {
            this.logger.logResponse(method, fullResponseUrl, status, duration);
          }
        });

        // WebSocket 支持配置
        if (wsConfig.enabled) {
          // 设置自定义 WebSocket 配置
          if (wsConfig.headers && Object.keys(wsConfig.headers).length > 0) {
            const originalHeaders = this.options.customProxyConfig?.headers;
            this.options.customProxyConfig = {
              ...this.options.customProxyConfig,
              headers: {
                ...originalHeaders,
                ...wsConfig.headers
              }
            };
          }

          // WebSocket 连接建立日志
          proxy.on("proxyReqWs", (_proxyReq: any, req: any, socket: any, _options: any, head: any) => {
            const originalUrl = req.url || "";
            
            // 应用 WebSocket 过滤器
            if (this.webSocketFilter && !this.webSocketFilter(originalUrl)) {
              return;
            }

            // 构建完整的 WebSocket URL
            let rewrittenPath = originalUrl;
            if (rewritePath) {
              rewrittenPath = this.createRewriteRule(rewritePath)(originalUrl);
            }
            // 支持 HTTP -> WS 和 HTTPS -> WSS 的转换
            const wsTarget = target.replace(/^https/, 'wss').replace(/^http/, 'ws');
            const fullWsUrl = `${wsTarget}${rewrittenPath}`;

            // 记录 WebSocket 连接日志
            if (wsConfig.logConnections) {
              this.logger.info(`🔗 WebSocket 连接升级: ${fullWsUrl}`);
            }

            // 执行 WebSocket 中间件
            this.executeWebSocketMiddleware(null, req, socket, head).catch((error) => {
              this.logger.error(`WebSocket 中间件执行失败: ${error}`);
            });
          });

          // WebSocket 错误处理
          proxy.on("error", (err: any, req: any, _res: any) => {
            // 检查是否是 WebSocket 相关错误
            if (req.headers && req.headers.upgrade === 'websocket') {
              const originalUrl = req.url || "";
              let rewrittenPath = originalUrl;
              if (rewritePath) {
                rewrittenPath = this.createRewriteRule(rewritePath)(originalUrl);
              }
              // 支持 HTTP -> WS 和 HTTPS -> WSS 的转换
              const wsTarget = target.replace(/^https/, 'wss').replace(/^http/, 'ws');
              const fullWsUrl = `${wsTarget}${rewrittenPath}`;

              if (wsConfig.logConnections) {
                this.logger.error(`❌ WebSocket 连接失败: ${fullWsUrl} - ${err.message}`);
              }
            }
          });
        }

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

          // 记录错误日志
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

      proxy[routePath] = this.createProxyConfig(target, rewritePath, value);
      
      const wsStatus = typeof value === 'object' && value.ws?.enabled === false ? '❌' : '✅';
      const sseStatus = typeof value === 'object' && value.sse?.enabled === false ? '❌' : '✅';
      this.logger.debug(`添加代理: ${key} -> ${routePath} => ${target} (rewrite: ${rewritePath}) [WebSocket: ${wsStatus}] [SSE: ${sseStatus}]`);
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
            this.wsMiddleware = this.options.wsMiddleware || [];
            this.sseMiddleware = this.options.sseMiddleware || [];
            this.requestFilter = this.options.requestFilter;
            this.responseFilter = this.options.responseFilter;
            this.webSocketFilter = this.options.webSocketFilter;
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
export * from "./types.js";
export * from "./logger.js";
