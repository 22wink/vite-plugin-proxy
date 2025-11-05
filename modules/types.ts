import type { ProxyOptions } from "vite";

// 代理环境枚举
export enum ProxyEnv {
  Local = "local",
  Development = "development",
  Staging = "staging",
  Production = "production",
  Testing = "testing"
}

// 代理目标配置
export interface ProxyTarget {
  [key: string]: string;
}

// 代理目标映射
export type ProxyTargets = Record<ProxyEnv, ProxyTarget>;

// 日志级别
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4
}

// 日志配置
export interface LoggerConfig {
  level?: LogLevel;
  colorful?: boolean;
  timestamp?: boolean;
  showMethod?: boolean;
  showStatus?: boolean;
  showError?: boolean;
  prefix?: string;
  // 新增详细信息配置
  showRequestHeaders?: boolean;
  showRequestBody?: boolean;
  showResponseHeaders?: boolean;
  showResponseBody?: boolean;
  maxBodyLength?: number;
  prettifyJson?: boolean;
  showQueryParams?: boolean;
}

// 过滤器函数类型
export type RequestFilter = (url: string, method: string) => boolean;
export type ResponseFilter = (
  url: string,
  method: string,
  status: number
) => boolean;

// 中间件函数类型
export type ProxyMiddleware = (
  proxyReq: any,
  req: any,
  res: any,
  options: any
) => void | Promise<void>;

// 插件配置选项
export interface ProxyPluginOptions {
  // 基础配置
  env?: ProxyEnv;
  targets?: Partial<ProxyTargets>;

  // 日志配置
  logger?: LoggerConfig;

  // 过滤器
  requestFilter?: RequestFilter;
  responseFilter?: ResponseFilter;

  // 中间件
  middleware?: ProxyMiddleware[];

  // 自定义代理配置
  customProxyConfig?: Partial<ProxyOptions>;

  // 重写规则
  rewriteRules?: Record<string, string>;

  // 开发模式特定配置
  devOnly?: boolean;

  // 是否启用代理
  enabled?: boolean;
}

// 内部使用的插件状态
export interface PluginState {
  env: ProxyEnv;
  targets: ProxyTargets;
  logger: Required<LoggerConfig>;
  enabled: boolean;
}

// 代理事件类型
export interface ProxyEvents {
  onProxyReq?: (proxyReq: any, req: any, res: any) => void;
  onProxyRes?: (proxyRes: any, req: any, res: any) => void;
  onError?: (err: Error, req: any, res: any) => void;
}
