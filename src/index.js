const express = require('express');
const mysql = require('mysql2/promise');
const { Client } = require('pg');
const { createClient } = require('redis');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    mensaje: '¡Actualización automática con Dokploy!',
    version: '2.0.0',
    deploy: 'Git Push to Deploy',
    institucion: 'Universidad del Quindío',
    programa: 'Ingeniería de Sistemas y Computación',
    curso: 'Administración de Infraestructura de TI',
    plataforma: 'Dokploy PaaS',
    fecha: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ estado: 'saludable', uptime: process.uptime(), version: process.version, plataforma: 'Dokploy' });
});

app.get('/info', (req, res) => {
  const os = require('os');
  res.json({
    node_version: process.version, platform: process.platform, arch: process.arch,
    memory: { total: Math.round(os.totalmem() / 1024 / 1024) + ' MB', free: Math.round(os.freemem() / 1024 / 1024) + ' MB' }
  });
});

app.get('/db/mysql', async (req, res) => {
  try {
    const c = await mysql.createConnection({
      host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER, password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME, connectTimeout: 5000
    });
    const [rows] = await c.query('SELECT NOW() AS ahora, VERSION() AS version');
    await c.end();
    res.json({ estado: 'conectado', motor: 'MySQL', ...rows[0] });
  } catch (e) { res.status(500).json({ estado: 'error', motor: 'MySQL', error: e.message }); }
});

app.get('/db/postgres', async (req, res) => {
  const c = new Client({
    host: process.env.PG_HOST, port: process.env.PG_PORT || 5432,
    user: process.env.PG_USER, password: process.env.PG_PASSWORD,
    database: process.env.PG_NAME, connectionTimeoutMillis: 5000
  });
  try {
    await c.connect();
    const r = await c.query('SELECT NOW() AS ahora, version() AS version');
    res.json({ estado: 'conectado', motor: 'PostgreSQL', ...r.rows[0] });
  } catch (e) { res.status(500).json({ estado: 'error', motor: 'PostgreSQL', error: e.message }); }
  finally { await c.end().catch(() => {}); }
});

app.get('/db/redis', async (req, res) => {
  const c = createClient({
    url: `redis://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`,
    socket: { connectTimeout: 5000 }
  });
  try {
    await c.connect();
    const pong = await c.ping();
    res.json({ estado: 'conectado', motor: 'Redis', respuesta: pong });
  } catch (e) { res.status(500).json({ estado: 'error', motor: 'Redis', error: e.message }); }
  finally { await c.disconnect().catch(() => {}); }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${port}`);
  console.log('Plataforma: Dokploy PaaS');
});