import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get URL from query or body
  const rawUrl = (req.query.url as string) || (req.body && req.body.url);
  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ error: 'URL do produto não informada.' });
  }

  // Find valid HTTP/HTTPS URL
  const urlMatch = rawUrl.match(/https?:\/\/[^\s]+/i);
  if (!urlMatch) {
    return res.status(400).json({ error: 'URL inválida no texto informado.' });
  }
  const targetUrl = urlMatch[0];

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Erro ao acessar o link: status ${response.status}` 
      });
    }

    const html = await response.text();

    // 1. Extração do Título
    let title = '';
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
      || html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);

    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1];
    } else {
      const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleTagMatch && titleTagMatch[1]) {
        title = titleTagMatch[1];
      }
    }

    // Limpar sufixos comuns do Mercado Livre no título
    title = title
      .replace(/\s*\|\s*Frete gr[aá]tis/gi, '')
      .replace(/\s*\|\s*Mercado\s*Livre.*$/gi, '')
      .replace(/\s*-\s*Mercado\s*Livre.*$/gi, '')
      .trim();

    // 2. Extração da Imagem
    let imageUrl = '';
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

    if (ogImageMatch && ogImageMatch[1]) {
      imageUrl = ogImageMatch[1].replace('-I.jpg', '-O.webp');
    }

    // 3. Extração do Preço
    let price = 0;
    let originalPrice = 0;

    // Tentativa A: JSON-LD Structured Data
    const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        const productObj = parsed['@type'] === 'Product' ? parsed : (Array.isArray(parsed) ? parsed.find(i => i['@type'] === 'Product') : null);
        
        if (productObj && productObj.offers) {
          const offers = Array.isArray(productObj.offers) ? productObj.offers[0] : productObj.offers;
          if (offers && offers.price) {
            price = parseFloat(offers.price);
          }
          if (offers && offers.highPrice && parseFloat(offers.highPrice) > price) {
            originalPrice = parseFloat(offers.highPrice);
          }
          if (productObj.name && !title) {
            title = productObj.name;
          }
          if (productObj.image && !imageUrl) {
            imageUrl = Array.isArray(productObj.image) ? productObj.image[0] : productObj.image;
          }
          if (price > 0) break;
        }
      } catch {
        // Continue se falhar o parse de um bloco
      }
    }

    // Tentativa B: Meta tags de Preço
    if (!price || price <= 0) {
      const priceMetaMatch = html.match(/<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i);

      if (priceMetaMatch && priceMetaMatch[1]) {
        price = parseFloat(priceMetaMatch[1]);
      }
    }

    // Tentativa C: Regex em classes HTML do Mercado Livre
    if (!price || price <= 0) {
      const mlPriceMatch = html.match(/class=["'][^"']*ui-pdp-price__second-line[^"']*[\s\S]*?class=["'][^"']*andes-money-amount__fraction[^"']*">([\d\.]+)<\/span>/i)
        || html.match(/class=["'][^"']*andes-money-amount__fraction[^"']*">([\d\.]+)<\/span>/i);

      if (mlPriceMatch && mlPriceMatch[1]) {
        const cleanPrice = mlPriceMatch[1].replace(/\./g, '');
        price = parseFloat(cleanPrice);
      }
    }

    // Calcular preço original se não encontrado
    if (!originalPrice || originalPrice <= price) {
      originalPrice = price > 0 ? Math.round(price * 1.15) : 0;
    }

    return res.status(200).json({
      success: true,
      title: title || 'Produto Mercado Livre',
      price: price || 0,
      originalPrice: originalPrice || 0,
      imageUrl: imageUrl || '',
      affiliateUrl: targetUrl,
      finalUrl: response.url || targetUrl,
      freeShipping: true,
    });
  } catch (error: any) {
    console.error('[Scraper Error]:', error);
    return res.status(500).json({ 
      error: error.message || 'Erro ao extrair informações do produto.' 
    });
  }
}
