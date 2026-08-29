import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Parâmetro de busca vazio' });
  }

  try {
    const mlbUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(q)}`;
    // Fetch nativo, sem máscaras, para evitar bloqueio heurístico do WAF
    const response = await fetch(mlbUrl, {
      headers: {
        'Accept': 'application/json'
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
