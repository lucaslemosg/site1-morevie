import type { VercelRequest, VercelResponse } from '@vercel/node';

const MOSU_COMPANY_ID = '01KS35KZ5QTH5RQ0Q115KXT016';
const MOSU_FUNNEL_ID = '01KVT1NFGDM98FQE7M4N7A4AJZ';
const CURRENT_OPERATOR_URL = `https://api.mosu.com.br/api/public/companies/${MOSU_COMPANY_ID}/funnels/${MOSU_FUNNEL_ID}/current-operator`;

const FIXED_MESSAGE =
  'Olá! Vim pelo anúncio da Morevie e gostaria de receber a apresentação privada.';

const ipRequests = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;

const first = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? '';

const formatEntrada = (raw: string) => {
  const n = Number(raw);
  return raw && !Number.isNaN(n) ? `R$ ${n.toLocaleString('pt-BR')}` : raw;
};

const buildDynamicMessage = (nome: string, entrada: string) =>
  `Olá! Sou ${nome} e vim pelo site da Morevie. Gostaria de receber a apresentação privada.\n\n` +
  `Valor de entrada disponível: ${formatEntrada(entrada)}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ?? 'unknown';
  const now = Date.now();
  const record = ipRequests.get(ip) ?? { count: 0, windowStart: now };
  if (now - record.windowStart > WINDOW_MS) { record.count = 0; record.windowStart = now; }
  record.count++;
  ipRequests.set(ip, record);
  if (record.count > MAX_PER_WINDOW) return res.status(429).json({ error: 'Too many requests' });

  const nome = first(req.query.nome);
  const telefone = first(req.query.telefone);
  const email = first(req.query.email);
  const entrada = first(req.query.entrada);
  const hp = first(req.query.hp);

  // modo site: veio pelo formulário do site (algum campo de lead presente).
  // modo Meta: redirect sem query string (a Meta já grava o lead nativamente).
  // honeypot preenchido => trata como bot: não grava e cai na mensagem fixa.
  const isSite = !!(nome || telefone || email || entrada) && !hp;

  // 1) modo site: valida campos obrigatórios e a config da planilha antes de qualquer coisa
  const sheetsUrl = process.env.SHEETS_URL;
  const sheetsToken = process.env.SHEETS_TOKEN;
  if (isSite) {
    if (!nome || !telefone || !email || !entrada) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }
    if (!sheetsUrl || !sheetsToken) return res.status(500).json({ error: 'Config error' });
  }

  // 2) busca o operador atual PRIMEIRO — gravar na planilha (passo 3) dispara o
  // round-robin, então o número precisa ser lido antes para não pular operador.
  let operatorPhone: string | null = null;
  try {
    const opRes = await fetch(CURRENT_OPERATOR_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (opRes.ok) {
      const data = (await opRes.json()) as { phone?: string };
      operatorPhone = data.phone ?? null;
    }
  } catch { /* usa fallback abaixo */ }

  const phone = operatorPhone ?? process.env.WHATSAPP_FALLBACK_PHONE ?? null;
  if (!phone) return res.status(502).send('Operador indisponível no momento.');

  // 3) só então grava o lead na planilha (dispara o avanço do round-robin p/ o próximo lead).
  // Aguarda a conclusão antes do redirect (serverless congela após o end()).
  if (isSite) {
    const params = new URLSearchParams({ token: sheetsToken!, nome, telefone, email, entrada });
    try {
      await fetch(`${sheetsUrl}?${params}`);
    } catch (err) {
      // não bloqueia o redirect, mas não some silenciosamente
      console.error('Falha ao gravar lead na planilha:', err);
    }
  }

  // 4) monta a URL do WhatsApp e redireciona
  const message = isSite ? buildDynamicMessage(nome, entrada) : FIXED_MESSAGE;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  res.setHeader('Location', url);
  return res.status(302).end();
}
