import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  recordName?: string;
  impact?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => Promise<void> | void;
}

export const ConfirmationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  recordName,
  impact,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
}: ConfirmationDialogProps) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${variant === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-[16px]">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-[13px] leading-relaxed">
            {description}
            {recordName && (
              <span className="block mt-2 font-medium text-foreground">Registro: {recordName}</span>
            )}
            {impact && (
              <span className="block mt-2 text-destructive text-[12px]">Impacto: {impact}</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
