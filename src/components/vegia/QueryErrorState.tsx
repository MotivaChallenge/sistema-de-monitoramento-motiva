import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  onRetry?: () => void;
  message?: string;
  className?: string;
}

export const QueryErrorState = ({ onRetry, message, className = "" }: Props) => (
  <div
    role="alert"
    className={`p-8 flex flex-col items-center text-center gap-3 ${className}`}
  >
    <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
      <AlertTriangle className="h-5 w-5" aria-hidden />
    </div>
    <div>
      <p className="font-semibold text-foreground">Não foi possível carregar</p>
      <p className="text-sm text-muted-foreground mt-0.5">
        {message ?? "Verifique sua conexão e tente novamente."}
      </p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-border bg-surface-low hover:bg-surface-high text-[12px] font-semibold uppercase tracking-wider transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
      </button>
    )}
  </div>
);

export default QueryErrorState;