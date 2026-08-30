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

  // 1. CREDENCIAIS DA APLICAÇÃO MERCADO LIVRE
  const CLIENT_ID = process.env.ML_CLIENT_ID || '6879567119348118';
  const CLIENT_SECRET = process.env.ML_CLIENT_SECRET || 'H3YuFE0oK2bLZJAJOVUYF0oMSGixczHb';

  try {
    console.log(`[ML Auth] Solicitando access_token para Client ID: ${CLIENT_ID}`);

    // PASSO 1: Obter access_token via OAuth (client_credentials)
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      })
    });

    if (!tokenResponse.ok) {
      const tokenErrorText = await tokenResponse.text();
      console.error(`[ML Auth Error] Falha ao autenticar no ML (${tokenResponse.status}):`, tokenErrorText);
      return res.status(tokenResponse.status).json({ 
        error: `Falha na autenticação OAuth do Mercado Livre: status ${tokenResponse.status}`,
        details: tokenErrorText
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('[ML Auth Success] Access token obtido com sucesso!');

    // PASSO 2: Fazer a busca de produtos autenticada
    const mlbUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(q.trim())}`;
    console.log(`[ML Search] Buscando termo "${q}" na rota: ${mlbUrl}`);

    const searchResponse = await fetch(mlbUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      const searchErrorText = await searchResponse.text();
      console.error(`[ML Search Error] Falha na busca (${searchResponse.status}):`, searchErrorText);
      return res.status(searchResponse.status).json({ 
        error: `Erro na busca do Mercado Livre: status ${searchResponse.status}`,
        details: searchErrorText
      });
    }

    const searchData = await searchResponse.json();
    console.log(`[ML Search Success] Encontrados ${searchData.results?.length || 0} produtos.`);

    return res.status(200).json(searchData);
  } catch (error: any) {
    console.error('[ML Server Error] Erro inesperado na função search.ts:', error);
    return res.status(500).json({ error: error.message || 'Erro interno no servidor' });
  }
}
