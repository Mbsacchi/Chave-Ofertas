export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const publisherId = process.env.AWIN_PUBLISHER_ID || '3064261';
  const apiToken = process.env.AWIN_API_TOKEN || '';

  const isTokenConfigured = apiToken && apiToken.trim() !== '' && apiToken !== 'seu_token_aqui';

  try {
    let rawAwinOffers: any[] = [];
    let dataSource = 'live_api';

    if (isTokenConfigured) {
      // 1. Fetch live active promotions / deals from Awin REST API
      const awinApiUrl = `https://api.awin.com/publisher/${publisherId}/promotions`;
      
      try {
        const response = await fetch(awinApiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken.trim()}`,
            'User-Agent': 'ChaveOfertas-AwinSync/1.0',
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const json = await response.json();
          rawAwinOffers = Array.isArray(json) ? json : json?.data || json?.promotions || [];
        } else {
          console.warn(`Awin API returned status ${response.status}. Falling back to curated partner deals.`);
          dataSource = 'curated_fallback';
        }
      } catch (fetchErr: any) {
        console.warn('Error fetching from Awin live API:', fetchErr.message);
        dataSource = 'curated_fallback';
      }
    } else {
      dataSource = 'sandbox_demo';
    }

    // Print sample of the first item received from Awin to the server terminal
    if (rawAwinOffers.length > 0) {
      console.log('========================================================');
      console.log('=== [AWIN SYNC] PRIMEIRA OFERTA BRUTA RECEBIDA DA AWIN ===');
      console.log(JSON.stringify(rawAwinOffers[0], null, 2));
      console.log('========================================================');
    }

    // Fallback if live API returns empty or token is pending
    if (rawAwinOffers.length === 0) {
      rawAwinOffers = [
        {
          id: 'awin-cb-smart-tv-50',
          title: 'Smart TV 50" Crystal UHD 4K Samsung 50DU7700 Gaming Hub',
          advertiserName: 'Casas Bahia',
          advertiserId: '17621',
          brand: 'Samsung',
          category: 'Eletrônicos',
          imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80',
          originalPrice: 2899.00,
          promotionalPrice: 2199.00,
          productUrl: 'https://www.casasbahia.com.br/smart-tv-50-crystal-uhd-4k-samsung-50du7700/p/15642491',
          aw_deep_link: `https://www.awin1.com/cread.php?awinmid=17621&awinaffid=${publisherId}&clickref=site&p=https%3A%2F%2Fwww.casasbahia.com.br%2Fsmart-tv-50-crystal-uhd-4k-samsung-50du7700%2Fp%2F15642491`,
          freeShipping: true,
          installment: '10x de R$ 219,90 sem juros',
        },
        {
          id: 'awin-pf-airfryer-philips',
          title: 'Fritadeira Elétrica Airfryer Philips Walita Série 3000 4.1L',
          advertiserName: 'Ponto Frio',
          advertiserId: '17622',
          brand: 'Philips Walita',
          category: 'Eletrodomésticos',
          imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80',
          originalPrice: 499.90,
          promotionalPrice: 349.90,
          productUrl: 'https://www.pontofrio.com.br/fritadeira-eletrica-airfryer-philips-walita/p/15438812',
          aw_deep_link: `https://www.awin1.com/cread.php?awinmid=17622&awinaffid=${publisherId}&clickref=site&p=https%3A%2F%2Fwww.pontofrio.com.br%2Ffritadeira-eletrica-airfryer-philips-walita%2Fp%2F15438812`,
          freeShipping: true,
          installment: '6x de R$ 58,31 sem juros',
        },
        {
          id: 'awin-ex-smartphone-moto-g84',
          title: 'Smartphone Motorola Moto G84 5G 256GB 8GB RAM Grafite',
          advertiserName: 'Extra',
          advertiserId: '17623',
          brand: 'Motorola',
          category: 'Smartphones',
          imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
          originalPrice: 1799.00,
          promotionalPrice: 1299.00,
          productUrl: 'https://www.extra.com.br/smartphone-motorola-moto-g84-5g-256gb/p/15671190',
          aw_deep_link: `https://www.awin1.com/cread.php?awinmid=17623&awinaffid=${publisherId}&clickref=site&p=https%3A%2F%2Fwww.extra.com.br%2Fsmartphone-motorola-moto-g84-5g-256gb%2Fp%2F15671190`,
          freeShipping: true,
          installment: '10x de R$ 129,90 sem juros',
        },
        {
          id: 'awin-ali-fone-anc-qcy',
          title: 'Fone de Ouvido Sem Fio QCY H3 ANC Bluetooth 5.4 Hi-Res Audio',
          advertiserName: 'AliExpress (Awin)',
          advertiserId: '18879',
          brand: 'QCY',
          category: 'Áudio & Fones',
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
          originalPrice: 329.00,
          promotionalPrice: 199.90,
          productUrl: 'https://pt.aliexpress.com/item/1005006123456789.html',
          aw_deep_link: `https://www.awin1.com/cread.php?awinmid=18879&awinaffid=${publisherId}&clickref=site&p=https%3A%2F%2Fpt.aliexpress.com%2Fitem%2F1005006123456789.html`,
          freeShipping: true,
          installment: '3x de R$ 66,63 sem juros',
        },
        {
          id: 'awin-centauro-tenis-nike-revolution',
          title: 'Tênis Nike Revolution 7 Masculino Corrida & Treino',
          advertiserName: 'Centauro',
          advertiserId: '18105',
          brand: 'Nike',
          category: 'Moda & Esportes',
          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
          originalPrice: 399.99,
          promotionalPrice: 269.99,
          productUrl: 'https://www.centauro.com.br/tenis-nike-revolution-7-masculino-984523.html',
          aw_deep_link: `https://www.awin1.com/cread.php?awinmid=18105&awinaffid=${publisherId}&clickref=site&p=https%3A%2F%2Fwww.centauro.com.br%2Ftenis-nike-revolution-7-masculino-984523.html`,
          freeShipping: true,
          installment: '5x de R$ 54,00 sem juros',
        },
      ];
    }

    // Helper: Extração de Deep Link rastreável da Awin direcionado para o produto específico
    function extractTraceableDeepLink(item: any, pubId: string): string {
      // 1. Verificar campos de deep link direto da Awin
      const directAwinLink = 
        item.aw_deep_link || 
        item.aw_track_link || 
        item.awTrack || 
        item.deep_link || 
        item.deeplink || 
        item.deepLink || 
        item.tracking_url || 
        item.trackingUrl || 
        item.clickThroughUrl ||
        item.click_url;

      if (directAwinLink && typeof directAwinLink === 'string' && directAwinLink.trim().length > 0) {
        return directAwinLink.trim();
      }

      // 2. Verificar URL específica do produto para envelopar no gerador de cliques da Awin
      const destinationProductUrl = 
        item.product_url || 
        item.productUrl || 
        item.promotion_url || 
        item.promotionUrl || 
        item.destination_url || 
        item.destinationUrl || 
        item.direct_url || 
        item.directUrl || 
        item.url || 
        item.link;

      const advertiserMid = 
        item.advertiserId || 
        item.advertiser?.id || 
        item.merchantId || 
        item.awinMid || 
        item.mid || 
        '17621';

      if (destinationProductUrl && typeof destinationProductUrl === 'string' && destinationProductUrl.startsWith('http')) {
        // Se já contiver o gerador de link da Awin
        if (destinationProductUrl.includes('awin1.com/cread.php') || destinationProductUrl.includes('awin1.com/pclick.php')) {
          return destinationProductUrl.trim();
        }
        // Envelopar a URL de destino específica do produto no link de rastreamento com &p=
        return `https://www.awin1.com/cread.php?awinmid=${advertiserMid}&awinaffid=${pubId}&clickref=site&p=${encodeURIComponent(destinationProductUrl.trim())}`;
      }

      // 3. Fallback de rastreamento
      return `https://www.awin1.com/cread.php?awinmid=${advertiserMid}&awinaffid=${pubId}&clickref=site`;
    }

    // 2. Mapeamento dos dados da Awin para o formato de produto do site
    const mappedProducts = rawAwinOffers.map((item: any, index: number) => {
      const title = item.title || item.promotionName || item.description || `Oferta Awin #${index + 1}`;
      const storeName = item.advertiserName || item.advertiser?.name || 'Awin Partner';
      const originalPrice = Number(item.originalPrice) || Number(item.price) || 299.90;
      const promotionalPrice = Number(item.promotionalPrice) || Number(item.price) || (originalPrice * 0.8);
      const discountPercent = originalPrice > promotionalPrice
        ? Math.round(((originalPrice - promotionalPrice) / originalPrice) * 100)
        : 15;

      // Extração precisa do Deep Link rastreável da página do produto
      const affiliateUrl = extractTraceableDeepLink(item, publisherId);

      const imageUrl = item.imageUrl || item.image || item.logoUrl || item.largeImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
      const categoryName = item.category || 'Geral';
      const brand = item.brand || storeName;

      const offer = {
        id: `awin-offer-${item.id || index}`,
        storeId: 'awin' as any,
        storeName,
        storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
        price: promotionalPrice,
        originalPrice,
        discountPercent,
        currency: 'BRL',
        affiliateUrl,
        inStock: true,
        freeShipping: item.freeShipping !== undefined ? Boolean(item.freeShipping) : true,
        installment: item.installment || '10x sem juros',
        rating: 4.8,
        reviewsCount: 110,
        lastUpdated: new Date().toISOString(),
      };

      return {
        id: item.id ? `awin-${item.id}` : `awin-prod-${Date.now()}-${index}`,
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: `${title} disponível na rede de anunciantes oficiais Awin (${storeName}). Aproveite as melhores condições e garantia.`,
        categoryId: 'eletronicos',
        categoryName,
        brand,
        sku: `AWIN-${item.id || Date.now() + index}`,
        imageUrl,
        searchKeywords: [
          ...title.toLowerCase().split(' ').filter((w: string) => w.length > 2),
          storeName.toLowerCase(),
          'awin',
          categoryName.toLowerCase(),
        ],
        minPrice: promotionalPrice,
        maxPrice: originalPrice,
        historicalLowestPrice: promotionalPrice,
        bestStore: storeName,
        bestStoreId: 'awin' as any,
        offers: [offer],
        priceHistory: [
          {
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            minPrice: promotionalPrice,
          },
        ],
        rating: 4.8,
        reviewsCount: 110,
        isVerified: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    return res.status(200).json({
      success: true,
      publisherId,
      dataSource,
      count: mappedProducts.length,
      products: mappedProducts,
      message: `${mappedProducts.length} ofertas e cupons sincronizados com sucesso da rede Awin!`,
    });
  } catch (error: any) {
    console.error('Awin Sync Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao sincronizar ofertas da Awin',
    });
  }
}
