// SSE 测试后端服务 - 支持 HTTP、HTTPS、WebSocket
import express from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';
import { WebSocketServer } from 'ws';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import selfsigned from 'selfsigned';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HTTP_PORT = 3001;
const HTTPS_PORT = 3002;
const WS_PORT = 3003;
const WSS_PORT = 3004;

// 生成自签名证书（如果不存在）
function ensureCertificates() {
  const certPath = join(__dirname, 'cert.pem');
  const keyPath = join(__dirname, 'key.pem');

  if (!existsSync(certPath) || !existsSync(keyPath)) {
    console.log('🔐 生成自签名证书...');
    try {
      // 使用 selfsigned 库生成证书（纯 JavaScript，无需系统依赖）
      const attrs = [{ name: 'commonName', value: 'localhost' }];
      const pems = selfsigned.generate(attrs, {
        keySize: 2048,
        days: 365,
        algorithm: 'sha256'
      });

      // 保存证书和密钥到文件
      writeFileSync(certPath, pems.cert);
      writeFileSync(keyPath, pems.private);
   
      console.log('✅ 证书生成成功');
      console.log(`   📄 证书文件: ${certPath}`);
      console.log(`   🔑 密钥文件: ${keyPath}`);
    } catch (error) {
      console.error('❌ 证书生成失败:', error.message);
      return null;
    }
  } else {
    console.log('📋 使用现有证书文件');
  }

  try {
    return {
      cert: readFileSync(certPath),
      key: readFileSync(keyPath)
    };
  } catch (error) {
    console.warn('⚠️  读取证书失败:', error.message);
    return null;
  }
}

let sslOptions = null;
try {
  sslOptions = ensureCertificates();
} catch (error) {
  console.warn('⚠️  HTTPS 服务器将无法启动:', error.message);
}

const app = express();

// 启用 CORS
app.use(cors());
app.use(express.json());

// 存储所有 SSE 客户端连接
const clients = new Set();
// 存储所有 WebSocket 客户端连接
const wsClients = new Set();

// SSE 端点 - 基础测试
app.get('/api/sse', (req, res) => {
  console.log('📡 新的 SSE 连接请求');

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

  // 发送初始连接消息
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE 连接已建立', timestamp: new Date().toISOString() })}\n\n`);

  // 将客户端添加到集合
  clients.add(res);

  // 定期发送消息（每 2 秒）
  const interval = setInterval(() => {
    if (clients.has(res)) {
      const message = {
        type: 'message',
        data: {
          id: Date.now(),
          message: `服务器消息 - ${new Date().toLocaleTimeString()}`,
          random: Math.random().toFixed(4)
        },
        timestamp: new Date().toISOString()
      };
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    }
  }, 2000);

  // 客户端断开连接时清理
  req.on('close', () => {
    console.log('❌ SSE 客户端断开连接');
    clients.delete(res);
    clearInterval(interval);
    res.end();
  });
});

// SSE 端点 - 带自定义重试间隔
app.get('/api/sse/custom-retry', (req, res) => {
  console.log('📡 新的 SSE 连接请求 (自定义重试)');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Retry-After', '5000'); // 5 秒重试间隔

  res.write(`retry: 5000\n`);
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE 连接已建立（自定义重试间隔）', timestamp: new Date().toISOString() })}\n\n`);

  clients.add(res);

  const interval = setInterval(() => {
    if (clients.has(res)) {
      const message = {
        type: 'custom-message',
        data: {
          id: Date.now(),
          message: `自定义消息 - ${new Date().toLocaleTimeString()}`,
          retryInterval: 5000
        },
        timestamp: new Date().toISOString()
      };
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    }
  }, 3000);

  req.on('close', () => {
    console.log('❌ SSE 客户端断开连接 (自定义重试)');
    clients.delete(res);
    clearInterval(interval);
    res.end();
  });
});

// SSE 端点 - 模拟错误场景
app.get('/api/sse/error', (req, res) => {
  console.log('📡 新的 SSE 连接请求 (错误测试)');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE 连接已建立（错误测试）', timestamp: new Date().toISOString() })}\n\n`);

  clients.add(res);

  let messageCount = 0;
  const interval = setInterval(() => {
    if (clients.has(res)) {
      messageCount++;
      
      if (messageCount === 3) {
        // 模拟错误
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ type: 'error', message: '模拟错误消息', timestamp: new Date().toISOString() })}\n\n`);
      } else {
        const message = {
          type: 'message',
          data: {
            id: Date.now(),
            message: `消息 ${messageCount}`,
            timestamp: new Date().toISOString()
          }
        };
        res.write(`data: ${JSON.stringify(message)}\n\n`);
      }
    }
  }, 2000);

  req.on('close', () => {
    console.log('❌ SSE 客户端断开连接 (错误测试)');
    clients.delete(res);
    clearInterval(interval);
    res.end();
  });
});

// 普通 API 端点（用于对比）
app.get('/api/test', (req, res) => {
  res.json({
    message: '这是一个普通的 API 端点',
    protocol: req.protocol,
    timestamp: new Date().toISOString()
  });
});

// HTTP API 测试端点
app.get('/api/http-test', (req, res) => {
  res.json({
    protocol: 'HTTP',
    message: 'HTTP 代理测试成功',
    timestamp: new Date().toISOString()
  });
});

// HTTPS API 测试端点（通过 HTTPS 服务器提供）
app.get('/api/https-test', (req, res) => {
  res.json({
    protocol: 'HTTPS',
    message: 'HTTPS 代理测试成功',
    timestamp: new Date().toISOString()
  });
});

// 广播消息到所有连接的客户端
app.post('/api/sse/broadcast', (req, res) => {
  const { message } = req.body;
  const broadcastMessage = {
    type: 'broadcast',
    data: {
      message: message || '广播消息',
      timestamp: new Date().toISOString()
    }
  };

  let sentCount = 0;
  clients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(broadcastMessage)}\n\n`);
      sentCount++;
    } catch (error) {
      console.error('发送广播消息失败:', error);
    }
  });

  res.json({
    success: true,
    message: `消息已广播到 ${sentCount} 个客户端`,
    timestamp: new Date().toISOString()
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeConnections: clients.size,
    timestamp: new Date().toISOString()
  });
});

// 启动 HTTP 服务器
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, () => {
  console.log(`🚀 HTTP 服务器运行在 http://localhost:${HTTP_PORT}`);
  console.log(`📡 SSE 端点:`);
  console.log(`   - http://localhost:${HTTP_PORT}/api/sse`);
  console.log(`   - http://localhost:${HTTP_PORT}/api/sse/custom-retry`);
  console.log(`   - http://localhost:${HTTP_PORT}/api/sse/error`);
  console.log(`📤 广播端点: POST http://localhost:${HTTP_PORT}/api/sse/broadcast`);
  console.log(`❤️  健康检查: http://localhost:${HTTP_PORT}/health`);
  console.log(`🌐 HTTP 测试: http://localhost:${HTTP_PORT}/api/http-test`);
});

// 启动 HTTPS 服务器
if (sslOptions) {
  const httpsServer = https.createServer(sslOptions, app);
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`🔒 HTTPS 服务器运行在 https://localhost:${HTTPS_PORT}`);
    console.log(`📡 HTTPS SSE 端点:`);
    console.log(`   - https://localhost:${HTTPS_PORT}/api/sse`);
    console.log(`   - https://localhost:${HTTPS_PORT}/api/sse/custom-retry`);
    console.log(`   - https://localhost:${HTTPS_PORT}/api/sse/error`);
    console.log(`🌐 HTTPS 测试: https://localhost:${HTTPS_PORT}/api/https-test`);
    console.log(`⚠️  注意: 浏览器会显示证书警告，这是正常的（自签名证书）`);
  });
} else {
  console.log('⚠️  HTTPS 服务器未启动（缺少证书）');
}

// 启动 WebSocket 服务器 (WS)
const wsServer = new WebSocketServer({ port: WS_PORT });
wsServer.on('connection', (ws, req) => {
  const clientId = Date.now();
  wsClients.add(ws);
  console.log(`🔗 WebSocket 客户端连接 (WS): ${clientId}`);

  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'connected',
    protocol: 'WS',
    clientId,
    message: 'WebSocket 连接已建立',
    timestamp: new Date().toISOString()
  }));

  // 定期发送消息
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'message',
        protocol: 'WS',
        data: {
          id: Date.now(),
          message: `WebSocket 消息 - ${new Date().toLocaleTimeString()}`,
          random: Math.random().toFixed(4)
        },
        timestamp: new Date().toISOString()
      }));
    }
  }, 2000);

  // 接收消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`📨 收到 WebSocket 消息 (WS):`, data);
      
      // 回显消息
      ws.send(JSON.stringify({
        type: 'echo',
        protocol: 'WS',
        original: data,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('解析 WebSocket 消息失败:', error);
    }
  });

  // 断开连接
  ws.on('close', () => {
    console.log(`❌ WebSocket 客户端断开 (WS): ${clientId}`);
    wsClients.delete(ws);
    clearInterval(interval);
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket 错误 (WS):`, error);
    wsClients.delete(ws);
    clearInterval(interval);
  });
});

console.log(`🔗 WebSocket 服务器 (WS) 运行在 ws://localhost:${WS_PORT}`);

// 启动 WebSocket Secure 服务器 (WSS)
if (sslOptions) {
  const httpsServerForWSS = https.createServer(sslOptions);
  const wssServer = new WebSocketServer({ server: httpsServerForWSS });
  
  httpsServerForWSS.listen(WSS_PORT, () => {
    console.log(`🔒 WebSocket Secure 服务器 (WSS) 运行在 wss://localhost:${WSS_PORT}`);
  });

  wssServer.on('connection', (ws, req) => {
    const clientId = Date.now();
    wsClients.add(ws);
    console.log(`🔗 WebSocket Secure 客户端连接 (WSS): ${clientId}`);

    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'connected',
      protocol: 'WSS',
      clientId,
      message: 'WebSocket Secure 连接已建立',
      timestamp: new Date().toISOString()
    }));

    // 定期发送消息
    const interval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'message',
          protocol: 'WSS',
          data: {
            id: Date.now(),
            message: `WebSocket Secure 消息 - ${new Date().toLocaleTimeString()}`,
            random: Math.random().toFixed(4)
          },
          timestamp: new Date().toISOString()
        }));
      }
    }, 2000);

    // 接收消息
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`📨 收到 WebSocket Secure 消息 (WSS):`, data);
        
        // 回显消息
        ws.send(JSON.stringify({
          type: 'echo',
          protocol: 'WSS',
          original: data,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('解析 WebSocket Secure 消息失败:', error);
      }
    });

    // 断开连接
    ws.on('close', () => {
      console.log(`❌ WebSocket Secure 客户端断开 (WSS): ${clientId}`);
      wsClients.delete(ws);
      clearInterval(interval);
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket Secure 错误 (WSS):`, error);
      wsClients.delete(ws);
      clearInterval(interval);
    });
  });
} else {
  console.log('⚠️  WebSocket Secure 服务器未启动（缺少证书）');
}

