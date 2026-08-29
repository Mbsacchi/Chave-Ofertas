import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Parâmetro de busca vazio' });
  }

  // Captura o IP real do usuário (navegador) para repassar ao ML
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';

  try {
    const mlbUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(q)}`;
    
    const response = await fetch(mlbUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'X-Forwarded-For': clientIp as string
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Erro ML: ${response.status}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
