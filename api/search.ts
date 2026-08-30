import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Parâmetro de busca vazio' });
  }

  try {
    const url = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://api.mercadolibre.com/sites/MLB/search?q=' + q);
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Erro no proxy AllOrigins: ${response.status}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Search Server Error]:', error);
    return res.status(500).json({ error: error.message || 'Erro interno no servidor' });
  }
}
