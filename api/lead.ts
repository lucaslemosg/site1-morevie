import type { VercelRequest, VercelResponse } from '@vercel/node';

const ipRequests = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hora
const MAX_PER_WINDOW = 5;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ?? 'unknown';

  const now = Date.now();
  const record = ipRequests.get(ip) ?? { count: 0, windowStart: now };
  if (now - record.windowStart > WINDOW_MS) { record.count = 0; record.windowStart = now; }
  record.count++;
  ipRequests.set(ip, record);
  if (record.count > MAX_PER_WINDOW) return res.status(429).json({ error: 'Too many requests' });

  const { nome, telefone, email, entrada, hp } = req.body ?? {};

  // honeypot — bots preenchem campos ocultos
  if (hp) return res.status(200).json({ ok: true });

  if (!nome || !telefone || !email || !entrada) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  const sheetsUrl = process.env.SHEETS_URL;
  if (!sheetsUrl) return res.status(500).json({ error: 'Config error' });

  const params = new URLSearchParams({ nome, telefone, email, entrada });
  try {
    await fetch(`${sheetsUrl}?${params}`);
  } catch { /* ignora falha de rede */ }

  return res.status(200).json({ ok: true });
}
