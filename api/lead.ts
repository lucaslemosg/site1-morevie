import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGIN = 'https://site1-morevie.vercel.app';
const RECAPTCHA_VERIFY = 'https://www.google.com/recaptcha/api/siteverify';
const MIN_SCORE = 0.5;

const MOSU_COMPANY_ID = '01KS35KZ5QTH5RQ0Q115KXT016';
const MOSU_FUNNEL_ID = '01KVT1NFGDM98FQE7M4N7A4AJZ';
const CURRENT_OPERATOR_URL = `https://api.mosu.com.br/api/public/companies/${MOSU_COMPANY_ID}/funnels/${MOSU_FUNNEL_ID}/current-operator`;

const ipRequests = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const origin = (req.headers['origin'] ?? req.headers['referer'] ?? '') as string;
  if (!origin.startsWith(ALLOWED_ORIGIN)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ?? 'unknown';
  const now = Date.now();
  const record = ipRequests.get(ip) ?? { count: 0, windowStart: now };
  if (now - record.windowStart > WINDOW_MS) { record.count = 0; record.windowStart = now; }
  record.count++;
  ipRequests.set(ip, record);
  if (record.count > MAX_PER_WINDOW) return res.status(429).json({ error: 'Too many requests' });

  const { nome, telefone, email, entrada, hp, recaptchaToken } = req.body ?? {};

  if (hp) return res.status(200).json({ ok: true });

  // verifica reCAPTCHA
  const recaptchaSecret = process.env.RECAPTCHA_SECRET;
  if (recaptchaSecret && recaptchaToken) {
    const verify = await fetch(RECAPTCHA_VERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: recaptchaSecret, response: recaptchaToken }),
    });
    const result = await verify.json() as { success: boolean; score: number };
    if (!result.success || result.score < MIN_SCORE) {
      return res.status(403).json({ error: 'Bot detectado' });
    }
  }

  if (!nome || !telefone || !email || !entrada) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  const sheetsUrl = process.env.SHEETS_URL;
  const sheetsToken = process.env.SHEETS_TOKEN;
  if (!sheetsUrl || !sheetsToken) return res.status(500).json({ error: 'Config error' });

  // 1) busca o operador atual para direcionar o lead ao WhatsApp
  let phone: string | null = null;
  try {
    const opRes = await fetch(CURRENT_OPERATOR_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (opRes.ok) {
      const data = (await opRes.json()) as { phone?: string };
      phone = data.phone ?? null;
    }
  } catch { /* não bloqueia o lead */ }

  // 2) grava o lead na planilha
  const params = new URLSearchParams({ token: sheetsToken, nome, telefone, email, entrada });
  try {
    await fetch(`${sheetsUrl}?${params}`);
  } catch { /* ignora */ }

  return res.status(200).json({ ok: true, phone });
}
