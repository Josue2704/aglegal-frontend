import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Paperclip, FileText, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { attachmentsApi } from '@/api/attachments'
import type { Attachment } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Props {
  entityType: string
  entityId: number
  label: string
  onClose: () => void
}

export function AttachmentsDialog({ entityType, entityId, label, onClose }: Props) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const qKey = ['attachments', entityType, entityId]

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: qKey,
    queryFn: () => attachmentsApi.list(entityType, entityId),
  })

  const upload = useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(entityType, entityId, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qKey }); toast.success('Archivo subido') },
    onError: () => toast.error('Error al subir el archivo'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => attachmentsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qKey }); toast.success('Eliminado') },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload.mutate(file)
    e.target.value = ''
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Adjuntos — {label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>}
          {!isLoading && attachments.length === 0 && (
            <div className="py-8 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Sin adjuntos</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Adjunta comprobantes, facturas o contratos</p>
            </div>
          )}
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ border: '1px solid hsl(var(--c-inner-border))' }}>
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm flex-1 truncate" title={a.original_name}>{a.original_name}</span>
              <button
                onClick={() => attachmentsApi.download(a.id, a.original_name)}
                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted/50 transition-colors"
                title="Descargar"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => { if (confirm('¿Eliminar adjunto?')) remove.mutate(a.id) }}
                className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive transition-colors" title="Eliminar">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-row justify-between items-center">
          <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            <Paperclip className="h-4 w-4" />
            {upload.isPending ? 'Subiendo...' : 'Adjuntar archivo'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
