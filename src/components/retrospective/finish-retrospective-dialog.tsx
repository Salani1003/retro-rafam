import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
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
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function FinishRetrospectiveDialog({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CheckCircle2 className="size-3.5" />
          Finalizar retro
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Finalizar esta retro?</AlertDialogTitle>
          <AlertDialogDescription>
            El equipo va a poder seguir viendo el tablero, pero no se podrán agregar ni votar
            nuevos comentarios. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            onClick={async (e) => {
              e.preventDefault()
              setIsSubmitting(true)
              try {
                await onConfirm()
                setOpen(false)
              } finally {
                setIsSubmitting(false)
              }
            }}
          >
            {isSubmitting ? 'Finalizando…' : 'Sí, finalizar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
