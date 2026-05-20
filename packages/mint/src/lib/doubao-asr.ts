import { gzipSync, gunzipSync } from 'zlib';
import WebSocket from 'ws';
import { createLogger } from '@/lib/logger';

const log = createLogger('doubao-asr');

// ── Binary Protocol Helpers ───────────────────────────────────────────

function buildHeader(
  messageType: number,
  flags: number,
  serialization: number,
  compression: number,
): Buffer {
  return Buffer.from([
    0x11, // version=1, header_size=1 (1*4=4 bytes)
    (messageType << 4) | flags,
    (serialization << 4) | compression,
    0x00, // reserved
  ]);
}

/**
 * Build a "full client request" packet (JSON config with Gzip compression).
 */
function buildFullClientRequest(config: object): Buffer {
  const header = buildHeader(0x01, 0x00, 0x01, 0x01); // type=full, flags=0, JSON, gzip
  const payload = gzipSync(Buffer.from(JSON.stringify(config)));
  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length);
  return Buffer.concat([header, size, payload]);
}

/**
 * Build an "audio only request" packet.
 * sequence > 0 for normal packets, < 0 for the last packet.
 */
function buildAudioPacket(audio: Buffer, sequence: number): Buffer {
  const isLast = sequence < 0;
  const flags = isLast ? 0x03 : 0x01; // 0x01=positive seq, 0x03=negative seq (last)
  const header = buildHeader(0x02, flags, 0x00, 0x01); // type=audio, raw, gzip
  const seqBuf = Buffer.alloc(4);
  seqBuf.writeInt32BE(sequence);
  const compressed = gzipSync(audio);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(compressed.length);
  return Buffer.concat([header, seqBuf, size, compressed]);
}

interface ParsedResponse {
  type: 'result' | 'error';
  sequence: number;
  isLast: boolean;
  payload: Record<string, unknown>;
}

/**
 * Parse a binary response from the Doubao ASR server.
 */
function parseResponse(data: Buffer): ParsedResponse {
  const msgType = (data[1] >> 4) & 0x0f;
  const flags = data[1] & 0x0f;

  if (msgType === 0x0f) {
    const errorCode = data.readUInt32BE(4);
    const errorMsgSize = data.readUInt32BE(8);
    const errorMsg = data.slice(12, 12 + errorMsgSize).toString('utf-8');
    return {
      type: 'error',
      sequence: 0,
      isLast: true,
      payload: { code: errorCode, message: errorMsg },
    };
  }

  const compression = data[2] & 0x0f;
  const sequence = data.readUInt32BE(4);
  const payloadSize = data.readUInt32BE(8);
  let payload = data.slice(12, 12 + payloadSize);

  if (compression === 0x01) {
    payload = gunzipSync(payload);
  }

  const json = JSON.parse(payload.toString('utf-8'));
  const isLast = flags === 0x03;

  return { type: 'result', sequence, isLast, payload: json };
}

// ── Session Management ────────────────────────────────────────────────

interface AsrSession {
  ws: WebSocket;
  sequence: number;
  latestText: string;
  isDone: boolean;
  error: string | null;
}

const sessions = new Map<string, AsrSession>();

/**
 * Create a new ASR session by opening a WebSocket to Doubao.
 */
export async function createSession(apiKey: string, resourceId: string): Promise<string> {
  const sessionId = crypto.randomUUID();

  const ws = new WebSocket('wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async', {
    headers: {
      'X-Api-Key': apiKey,
      'X-Api-Resource-Id': resourceId,
      'X-Api-Connect-Id': sessionId,
      'X-Api-Sequence': '-1',
    },
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error('连接豆包 ASR 超时'));
    }, 10000);

    ws.on('unexpected-response', (_req, res) => {
      clearTimeout(timeout);
      reject(new Error(`ASR 服务返回 HTTP ${res.statusCode}`));
    });

    ws.on('open', () => {
      clearTimeout(timeout);

      const config = {
        user: { uid: 'mint-app', platform: 'Web' },
        audio: {
          format: 'pcm',
          rate: 16000,
          bits: 16,
          channel: 1,
        },
        request: {
          model_name: 'bigmodel',
          enable_itn: true,
          enable_punc: true,
          result_type: 'full',
        },
      };

      ws.send(buildFullClientRequest(config));

      const session: AsrSession = {
        ws,
        sequence: 1,
        latestText: '',
        isDone: false,
        error: null,
      };
      sessions.set(sessionId, session);

      ws.on('message', (raw: Buffer) => {
        try {
          const resp = parseResponse(raw);
          if (resp.type === 'error') {
            log.error('ASR error', resp.payload);
            session.error = `ASR 错误: ${JSON.stringify(resp.payload)}`;
            session.isDone = true;
            return;
          }
          const text = (resp.payload as Record<string, Record<string, string>>)?.result?.text;
          if (text) {
            session.latestText = text;
          }
          if (resp.isLast) {
            session.isDone = true;
          }
        } catch (err) {
          log.error('Parse response error', { error: String(err) });
        }
      });

      ws.on('error', (err) => {
        log.error('WebSocket error', { message: err.message });
        session.error = `WebSocket 错误: ${err.message}`;
        session.isDone = true;
      });

      ws.on('close', () => {
        session.isDone = true;
      });

      resolve(sessionId);
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Send an audio chunk to an existing ASR session.
 * Returns the latest transcribed text.
 */
export function sendAudioChunk(
  sessionId: string,
  audio: Buffer,
  isLast: boolean,
): { text: string; error: string | null; done: boolean } {
  const session = sessions.get(sessionId);
  if (!session) {
    return { text: '', error: '会话不存在', done: true };
  }
  if (session.error) {
    return { text: session.latestText, error: session.error, done: true };
  }

  session.sequence++;
  const seq = isLast ? -session.sequence : session.sequence;
  const packet = buildAudioPacket(audio, seq);

  try {
    session.ws.send(packet);
  } catch (err) {
    return {
      text: session.latestText,
      error: `发送音频失败: ${(err as Error).message}`,
      done: true,
    };
  }

  if (isLast) {
    // Give a brief moment for the last response to arrive
    session.isDone = true;
    setTimeout(() => {
      session.ws.close();
      sessions.delete(sessionId);
    }, 2000);
  }

  return { text: session.latestText, error: null, done: session.isDone };
}

/**
 * Force-close an ASR session.
 */
export function closeSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    try {
      session.ws.close();
    } catch {
      // ignore
    }
    sessions.delete(sessionId);
  }
}
