import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    try {
      const data = await authApi.login(username.trim(), password)
      setAuth(data.access_token, data.user)
      navigate('/', { replace: true })
    } catch {
      toast.error('Credenciales incorrectas. Verifique su usuario y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0A2342 0%, #0d2d52 60%, #0f3366 100%)' }}>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="flex justify-center">
            <div
              className="flex items-center justify-center w-24 h-24 rounded-2xl"
              style={{ background: '#0A2342', border: '1px solid hsl(43 57% 45% / 0.3)' }}
            >
              <img src="/AG LOGO 04.png" alt="AG Legal" className="h-16 w-auto object-contain" />
            </div>
          </div>
          <CardTitle className="text-2xl">AG Legal</CardTitle>
          <CardDescription>Sistema de Gestión para Bufete</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando...' : 'Iniciar sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
