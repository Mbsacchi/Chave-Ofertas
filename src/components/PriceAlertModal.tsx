import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCircle2, TrendingDown, Mail, Trash2, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { alertRateLimiter } from '../lib/security/rateLimiter';

interface PriceAlertModalProps {
  product: Product | null;
  onClose: () => void;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({ product, onClose }) => {
  const { user, openAuthModal, addPriceAlert, removePriceAlert, getAlertDetails } = useAuth();
  
  const existingAlert = product ? getAlertDetails(product.id) : undefined;
  const isEditing = !!existingAlert;

  const [notifyOnAnyDrop, setNotifyOnAnyDrop] = useState<boolean>(false);
  const [targetPrice, setTargetPrice] = useState<number>(0);
  const [email, setEmail] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize or reset form state when product changes or alert loads
  useEffect(() => {
    if (!product) return;

    setEmail(user?.email || '');
    if (existingAlert) {
      setNotifyOnAnyDrop(!!existingAlert.notifyOnAnyDrop);
      if (existingAlert.targetPrice) {
        setTargetPrice(existingAlert.targetPrice);
      } else {
        setTargetPrice(Math.floor(product.minPrice * 0.9));
      }
    } else {
      setNotifyOnAnyDrop(false);
      setTargetPrice(Math.floor(product.minPrice * 0.9));
    }
  }, [product, existingAlert, user]);

  if (!product) return null;

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      openAuthModal('criar e gerenciar alertas de preço inteligentes');
      return;
    }

    const rateCheck = alertRateLimiter.checkLimit();
    if (!rateCheck.allowed) {
      setErrorMsg(`Muitas requisições. Aguarde ${rateCheck.retryAfterSeconds}s para criar ou atualizar.`);
      return;
    }

    if (!notifyOnAnyDrop && targetPrice >= product.minPrice) {
      setErrorMsg(`O valor alvo deve ser menor que o preço atual (R$ ${product.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await addPriceAlert({
        productId: product.id,
        productTitle: product.title,
        userEmail: user.email || email,
        targetPrice: notifyOnAnyDrop ? null : targetPrice,
        currentMinPrice: product.minPrice,
        notifyOnAnyDrop,
      });

      setFeedbackMessage(
        isEditing 
          ? 'Alerta atualizado com sucesso!' 
          : 'Alerta ativado com sucesso!'
      );
      setIsSaved(true);
      setTimeout(() => {
        onClose();
        setIsSaved(false);
      }, 1800);
    } catch {
      setErrorMsg('Ocorreu um erro ao salvar o alerta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAlert = async () => {
    if (!product || !user) return;
    setIsDeleting(true);
    setErrorMsg(null);

    try {
      await removePriceAlert(product.id);
      setFeedbackMessage('Alerta removido com sucesso!');
      setIsSaved(true);
      setTimeout(() => {
        onClose();
        setIsSaved(false);
      }, 1500);
    } catch {
      setErrorMsg('Não foi possível remover o alerta. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-lg max-h-[92vh] bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl overflow-y-auto scrollbar-thin my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100/80 dark:bg-dark-card/80 sm:bg-transparent transition-colors active:scale-90"
          aria-label="Fechar alerta"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-colors ${
            isEditing 
              ? 'bg-amber-500 text-white border-amber-600 shadow-glow-amber' 
              : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
          }`}>
            <Bell className={`w-5 h-5 ${isEditing ? 'fill-current' : ''}`} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
              {isEditing ? 'Gerenciar Alerta de Preço' : 'Criar Alerta de Preço'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isEditing 
                ? 'Você já está monitorando este produto. Atualize suas preferências ou remova o alerta.' 
                : 'Monitore quedas de preço em tempo real nas principais lojas parceiras.'}
            </p>
          </div>
        </div>

        {/* Product summary card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border mb-5">
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-14 h-14 object-contain rounded-xl border border-gray-200 dark:border-dark-border shrink-0 bg-white dark:bg-dark-surface p-1"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
              {product.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Menor hoje:</span>
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                R$ {product.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-900/40">
                {product.bestStore}
              </span>
            </div>
          </div>
        </div>

        {isSaved ? (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col items-center text-center gap-2 text-emerald-700 dark:text-emerald-300 animate-fade-in">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <h4 className="text-sm font-bold">{feedbackMessage}</h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {notifyOnAnyDrop 
                ? 'Você será notificado assim que houver qualquer redução de valor.' 
                : targetPrice ? `Você será notificado assim que atingir R$ ${targetPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.` : ''}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSaveAlert} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Checkbox: Avisar sobre qualquer queda de preço */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-dark-card border border-amber-200 dark:border-dark-border flex items-start gap-3 transition-colors">
              <input
                type="checkbox"
                id="notifyOnAnyDrop"
                checked={notifyOnAnyDrop}
                onChange={(e) => setNotifyOnAnyDrop(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-500 border-gray-300 dark:border-dark-border focus:ring-amber-500 cursor-pointer accent-amber-500"
              />
              <label htmlFor="notifyOnAnyDrop" className="text-xs cursor-pointer select-none">
                <span className="font-black text-gray-900 dark:text-white block">
                  Avisar sobre qualquer queda de preço
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block">
                  Receba um aviso imediato se o produto baixar mesmo que R$ 1,00 em qualquer loja oficial.
                </span>
              </label>
            </div>

            {/* Target Price Section (Disabled if notifyOnAnyDrop is checked) */}
            <div className={`space-y-2 transition-opacity ${notifyOnAnyDrop ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Ou defina um valor alvo específico:
                </label>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                  R$ {targetPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <input
                type="range"
                disabled={notifyOnAnyDrop}
                min={Math.floor(product.minPrice * 0.5)}
                max={Math.floor(product.minPrice * 0.98)}
                step={10}
                value={targetPrice}
                onChange={(e) => setTargetPrice(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>R$ {(product.minPrice * 0.5).toFixed(0)} (-50%)</span>
                <span>R$ {(product.minPrice * 0.98).toFixed(0)} (-2%)</span>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                E-mail para Notificação
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={user?.email || email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  required
                  disabled={!!user?.email}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all disabled:opacity-80"
                />
              </div>
            </div>

            {/* Historical info */}
            <div className="p-3 bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl flex items-center gap-2.5 text-[11px] text-gray-600 dark:text-gray-400">
              <TrendingDown className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Menor preço histórico registrado: <strong>R$ {product.historicalLowestPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-glow-amber transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando preferências...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>{isEditing ? 'Atualizar Alerta' : 'Ativar Alerta de Preço'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Secondary Remove Button (If editing existing alert) */}
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDeleteAlert}
                  disabled={isSubmitting || isDeleting}
                  className="w-full py-2.5 px-4 rounded-2xl bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Excluindo alerta...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover Alerta</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
