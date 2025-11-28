import type { UserConfig } from "vitepress";

const config: UserConfig = {
  lang: "zh-CN",
  title: "vite-enhanced-proxy",
  description: "功能全面的 Vite 代理插件，提供日志、环境切换、中间件等能力",
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "指南", link: "/guide/getting-started" },
      { text: "配置", link: "/guide/configuration" },
      { text: "高级用法", link: "/guide/advanced" },
      { text: "API", link: "/guide/api" }
    ],
    sidebar: {
      "/guide/": [
        {
          text: "快速上手",
          items: [
            { text: "简介", link: "/guide/getting-started" },
            { text: "安装与使用", link: "/guide/getting-started#安装" },
            { text: "快速示例", link: "/guide/getting-started#快速示例" }
          ]
        },
        {
          text: "配置参考",
          items: [
            { text: "核心配置", link: "/guide/configuration" },
            { text: "日志系统", link: "/guide/logging" },
            { text: "外部配置文件", link: "/guide/external-config" }
          ]
        },
        {
          text: "高级能力",
          items: [
            { text: "高级用法", link: "/guide/advanced" },
            { text: "运行时控制", link: "/guide/runtime" },
            { text: "故障排查", link: "/guide/troubleshooting" }
          ]
        },
        {
          text: "API 参考",
          items: [{ text: "API 列表", link: "/guide/api" }]
        }
      ]
    },
    editLink: {
      pattern: "https://github.com/22wink/vite-enhanced-proxy/edit/main/docs/:path",
      text: "在 GitHub 上编辑此页"
    },
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/22wink/vite-enhanced-proxy"
      }
    ],
    footer: {
      message: "基于 MIT 许可证发布",
      copyright: "Copyright © 2525-present 22wink"
    }
  }
};

export default config;

