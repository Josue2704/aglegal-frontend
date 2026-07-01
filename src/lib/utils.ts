import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getStoredSettings } from '@/store/settings'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Maps currency code → best locale for that currency's number format
const CURRENCY_LOCALE: Record<string, string> = {
  CRC: 'es-CR',
  USD: 'en-US',
  EUR: 'es-ES',
  COP: 'es-CO',
  MXN: 'es-MX',
  PEN: 'es-PE',
  CLP: 'es-CL',
  ARS: 'es-AR',
  BRL: 'pt-BR',
  GTQ: 'es-GT',
  HNL: 'es-HN',
  NIO: 'es-NI',
  DOP: 'es-DO',
}

export function formatCurrency(amount: number): string {
  const { currency } = getStoredSettings()
  const locale = CURRENCY_LOCALE[currency] ?? 'es-CR'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}
