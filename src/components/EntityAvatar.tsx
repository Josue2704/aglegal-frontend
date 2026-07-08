import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import { attachmentsApi } from '@/api/attachments'

interface EntityAvatarProps {
  entityType: 'client' | 'user'
  entityId: number
  name: string
  /** Size in pixels (default 32) */
  size?: number
  /** Whether to show the upload button on hover */
  editable?: boolean
  className?: string
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'
}

// Deterministic hue from name string
function nameHue(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return h % 360
}

export function EntityAvatar({
  entityType,
  entityId,
  name,
  size = 32,
  editable = false,
  className = '',
}: EntityAvatarProps) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [imgError, setImgError] = useState(false)
  const qKey = ['avatar', entityType, entityId]

  const { data: avatar } = useQuery({
    queryKey: qKey,
    queryFn: () => attachmentsApi.getAvatar(entityType, entityId),
    retry: false,           // 404 = no avatar, don't retry
    staleTime: 5 * 60_000,
  })

  const upload = useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(entityType, entityId, file, 'avatar'),
    onSuccess: () => {
      setImgError(false)
      qc.invalidateQueries({ queryKey: qKey })
      toast.success('Foto actualizada')
    },
    onError: () => toast.error('Error al subir la foto'),
  })

  const hue = nameHue(name)
  const avatarUrl = avatar && !imgError ? attachmentsApi.downloadUrl(avatar.id) : null
  const fontSize = Math.round(size * 0.36)

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-semibold select-none"
          style={{
            background: `hsl(${hue} 55% 88%)`,
            color: `hsl(${hue} 55% 30%)`,
            fontSize,
          }}
        >
          {initials(name)}
        </div>
      )}

      {/* Upload overlay */}
      {editable && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            title="Cambiar foto"
          >
            <Camera className="text-white" style={{ width: size * 0.35, height: size * 0.35 }} />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) upload.mutate(file)
              e.target.value = ''
            }}
          />
        </>
      )}
    </div>
  )
}
