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

export function exportCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const escape = (v: string | number | null | undefined): string => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\r\n')
  const blob = new Blob(['﻿' + lines], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
