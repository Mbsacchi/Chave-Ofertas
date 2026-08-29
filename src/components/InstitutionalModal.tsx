import React, { useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Send, 
  CheckCircle2, 
  Info, 
  Lock 
} from 'lucide-react';
import { KeyLogo } from './KeyLogo';

export type InstitutionalPageType = 'sobre' | 'contato' | 'termos' | 'privacidade';

interface InstitutionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePage: InstitutionalPageType | null;
  onSelectPage: (page: InstitutionalPageType) => void;
}

export const InstitutionalModal: React.FC<InstitutionalModalProps> = ({
  isOpen,
  onClose,
  activePage,
  onSelectPage,
}) => {
  const [formSent, setFormSent] = React.useState(false);
  const [contactName, setContactName] = React.useState('');
  const [contactEmail, setContactEmail] = React.useState('');
  const [contactMessage, setContactMessage] = React.useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !activePage) return null;

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
    setTimeout(() => {
      setFormSent(false);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    }, 4000);
  };

  const navItems: { id: InstitutionalPageType; label: string; icon: React.ReactNode }[] = [
    { id: 'sobre', label: 'Sobre Nós', icon: <Info className="w-4 h-4" /> },
    { id: 'contato', label: 'Contato', icon: <Mail className="w-4 h-4" /> },
    { id: 'termos', label: 'Termos de Uso', icon: <FileText className="w-4 h-4" /> },
    { id: 'privacidade', label: 'Política de Privacidade', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <KeyLogo size="sm" />
            <div className="h-5 w-px bg-slate-800" />
            <span className="text-sm font-semibold text-amber-400">Kit Confiança & Institucional</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-900/90 border-b border-slate-800 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm text-slate-300 leading-relaxed max-h-[calc(90vh-160px)]">
          {/* TAB: SOBRE NÓS */}
          {activePage === 'sobre' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3 mb-2">
                  <Info className="w-6 h-6 text-amber-400" />
                  Sobre o Chave Ofertas
                </h2>
                <p className="text-amber-400/90 font-medium text-xs">
                  Sua chave mestra para economia inteligente, histórico real e as melhores decisões de compra.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <h3 className="font-bold text-white text-base">Quem Somos</h3>
                <p>
                  O <strong>Chave Ofertas</strong> (chaveofertas.com.br) nasceu com o propósito de democratizar o acesso às melhores oportunidades de compra do e-commerce brasileiro. Em um mercado repleto de promoções artificiais, atuamos como um radar independente que monitora, valida e compara preços em tempo real nas maiores plataformas do país, como Amazon, Mercado Livre, KaBuM!, Shopee e Magazine Luiza.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                  <ShieldCheck className="w-6 h-6 text-emerald-400 mb-2" />
                  <h4 className="font-bold text-white text-sm mb-1">100% Verificado</h4>
                  <p className="text-xs text-slate-400">
                    Todos os cupons e links são testados continuamente para garantir códigos ativos e lojas oficiais seguras.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                  <CheckCircle2 className="w-6 h-6 text-amber-400 mb-2" />
                  <h4 className="font-bold text-white text-sm mb-1">Transparência Total</h4>
                  <p className="text-xs text-slate-400">
                    Histórico de preços de 6 meses para garantir que você saiba exatamente quando uma oferta é vantajosa.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                  <Lock className="w-6 h-6 text-blue-400 mb-2" />
                  <h4 className="font-bold text-white text-sm mb-1">Segurança do Consumidor</h4>
                  <p className="text-xs text-slate-400">
                    Redirecionamento exclusivo para lojas oficiais e plataformas confiáveis com certificação SSL.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <h3 className="font-bold text-white text-base">Nossa Missão</h3>
                <p>
                  Nosso compromisso inegociável é ajudar os consumidores a economizar tempo e dinheiro, reunindo em um só lugar os menores preços verificados, cupons de desconto funcionais e ferramentas inteligentes de histórico de preços. Acreditamos que comprar bem é comprar com informação clara, transparência e sem pegadinhas.
                </p>
                <p className="text-slate-400 text-xs">
                  Trabalhamos diariamente com algoritmos de varredura e curadoria especializada para identificar reduções reais de preço, promoções relâmpago e benefícios de frete grátis em milhares de produtos das principais lojas do Brasil.
                </p>
              </div>
            </div>
          )}

          {/* TAB: CONTATO */}
          {activePage === 'contato' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3 mb-2">
                  <Mail className="w-6 h-6 text-amber-400" />
                  Fale Conosco
                </h2>
                <p className="text-amber-400/90 font-medium text-xs">
                  Dúvidas, parcerias, sugestões ou suporte técnico: nossa equipe está à disposição.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4 md:col-span-1">
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                    <Mail className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-white">E-mail Oficial</p>
                      <p className="text-xs text-slate-300 font-medium break-all">chaveofertas0@gmail.com</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                    <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-white">Atendimento</p>
                      <p className="text-xs text-slate-400">Segunda a Sexta, das 09h às 18h</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-white">Localização</p>
                      <p className="text-xs text-slate-300 font-medium">Maringá - PR, Brasil</p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 p-6 rounded-3xl bg-slate-950/70 border border-slate-800">
                  <h3 className="font-bold text-white text-base mb-4">Envie uma Mensagem</h3>

                  {formSent ? (
                    <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="font-bold text-emerald-300 text-sm">Mensagem enviada com sucesso!</p>
                      <p className="text-xs text-slate-400">Responderemos para seu e-mail no prazo de até 24 horas úteis.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Seu Nome</label>
                          <input
                            type="text"
                            required
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="Ex: Carlos Silva"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Seu E-mail</label>
                          <input
                            type="email"
                            required
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="carlos@exemplo.com"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Mensagem</label>
                        <textarea
                          rows={4}
                          required
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="Digite sua dúvida, sugestão ou proposta..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 transition-all shadow-lg shadow-amber-400/20"
                      >
                        <Send className="w-4 h-4" />
                        <span>Enviar Mensagem</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: TERMOS DE USO */}
          {activePage === 'termos' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3 mb-2">
                  <FileText className="w-6 h-6 text-amber-400" />
                  Termos de Uso
                </h2>
                <p className="text-amber-400/90 font-medium text-xs">
                  Última atualização: 29 de Agosto de 2026
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h3 className="font-bold text-white">1. Aceitação dos Termos</h3>
                  <p>
                    Ao acessar e utilizar o site <strong>Chave Ofertas</strong> (chaveofertas.com.br), o usuário concorda expressamente com as disposições estabelecidas nestes Termos de Uso. Caso não concorde com qualquer cláusula, solicitamos que não continue a navegação.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h3 className="font-bold text-white">2. Natureza dos Serviços e Comparador</h3>
                  <p>
                    O <strong>Chave Ofertas</strong> atua exclusivamente como um portal agregador de promoções, comparador de preços e redirecionador para lojas parceiras credenciadas. A plataforma não comercializa produtos diretamente, não possui estoque próprio, não realiza entregas físicas e não processa pagamentos ou transações financeiras.
                  </p>
                  <p className="text-slate-400">
                    Toda e qualquer transação comercial, compra, emissão de nota fiscal, faturamento e logística de entrega ocorrem de forma 100% autônoma nos sites oficiais dos parceiros comerciais (como Amazon, Mercado Livre, Shopee, KaBuM! e Magazine Luiza), aos quais o usuário é redirecionado por livre escolha.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h3 className="font-bold text-white">3. Isenção de Responsabilidade sobre Preços, Estoques e Logística</h3>
                  <p>
                    Os preços, estoques, prazos de entrega e condições de frete exibidos são fornecidos pelas lojas parceiras e estão sujeitos a alterações dinâmicas e repentinas sem aviso prévio. Prevalecem sempre os preços e condições vigentes na página final de checkout da loja de destino. O Chave Ofertas não se responsabiliza por eventuais divergências decorrentes de estoques esgotados ou descontinuação de ofertas por parte dos lojistas.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h3 className="font-bold text-white">4. Propriedade Intelectual e Marcas</h3>
                  <p>
                    Todas as marcas, logos e nomes de produtos de terceiros citados pertencem aos seus respectivos proprietários e são utilizados apenas para fins de identificação, comparação e direcionamento de tráfego legítimo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: POLÍTICA DE PRIVACIDADE */}
          {activePage === 'privacidade' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3 mb-2">
                  <Lock className="w-6 h-6 text-amber-400" />
                  Política de Privacidade (LGPD)
                </h2>
                <p className="text-amber-400/90 font-medium text-xs">
                  Em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h3 className="font-bold text-white">1. Coleta e Tratamento de Dados Pessoais</h3>
                  <p>
                    O <strong>Chave Ofertas</strong> valoriza sua privacidade e adota práticas rigorosas de proteção e confidencialidade. Não coletamos dados bancários, números de documentos ou informações financeiras confidenciais dos usuários. As únicas informações eventualmente tratadas são aquelas fornecidas voluntariamente em formulários de contato ou alertas de preços (como nome e e-mail).
                  </p>
                  <p className="text-slate-400">
                    O usuário tem a garantia de navegação anônima e segura em todo o portal, com seus direitos de titular resguardados conforme previsto na legislação brasileira vigente.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h3 className="font-bold text-white">2. Uso de Cookies e Rastreamento Seguro de Afiliados</h3>
                  <p>
                    Este site utiliza cookies estritamente necessários para o rastreio seguro de links de afiliados, permitindo a correta atribuição das comissões pelas lojas parceiras quando uma compra é finalizada. Não coletamos nem armazenamos dados sensíveis, garantindo total conformidade com as diretrizes da Lei Geral de Proteção de Dados (LGPD).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h3 className="font-bold text-white">3. Segurança da Informação e Criptografia</h3>
                  <p>
                    Toda a navegação no Chave Ofertas é protegida por certificados SSL de alta criptografia (HTTPS 256-bit), garantindo que suas preferências e acessos permaneçam protegidos contra terceiros mal-intencionados.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h3 className="font-bold text-white">4. Seus Direitos como Titular de Dados</h3>
                  <p>
                    Você pode solicitar a qualquer momento a confirmação de tratamento, correção ou exclusão definitiva de alertas de preços e mensagens enviadas através do nosso e-mail oficial de suporte: <strong className="text-amber-400">chaveofertas0@gmail.com</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            © 2026 Chave Ofertas (chaveofertas.com.br). Todos os direitos reservados.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Entendido e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
