---
layout: home
title: 首页
hero:
  name: vite-enhanced-proxy
  text: 为 Vite 项目打造的终极代理增强插件
  tagline: 彩色日志、环境切换、中间件、WebSocket/SSE、零依赖，一站式提升开发体验
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/22wink/vite-enhanced-proxy
features:
  - title: 彩色日志与可观测性
    details: 内置级别化日志、请求/响应详情、查询参数展示，支持 WebSocket 与 SSE 消息，调试代理像读故事一样轻松。
  - title: 灵活的环境与目标管理
    details: 支持任意环境键、动态 targets、URL 重写、运行时切换，让多后端协同调试不再痛苦。
  - title: 中间件与过滤器
    details: 通过请求/响应过滤器及多种中间件扩展点，轻松植入鉴权、埋点、性能统计等自定义逻辑。
  - title: 完整类型与零依赖
    details: 100% TypeScript 支持，API 直观友好，不引入额外运行时依赖，安装即用。
---

::: tip 面向真实场景
插件在多端、多人协作的 Vite 应用中长期打磨，覆盖 HTTP、WebSocket、SSE 等多形态代理需求，并提供完善的监控手段。
:::

通过右上角导航进入「指南」「配置」「高级用法」等章节，或直接阅读下方推荐内容：

- `指南 / 快速上手`：了解安装、基础配置与完整示例
- `配置 / 核心选项`：查看所有可用配置项及默认值
- `高级用法`：掌握过滤器、中间件、WS/SSE、外部配置等能力
- `API 参考`：深入 ViteProxyPlugin、日志器等高级接口
