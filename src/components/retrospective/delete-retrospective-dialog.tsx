import {useState} from "react";
import {Trash2} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";

interface DeleteRetrospectiveDialogProps {
  retrospectiveName: string;
  onConfirm: () => Promise<void>;
}

export function DeleteRetrospectiveDialog({
  retrospectiveName,
  onConfirm,
}: DeleteRetrospectiveDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Eliminar ${retrospectiveName}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar “{retrospectiveName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Se va a borrar la retro, todas sus tarjetas, votos y participantes.
            Esta acción es irreversible: no hay forma de recuperarla.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isSubmitting}
            onClick={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              try {
                await onConfirm();
                setOpen(false);
              } catch {
                // el aviso de error ya lo muestra quien llama; el diálogo queda abierto
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? "Eliminando…" : "Sí, eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
