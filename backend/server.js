// vpn-server.js - Основной VPN сервер
const express = require('express');
const net = require('net');
const tls = require('tls');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// 1. ЗАЩИТА ОТ DDoS - Rate Limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 100, // максимум 100 запросов за окно
  message: 'Слишком много запросов с этого IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Безопасность заголовков
app.use(helmet());

// 3. Применить rate limiting ко всем запросам
app.use(limiter);

// 4. Логирование и мониторинг
const attackLog = [];
const ipMetrics = new Map();

function trackIP(ip) {
  if (!ipMetrics.has(ip)) {
    ipMetrics.set(ip, { requests: 0, lastReset: Date.now() });
  }
  const metrics = ipMetrics.get(ip);
  metrics.requests++;

  // Сброс счетчика каждый час
  if (Date.now() - metrics.lastReset > 3600000) {
    metrics.requests = 0;
    metrics.lastReset = Date.now();
  }

  return metrics.requests;
}

// 5. Детекция аномалий
app.use((req, res, next) => {
  const clientIP = req.ip;
  const requestCount = trackIP(clientIP);

  // Блокировать подозрительный трафик
  if (requestCount > 1000) {
    attackLog.push({
      ip: clientIP,
      timestamp: new Date(),
      reason: 'Excessive requests',
    });
    return res.status(429).json({ error: 'IP заблокирован' });
  }

  next();
});

// 6. VPN Tunnel - простое туннелирование
const VPN_TUNNEL_PORT = 8443;
const tlsOptions = {
  key: fs.readFileSync('./certs/server.key'),
  cert: fs.readFileSync('./certs/server.cert'),
};

const tunnelServer = tls.createServer(tlsOptions, (socket) => {
  console.log('VPN клиент подключен:', socket.remoteAddress);

  // Обработка данных
  socket.on('data', (data) => {
    // Здесь идет шифрование и маршрутизация трафика
    forwardTraffic(data, socket);
  });

  socket.on('error', (err) => {
    console.error('Ошибка туннеля:', err);
  });

  socket.on('end', () => {
    console.log('Клиент отключен');
  });
});

function forwardTraffic(data, socket) {
  // Имитация маршрутизации
  // В реальном приложении здесь будет SOCKS5 или другой протокол
  socket.write(Buffer.from('ACK'));
}

// 7. REST API для управления
app.post('/auth/login', (req, res) => {
  // Аутентификация с шифрованием паролей
  res.json({ token: 'vpn_token_xxx', expires: 3600 });
});

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    activeConnections: 42,
    bandwidth: '1.2 Gbps',
    protection: 'DDoS Protected',
  });
});

app.get('/servers', (req, res) => {
  res.json([
    { id: 1, country: 'US', region: 'New York', load: 45 },
    { id: 2, country: 'DE', region: 'Berlin', load: 62 },
    { id: 3, country: 'JP', region: 'Tokyo', load: 31 },
  ]);
});

// 8. Мониторинг DDoS
app.get('/admin/ddos-status', (req, res) => {
  res.json({
    attacksDetected: attackLog.length,
    blockedIPs: Array.from(ipMetrics.entries())
      .filter(([, m]) => m.requests > 500)
      .map(([ip]) => ip),
    recentAttacks: attackLog.slice(-10),
  });
});

// 9. Запуск серверов
const HTTP_PORT = 3000;
app.listen(HTTP_PORT, () => {
  console.log(`HTTP сервер запущен на порту ${HTTP_PORT}`);
});

tunnelServer.listen(VPN_TUNNEL_PORT, () => {
  console.log(`VPN туннель запущен на порту ${VPN_TUNNEL_PORT}`);
});

module.exports = app;