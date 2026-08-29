import React, { useState } from 'react';
import { KeyLogo } from './KeyLogo';
import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  FileText, 
  Mail, 
  Info 
} from 'lucide-react';
import { InstitutionalModal, InstitutionalPageType } from './InstitutionalModal';

interface FooterProps {
  onLogoClick?: () => void;
  onOpenInstitutional?: (page: InstitutionalPageType) => void;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ 
  onLogoClick, 
  onOpenInstitutional,
  onOpenAdmin 
}) => {
  const [internalModalPage, setInternalModalPage] = useState<InstitutionalPageType | null>(null);

  const handleOpenPage = (page: InstitutionalPageType) => {
    if (onOpenInstitutional) {
      onOpenInstitutional(page);
    } else {
      setInternalModalPage(page);
    }
  };

  const handleCloseModal = () => {
    setInternalModalPage(null);
  };

  return (
    <>
      <footer className="w-full bg-slate-950 text-slate-400 border-t border-slate-800/80 transition-colors mt-16 font-sans">
        {/* Main Footer Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Column 1: Brand & Value Proposition (Span 2) */}
            <div className="lg:col-span-2 space-y-4">
              <div 
                onClick={onLogoClick} 
                className={onLogoClick ? 'cursor-pointer inline-block hover:opacity-90 active:scale-98 transition-all' : 'inline-block'}
                title="Voltar ao início do Chave Ofertas"
              >
                <KeyLogo size="md" />
              </div>
              
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                O <strong>Chave Ofertas</strong> é o seu comparador de preços inteligente e agregador de cupons verificados em tempo real, conectando você às melhores promoções das maiores lojas do Brasil.
              </p>

              {/* Trust Badges */}
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/60 shadow-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ambiente 100% Seguro</span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-900/50 shadow-sm">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Conexão SSL Criptografada</span>
                </span>
              </div>
            </div>

            {/* Column 2: Kit Confiança & Institucional */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Kit Confiança</span>
              </h4>
              <ul className="space-y-2.5 text-xs font-medium">
                <li>
                  <button
                    onClick={() => handleOpenPage('sobre')}
                    className="hover:text-amber-400 transition-colors flex items-center gap-1.5 text-left group"
                  >
                    <Info className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                    <span>Sobre Nós</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleOpenPage('contato')}
                    className="hover:text-amber-400 transition-colors flex items-center gap-1.5 text-left group"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                    <span>Contato</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleOpenPage('termos')}
                    className="hover:text-amber-400 transition-colors flex items-center gap-1.5 text-left group"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                    <span>Termos de Uso</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleOpenPage('privacidade')}
                    className="hover:text-amber-400 transition-colors flex items-center gap-1.5 text-left group"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                    <span>Política de Privacidade</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Categorias em Destaque */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">
                Categorias
              </h4>
              <ul className="space-y-2.5 text-xs font-medium">
                <li>
                  <span className="hover:text-amber-400 transition-colors cursor-pointer" onClick={onLogoClick}>
                    Games & Consoles
                  </span>
                </li>
                <li>
                  <span className="hover:text-amber-400 transition-colors cursor-pointer" onClick={onLogoClick}>
                    Smartphones & Celulares
                  </span>
                </li>
                <li>
                  <span className="hover:text-amber-400 transition-colors cursor-pointer" onClick={onLogoClick}>
                    Informática & Notebooks
                  </span>
                </li>
                <li>
                  <span className="hover:text-amber-400 transition-colors cursor-pointer" onClick={onLogoClick}>
                    Eletrodomésticos & Casa
                  </span>
                </li>
                <li>
                  <span className="hover:text-amber-400 transition-colors cursor-pointer" onClick={onLogoClick}>
                    Papelaria & Escritório
                  </span>
                </li>
              </ul>
            </div>

            {/* Column 4: Lojas Parceiras Oficiais */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">
                Lojas Parceiras
              </h4>
              <ul className="space-y-2.5 text-xs font-medium">
                <li className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Amazon Brasil</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  <span>Mercado Livre</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Shopee Brasil</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Magazine Luiza</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                  <span>KaBuM!</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Institutional / Affiliate Legal Disclaimer */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 leading-relaxed mb-8 shadow-inner">
            <p className="font-semibold text-slate-300 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Aviso Legal e Transparência de Afiliados:</span>
            </p>
            <p>
              O Chave Ofertas é uma plataforma independente. Quando você compra através dos nossos links, podemos receber uma comissão de afiliado, sem nenhum custo extra para você.
            </p>
          </div>

          {/* Bottom Copyright & Verification Line */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© 2026 Chave Ofertas (chaveofertas.com.br). Todos os direitos reservados.</p>
            <div className="flex items-center gap-4 text-slate-400 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Plataforma Oficial Verificada • SSL 256-bit</span>
              </div>
              {onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-400 transition-colors py-1 px-2 rounded-lg bg-slate-900 border border-slate-800"
                  title="Acesso Restrito ao Painel Admin"
                >
                  <Lock className="w-3 h-3 text-amber-500" />
                  <span>Painel Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* Institutional Modal for About, Contact, Terms, and Privacy */}
      <InstitutionalModal
        isOpen={Boolean(internalModalPage)}
        onClose={handleCloseModal}
        activePage={internalModalPage}
        onSelectPage={(page) => setInternalModalPage(page)}
      />
    </>
  );
};
