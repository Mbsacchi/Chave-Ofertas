import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado na renderização:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[360px] w-full flex items-center justify-center p-6 sm:p-8 bg-white dark:bg-dark-surface rounded-3xl border border-gray-200 dark:border-dark-border text-center shadow-sm">
          <div className="max-w-md w-full space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              Produto não encontrado ou indisponível
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Ocorreu um erro ao carregar os dados deste produto. Ele pode ter sido atualizado ou não está mais disponível na vitrine.
            </p>
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-glow-amber transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar à Vitrine</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
