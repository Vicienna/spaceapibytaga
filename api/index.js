const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const connectToDatabase = require('../db');

// Import route modules
const thrustersRouter = require('../routes/thrusters');
const shieldsRouter = require('../routes/shields');
const tanksRouter = require('../routes/tanks');
const planetsRouter = require('../routes/planets');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// Connect to DB (singleton)
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// ==================== API ROUTES ====================
app.use('/api/thrusters', thrustersRouter);
app.use('/api/shields', shieldsRouter);
app.use('/api/tanks', tanksRouter);
app.use('/api/planets', planetsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ==================== PING + DISCORD ALERT ====================
const BASE_URL = 'https://spacebytaga.vercel.app';

// Fungsi auto-detect semua endpoint dari Express router
function getAllEndpoints() {
  const endpoints = [];
  
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Direct routes (GET, POST, etc.)
      const path = middleware.route.path;
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase());
      
      if (path.startsWith('/api/') && !path.includes('*')) {
        methods.forEach(method => {
          endpoints.push({ method, path });
        });
      }
    } else if (middleware.name === 'router') {
      // Nested routers (/api/thrusters, etc.)
      middleware.handle.stack?.forEach((handler) => {
        if (handler.route) {
          const basePath = middleware.regexp.source
            .replace('\\/', '/')
            .replace('(?=\\/|$)', '')
            .replace('\\/?(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace(/\/\^/g, '')
            .replace(/\$\/i$/, '')
            .replace(/\\(.)/g, '$1');
          
          const path = handler.route.path;
          const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase());
          
          methods.forEach(method => {
            const fullPath = `${basePath}${path === '/' ? '' : path}`;
            if (!endpoints.find(e => e.method === method && e.path === fullPath)) {
              endpoints.push({ method, path: fullPath });
            }
          });
        }
      });
    }
  });
  
  return endpoints.sort((a, b) => a.path.localeCompare(b.path));
}

// Ping endpoint with Discord alert
app.get('/api/ping', async (req, res) => {
  const timestamp = new Date().toISOString();
  const source = req.query.source || 'manual';
  
  // Ambil semua endpoint
  const endpoints = getAllEndpoints();
  
  // Test semua endpoint
  const results = await Promise.all(
    endpoints.map(async (ep) => {
      try {
        const url = `${BASE_URL}${ep.path}`;
        const response = await fetch(url, { method: 'HEAD' }).catch(() => ({ status: 500 }));
        return {
          method: ep.method,
          path: ep.path,
          status: response.status || 500
        };
      } catch {
        return {
          method: ep.method,
          path: ep.path,
          status: 500
        };
      }
    })
  );
  
  // Format buat Discord
  const statsList = results
    .map(r => {
      const icon = r.status === 200 || r.status === 201 ? '🟢' : 
                   r.status === 404 ? '🟡' : '🔴';
      const method = r.method.padEnd(6, ' ');
      return `${icon} \`${method}\` [${r.path}](${BASE_URL}${r.path}) → \`${r.status}\``;
    })
    .join('\n');
  
  // Format stats ringkas
  const compactStats = results
    .map(r => {
      const icon = r.status === 200 || r.status === 201 ? '🟢' : 
                   r.status === 404 ? '🟡' : '🔴';
      return `${icon} **${r.method}** ${r.path} → ${r.status}`;
    })
    .join('\n');
  
  const allOk = results.every(r => r.status === 200 || r.status === 201);
  
  // Kirim ke Discord
  try {
    if (process.env.DISCORD_WEBHOOK) {
      await fetch(process.env.DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `${allOk ? '🟢' : '🔴'} SpacePixel API Status`,
            description: `**Server:** ${BASE_URL}\n**Time:** ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n**Source:** ${source}\n\n**Endpoints Stats:**\n${compactStats}`,
            color: allOk ? 65280 : 16711680,
            footer: { text: `Monitor tiap 1 menit • ${source}` },
            timestamp: new Date().toISOString()
          }]
        })
      });
    }
  } catch (err) {
    console.error('Discord webhook error:', err.message);
  }
  
  res.json({
    status: 'OK',
    ping: true,
    timestamp,
    source,
    endpoints_checked: results.length,
    all_healthy: allOk,
    results
  });
});

// ==================== LANDING PAGE ====================
app.get('/', async (req, res) => {
  const endpoints = getAllEndpoints();
  
  // Test endpoints buat status real-time
  const statuses = {};
  await Promise.all(
    endpoints.map(async (ep) => {
      try {
        const response = await fetch(`${BASE_URL}${ep.path}`, { method: 'HEAD' }).catch(() => ({ status: 500 }));
        statuses[`${ep.method} ${ep.path}`] = response.status || 500;
      } catch {
        statuses[`${ep.method} ${ep.path}`] = 500;
      }
    })
  );
  
  // Group by base path
  const grouped = {};
  endpoints.forEach(ep => {
    const parts = ep.path.split('/').filter(p => p);
    const group = parts[1] || 'root';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push({
      method: ep.method,
      path: ep.path,
      fullUrl: `${BASE_URL}${ep.path}`,
      status: statuses[`${ep.method} ${ep.path}`] || '?'
    });
  });
  
  const allOk = Object.values(statuses).every(s => s === 200 || s === 201);
  
  // Generate endpoint cards
  let cardsHTML = '';
  for (const [group, eps] of Object.entries(grouped)) {
    const groupIcon = { thrusters: '🚀', shields: '🛡️', tanks: '⛽', planets: '🌍', health: '❤️', ping: '📡' }[group] || '📦';
    const groupColor = allOk ? '#00ff88' : '#ff4444';
    
    const epsHTML = eps.map(ep => {
      const statusColor = ep.status === 200 || ep.status === 201 ? '#00ff88' : 
                          ep.status === 404 ? '#ffaa00' : '#ff4444';
      const methodColor = ep.method === 'GET' ? '#61affe' :
                          ep.method === 'POST' ? '#49cc90' :
                          ep.method === 'PUT' ? '#fca130' :
                          ep.method === 'DELETE' ? '#f93e3e' : '#999';
      return `
        <div class="endpoint-row">
          <span class="method" style="background:${methodColor}">${ep.method}</span>
          <a href="${ep.fullUrl}" target="_blank" class="path">${ep.path}</a>
          <span class="status" style="color:${statusColor}">${ep.status}</span>
        </div>`;
    }).join('');
    
    cardsHTML += `
      <div class="card">
        <div class="card-header">
          <span class="card-icon">${groupIcon}</span>
          <h2>/${group}</h2>
          <span class="badge">${eps.length} endpoint${eps.length > 1 ? 's' : ''}</span>
        </div>
        <div class="card-body">
          ${epsHTML}
        </div>
      </div>`;
  }
  
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SpacePixel API | Docs</title>
  <style>
    :root {
      --bg: #0a0a0f;
      --bg-card: #13131f;
      --text: #e0e0e0;
      --text-dim: #888;
      --accent: #7c3aed;
      --accent-glow: rgba(124, 58, 237, 0.3);
      --green: #00ff88;
      --red: #ff4444;
      --border: #1e1e30;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      background-image: 
        radial-gradient(ellipse at 20% 50%, rgba(124, 58, 237, 0.05) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(0, 255, 136, 0.03) 0%, transparent 50%);
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .hero {
      text-align: center;
      padding: 60px 20px 40px;
      position: relative;
    }
    
    .hero::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 200px;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--accent), transparent);
    }
    
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    
    h1 {
      font-size: 2.5em;
      font-weight: 800;
      background: linear-gradient(135deg, #c4b5fd, #7c3aed, #4c1d95);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }
    
    .subtitle {
      color: var(--text-dim);
      font-size: 1.1em;
      margin-bottom: 30px;
    }
    
    .status-bar {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 50px;
      padding: 8px 20px;
      font-size: 0.9em;
    }
    
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${allOk ? 'var(--green)' : 'var(--red)'};
      box-shadow: 0 0 10px ${allOk ? 'rgba(0,255,136,0.5)' : 'rgba(255,68,68,0.5)'};
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .info-bar {
      display: flex;
      justify-content: center;
      gap: 30px;
      flex-wrap: wrap;
      margin: 20px 0 40px;
      color: var(--text-dim);
      font-size: 0.85em;
    }
    
    .info-bar span {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .card:hover {
      border-color: var(--accent);
      box-shadow: 0 0 30px var(--accent-glow);
      transform: translateY(-2px);
    }
    
    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid var(--border);
    }
    
    .card-icon { font-size: 24px; }
    
    .card-header h2 {
      font-size: 1.1em;
      font-weight: 600;
      flex: 1;
    }
    
    .badge {
      background: var(--accent);
      color: white;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.75em;
      font-weight: 500;
    }
    
    .card-body {
      padding: 10px 0;
    }
    
    .endpoint-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 20px;
      transition: background 0.2s;
    }
    
    .endpoint-row:hover {
      background: rgba(255,255,255,0.03);
    }
    
    .method {
      display: inline-block;
      width: 60px;
      text-align: center;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75em;
      font-weight: 700;
      color: white;
      text-transform: uppercase;
    }
    
    .path {
      color: var(--text);
      text-decoration: none;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.9em;
      flex: 1;
      word-break: break-all;
    }
    
    .path:hover {
      color: var(--accent);
    }
    
    .status {
      font-weight: 600;
      font-size: 0.85em;
      min-width: 35px;
      text-align: right;
    }
    
    .footer {
      text-align: center;
      padding: 40px;
      color: var(--text-dim);
      font-size: 0.8em;
      border-top: 1px solid var(--border);
    }
    
    .footer a {
      color: var(--accent);
      text-decoration: none;
    }
    
    .quick-links {
      text-align: center;
      margin: 20px 0;
    }
    
    .quick-links a {
      display: inline-block;
      margin: 5px 10px;
      padding: 8px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      text-decoration: none;
      font-size: 0.85em;
      transition: all 0.2s;
    }
    
    .quick-links a:hover {
      border-color: var(--accent);
      background: rgba(124,58,237,0.1);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <div class="logo">🛸</div>
      <h1>SpacePixel API</h1>
      <p class="subtitle">Backend service for SpacePixel Discord Bot</p>
      <div class="status-bar">
        <span class="status-dot"></span>
        <span>${allOk ? 'All Systems Operational' : 'Some Endpoints Degraded'}</span>
      </div>
      <div class="info-bar">
        <span>🔗 ${BASE_URL}</span>
        <span>📡 ${endpoints.length} Endpoints</span>
        <span>🟢 Uptime Monitor Active</span>
      </div>
    </div>
    
    <div class="quick-links">
      <a href="/api/health">❤️ Health Check</a>
      <a href="/api/ping">📡 Ping Test</a>
      <a href="/api/thrusters">🚀 Thrusters</a>
      <a href="/api/shields">🛡️ Shields</a>
      <a href="/api/tanks">⛽ Tanks</a>
      <a href="/api/planets">🌍 Planets</a>
    </div>
    
    <div class="grid">
      ${cardsHTML}
    </div>
    
    <div class="footer">
      <p>SpacePixel Bot API • Deployed on <a href="https://vercel.com" target="_blank">Vercel</a></p>
      <p style="margin-top:5px;">Auto-generated docs • ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>
    </div>
  </div>
</body>
</html>`);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// Export for Vercel
module.exports = app;
module.exports.handler = serverless(app);
