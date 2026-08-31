/**
 * Sistema de Mapeamento Inteligente de Categorias por Expressões Regulares (Regex)
 * Prioriza palavras-chave no TÍTULO do produto sobre categorias genéricas do feed da loja.
 */

export interface CategoryRule {
  id: string;
  name: string;
  titlePatterns: RegExp[];
  categoryPatterns?: RegExp[];
}

/**
 * Tabela de Regras Extensível
 * Adicione novas categorias ou palavras-chave adicionando novos padrões Regex abaixo.
 */
export const CATEGORY_MAPPING_RULES: CategoryRule[] = [
  // 1. ÁUDIO & SOM (Prioridade máxima para fones, headsets e caixas de som)
  {
    id: 'audio',
    name: 'Áudio & Som',
    titlePatterns: [
      /\b(fone|fones|headset|headsets|headphone|headphones|earbud|earbuds|earphone|earphones|airpod|airpods|galaxy buds|jbl|soundbar|soundbars|caixa de som|caixas de som|alto-falante|microfone|microfones|in-ear|over-ear|tws)\b/i,
      /\b(anc|noise cancelling|estéreo|bluetooth speaker|subwoofer|receiver|amplificador)\b/i,
    ],
    categoryPatterns: [
      /\b(áudio|audio|som|fones?|headphones?|caixa de som)\b/i,
    ],
  },

  // 2. GAMES & CONSOLES
  {
    id: 'games',
    name: 'Games e Consoles',
    titlePatterns: [
      /\b(ps5|ps4|ps3|playstation|xbox|xbox series|nintendo switch|switch oled|dualsense|joy-con|gamepad|controle sem fio xbox|jogo ps5|jogo ps4|jogo switch|jogos|videogame|gamer)\b/i,
    ],
    categoryPatterns: [
      /\b(game|games|console|consoles|videogame|jogos)\b/i,
    ],
  },

  // 3. INFORMÁTICA & NOTEBOOKS
  {
    id: 'informatica',
    name: 'Informática & Notebooks',
    titlePatterns: [
      /\b(notebook|notebooks|macbook|macbook air|macbook pro|laptop|laptops|computador|pc gamer|desktop|monitor|monitores|teclado|teclados|mouse|mouses|ssd|nvme|placa de v[íi]deo|geforce|rtx|gtx|radeon|ryzen|intel core|mem[óo]ria ram|placa-m[ãa]e|roteador|webcam|switch de rede|nobreak)\b/i,
    ],
    categoryPatterns: [
      /\b(inform[áa]tica|computador|notebook|hardware|perif[ée]rico|monitor)\b/i,
    ],
  },

  // 4. SMARTPHONES & CELULARES
  {
    id: 'smartphones',
    name: 'Smartphones & Celulares',
    titlePatterns: [
      /\b(smartphone|smartphones|iphone|celular|celulares|galaxy s\d+|galaxy z|galaxy a\d+|xiaomi|redmi|poco|motorola moto|moto g\d+|moto edge|zenfone)\b/i,
      /\b(smartwatch|apple watch|galaxy watch|pulseira inteligente|smartband|relogio inteligente)\b/i,
    ],
    categoryPatterns: [
      /\b(celular|celulares|smartphone|smartphones|telefone|wearable|smartwatch)\b/i,
    ],
  },

  // 5. CASA & ELETRODOMÉSTICOS
  {
    id: 'casa',
    name: 'Casa & Eletrodomésticos',
    titlePatterns: [
      /\b(airfryer|air fryer|fritadeira|aspirador|aspirador rob[ôo]|cafeteira|nespresso|dolce gusto|micro-ondas|microondas|geladeira|refrigerador|fog[ãa]o|cooktop|lavadora|lava e seca|m[áa]quina de lavar|liquidificador|batedeira|ventilador|ar-condicionado|climatizador|ferro de passar|purificador de [áa]gua|panela el[ée]trica)\b/i,
    ],
    categoryPatterns: [
      /\b(casa|eletrodom[ée]stico|eletrodom[ée]sticos|cozinha|eletro)\b/i,
    ],
  },

  // 6. TV & VÍDEO / ELETRÔNICOS
  {
    id: 'eletronicos',
    name: 'TV & Eletrônicos',
    titlePatterns: [
      /\b(smart tv|tv|televis[ãa]o|televisor|oled|qled|nanocell|crystal uhd|projetor|chromecast|fire tv|fire stick|roku|apple tv|home theater)\b/i,
    ],
    categoryPatterns: [
      /\b(tv|televis[ãa]o|v[íi]deo|eletr[ôo]nico|eletr[ôo]nicos)\b/i,
    ],
  },

  // 7. LIVROS
  {
    id: 'livros',
    name: 'Livros',
    titlePatterns: [
      /\b(livro|livros|kindle|box de livros|edi[çc][ãa]o de colecionador|capa dura)\b/i,
    ],
    categoryPatterns: [
      /\b(livro|livros|literatura|ebook|leitura)\b/i,
    ],
  },
];

/**
 * Resolve a categoria com base no título e fallbacks de categoria do comerciante.
 */
export function resolveSmartCategory(
  productName: string,
  catName?: string,
  merchCat?: string
): { categoryId: string; categoryName: string } {
  const title = (productName || '').trim();
  const rawCat = `${catName || ''} ${merchCat || ''}`.trim();

  // ETAPA 1: Prioridade MÁXIMA no TÍTULO do produto
  if (title) {
    for (const rule of CATEGORY_MAPPING_RULES) {
      for (const pattern of rule.titlePatterns) {
        if (pattern.test(title)) {
          return { categoryId: rule.id, categoryName: rule.name };
        }
      }
    }
  }

  // ETAPA 2: Fallback na categoria original informada pela loja/feed
  if (rawCat) {
    for (const rule of CATEGORY_MAPPING_RULES) {
      if (rule.categoryPatterns) {
        for (const pattern of rule.categoryPatterns) {
          if (pattern.test(rawCat)) {
            return { categoryId: rule.id, categoryName: rule.name };
          }
        }
      }
    }
  }

  // ETAPA 3: Fallback final com a categoria literal do feed ou Padrão
  if (catName && catName.trim()) {
    return { categoryId: 'eletronicos', categoryName: catName.trim() };
  }
  if (merchCat && merchCat.trim()) {
    return { categoryId: 'eletronicos', categoryName: merchCat.trim() };
  }

  return { categoryId: 'eletronicos', categoryName: 'Eletrônicos & Tecnologia' };
}
