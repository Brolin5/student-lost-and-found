const crypto = require('crypto');
const http = require('http');
const https = require('https');

// Connected WebSocket sockets set
const clients = new Set();

// Keep-Alive Plunger telemetry state
const plungerState = {
  active: false,
  targetUrl: process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')}/api/health`
    : 'https://student-lost-and-found.onrender.com/api/health',
  intervalMs: 10 * 60 * 1000, // 10 minutes (Render sleeps after 15 mins)
  totalPings: 0,
  lastPingAt: null,
  lastStatus: 'initialized',
  startedAt: new Date().toISOString()
};

let plungerInterval = null;
let wsHeartbeatInterval = null;

/**
 * Encodes a string or object into an RFC 6455 WebSocket text frame
 */
function encodeWsFrame(data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  const payloadByteLength = Buffer.byteLength(payload);
  let header;

  if (payloadByteLength < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text frame
    header[1] = payloadByteLength;
  } else if (payloadByteLength < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payloadByteLength, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payloadByteLength), 2);
  }

  return Buffer.concat([header, Buffer.from(payload)]);
}

/**
 * Decodes an incoming masked client WebSocket frame
 */
function decodeWsFrame(buffer) {
  if (buffer.length < 2) return null;
  const firstByte = buffer[0];
  const opcode = firstByte & 0x0f;

  // Connection close frame
  if (opcode === 0x08) return { opcode: 0x08, payload: null };
  // Ping frame
  if (opcode === 0x09) return { opcode: 0x09, payload: null };
  // Pong frame
  if (opcode === 0x0a) return { opcode: 0x0a, payload: null };
  // Only process text frames (0x01)
  if (opcode !== 0x01) return null;

  const secondByte = buffer[1];
  const isMasked = Boolean(secondByte & 0x80);
  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }

  let maskKey = null;
  if (isMasked) {
    if (buffer.length < offset + 4) return null;
    maskKey = buffer.subarray(offset, offset + 4);
    offset += 4;
  }

  if (buffer.length < offset + payloadLength) return null;
  const payloadBuffer = Buffer.from(buffer.subarray(offset, offset + payloadLength));

  if (isMasked && maskKey) {
    for (let i = 0; i < payloadBuffer.length; i++) {
      payloadBuffer[i] ^= maskKey[i % 4];
    }
  }

  return {
    opcode,
    payload: payloadBuffer.toString('utf8')
  };
}

/**
 * Broadcasts a JSON event to all connected WebSocket clients
 */
function broadcastEvent(type, data = {}) {
  const message = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    data,
    timestamp: new Date().toISOString()
  };

  const frame = encodeWsFrame(message);
  for (const socket of clients) {
    if (!socket.destroyed && socket.writable) {
      try {
        socket.write(frame);
      } catch (err) {
        clients.delete(socket);
      }
    } else {
      clients.delete(socket);
    }
  }
}

/**
 * Initializes the RFC 6455 WebSocket server on the HTTP server instance
 */
function initRealtimeServer(server) {
  server.on('upgrade', (req, socket, head) => {
    const urlPath = (req.url || '').split('?')[0];
    if (urlPath !== '/ws' && urlPath !== '/api/ws') {
      socket.destroy();
      return;
    }

    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n'
    ];

    socket.write(headers.join('\r\n'));
    socket.setNoDelay(true);
    clients.add(socket);

    // Send immediate welcome / sync confirmation
    try {
      socket.write(
        encodeWsFrame({
          id: `welcome-${Date.now()}`,
          type: 'CONNECTED',
          data: {
            message: 'Connected to Nile University Real-Time Campus Radar',
            activeClients: clients.size,
            plungerStatus: plungerState.lastStatus
          },
          timestamp: new Date().toISOString()
        })
      );
    } catch (_) {}

    socket.on('data', (buffer) => {
      try {
        const decoded = decodeWsFrame(buffer);
        if (!decoded) return;

        if (decoded.opcode === 0x08) {
          // Client requested close
          clients.delete(socket);
          socket.end();
          return;
        }

        if (decoded.opcode === 0x09) {
          // Respond with pong frame
          const pong = Buffer.from([0x8a, 0x00]);
          socket.write(pong);
          return;
        }

        if (decoded.payload) {
          const parsed = JSON.parse(decoded.payload);
          if (parsed.type === 'PING') {
            socket.write(
              encodeWsFrame({
                type: 'PONG',
                timestamp: new Date().toISOString(),
                plunger: getPlungerStats()
              })
            );
          }
        }
      } catch (_) {}
    });

    socket.on('close', () => {
      clients.delete(socket);
    });

    socket.on('error', () => {
      clients.delete(socket);
    });
  });

  // Periodic heartbeat to keep Render WebSocket connections open
  if (!wsHeartbeatInterval) {
    wsHeartbeatInterval = setInterval(() => {
      broadcastEvent('HEARTBEAT', {
        activeClients: clients.size,
        uptimeSeconds: Math.floor(process.uptime())
      });
    }, 25000);
    if (wsHeartbeatInterval.unref) wsHeartbeatInterval.unref();
  }
}

/**
 * Executes a single keep-alive ping to prevent Render free-tier spin-down
 */
function triggerPlungerPing(customUrl) {
  const target = customUrl || plungerState.targetUrl;
  const client = target.startsWith('https') ? https : http;

  return new Promise((resolve) => {
    const req = client.get(target, { timeout: 10000 }, (res) => {
      res.resume();
      plungerState.totalPings += 1;
      plungerState.lastPingAt = new Date().toISOString();
      plungerState.lastStatus = `HTTP ${res.statusCode}`;
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode });
    });

    req.on('error', (err) => {
      plungerState.totalPings += 1;
      plungerState.lastPingAt = new Date().toISOString();
      plungerState.lastStatus = `Error: ${err.message}`;
      resolve({ ok: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      plungerState.lastStatus = 'Timeout';
      resolve({ ok: false, error: 'Timeout' });
    });
  });
}

/**
 * Starts the automatic background Keep-Alive Plunger loop
 */
function startKeepAlivePlunger() {
  if (plungerInterval) return;
  plungerState.active = true;

  // Initial warm-up ping after 15 seconds
  const warmup = setTimeout(() => {
    triggerPlungerPing();
  }, 15000);
  if (warmup.unref) warmup.unref();

  // Periodic ping every 10 minutes
  plungerInterval = setInterval(() => {
    triggerPlungerPing();
  }, plungerState.intervalMs);

  if (plungerInterval.unref) plungerInterval.unref();
  console.log(`[Plunger] Keep-Alive Plunger active -> pinging ${plungerState.targetUrl} every 10m`);
}

function getPlungerStats() {
  return {
    ...plungerState,
    connectedSocketClients: clients.size,
    uptimeSeconds: Math.floor(process.uptime())
  };
}

module.exports = {
  initRealtimeServer,
  broadcastEvent,
  startKeepAlivePlunger,
  triggerPlungerPing,
  getPlungerStats
};
