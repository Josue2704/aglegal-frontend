import { FormGuidance } from '@/components/FormGuidance'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { comisionesApi } from '@/api/comisiones'
import { finanzasApi } from '@/api/finanzas'
import { useAuthStore } from '@/store/auth'
import type { Comision } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const money = (n: number) => n.toLocaleString('es-SV', {style:'currency',currency:'USD'})
const today = () => new Date().toLocaleDateString('en-CA')
const error = (e: unknown) => toast.error((e as {response?:{data?:{detail?:string}}}).response?.data?.detail || 'No se pudo guardar')

export function CommissionSettlementPanel() {
  const qc=useQueryClient()
  const user=useAuthStore(s=>s.user)
  const can=(action:string)=>!!user?.is_admin || !!user?.permissions.includes(`comisiones.${action}`)
  const [review,setReview]=useState<Comision | null>(null)
  const [evidence,setEvidence]=useState('')
  const [eligible,setEligible]=useState(false)
  const [selected,setSelected]=useState<number[]>([])
  const [person,setPerson]=useState('')
  const [pay,setPay]=useState(false)
  const [paymentDate,setPaymentDate]=useState(today())
  const [reference,setReference]=useState('')
  const [account,setAccount]=useState('')
  const [requestKey,setRequestKey]=useState('')
  const {data:all=[],isError,isLoading}=useQuery({queryKey:['commission-workflow'],queryFn:()=>comisionesApi.list()})
  const {data:payments=[]}=useQuery({queryKey:['commission-payments'],queryFn:comisionesApi.liquidaciones})
  const {data:accounts=[]}=useQuery({queryKey:['commission-accounts'],queryFn:()=>finanzasApi.listCuentas({tipo:'Egreso',estado:'Activo'}),enabled:can('pagar')})
  const pending=all.filter(c=>['Calculada','Aprobada'].includes(c.estado))
  const people=[...new Map(pending.map(c=>[c.personal_id,c.persona_nombre])).entries()]
  const rows=pending.filter(c=>!person || c.personal_id===Number(person))
  const chosen=all.filter(c=>selected.includes(c.id))
  const total=chosen.reduce((s,c)=>s+c.comision,0)
  function refresh() {
    for(const key of ['commission-workflow','commission-payments','comisiones-resumen','comisiones-lista','expenses','resumen-mensual']) qc.invalidateQueries({queryKey:[key]})
  }
  const approve=useMutation({mutationFn:()=>comisionesApi.revisar(review!.id,evidence,eligible),onSuccess:()=>{refresh();setReview(null);toast.success('Revisión registrada')},onError:error})
  const settle=useMutation({mutationFn:()=>comisionesApi.liquidar({commission_ids:selected,payment_date:paymentDate,reference,account_id:account?Number(account):null,request_key:requestKey}),onSuccess:()=>{refresh();setPay(false);setSelected([]);toast.success('Liquidación registrada y gasto generado cuando corresponde')},onError:error})
  return <section className="space-y-3 rounded-xl border p-4">
    <h2 className="font-semibold">Revisión y pago de comisiones</h2>
    <p className="text-sm">Primero se recuperan los costos directos del expediente. La comisión se calcula sobre la utilidad que dejan los cobros después de cubrirlos.</p>
    <p className="text-sm text-muted-foreground">Las comisiones calculadas requieren revisión del origen y del trabajo comercial. Selecciona las aprobadas de una misma persona e incluye sus ajustes pendientes. Registrar un pago deja el comprobante y el egreso; no realiza una transferencia bancaria.</p>
    <div className="flex flex-wrap gap-3 items-center">
      <select aria-label="Filtrar comisiones por persona" className="bg-background border rounded-md p-2 max-w-full" value={person} onChange={e=>{setPerson(e.target.value);setSelected([])}}>
        <option value="">Todas las personas</option>{people.map(([id,name])=><option key={id} value={id}>{name}</option>)}
      </select>
      {can('pagar') && <Button disabled={!selected.length} onClick={()=>{setReference('');setPaymentDate(today());setRequestKey(crypto.randomUUID());setPay(true)}}>Registrar pago · {money(total)}</Button>}
    </div>
    {isLoading ? <p>Cargando pendientes…</p> : isError ? <p className="text-destructive">No se pudieron cargar las comisiones. Recarga para reintentar.</p> : <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="text-left border-b"><th className="p-2">Seleccionar</th><th>Persona / expediente</th><th>Período</th><th>Estado</th><th>Comisión</th><th>Revisión</th></tr></thead>
      <tbody>{rows.map(c=><tr key={c.id} className="border-b">
        <td className="p-2"><input type="checkbox" aria-label={`Seleccionar comisión ${c.id}`} checked={selected.includes(c.id)} disabled={!can('pagar') || c.estado!=='Aprobada' || (chosen.length>0 && chosen[0].personal_id!==c.personal_id)} onChange={e=>setSelected(e.target.checked?[...selected,c.id]:selected.filter(id=>id!==c.id))}/></td>
        <td className="py-3 pr-3">{c.persona_nombre}<div className="text-xs text-muted-foreground">{c.case_title} · {c.tipo_origen}</div></td>
        <td className="pr-3 whitespace-nowrap">{c.mes_reconocimiento}</td><td className="pr-3">{c.estado}</td><td className="pr-3 whitespace-nowrap">{money(c.comision)}</td>
        <td>{can('aprobar') && c.estado==='Calculada' ? <Button size="sm" variant="outline" onClick={()=>{setReview(c);setEvidence('');setEligible(false)}}>Revisar</Button>:<span className="text-xs">{c.aprobado_por}<span className="block max-w-64 text-muted-foreground whitespace-pre-wrap">{c.evidencia}</span></span>}</td>
      </tr>)}</tbody></table>{!rows.length && <p className="py-4 text-muted-foreground">No hay comisiones pendientes de revisión o pago.</p>}</div>}
    <details><summary className="cursor-pointer font-medium">Liquidaciones registradas ({payments.length})</summary><div className="overflow-x-auto mt-3"><table className="w-full text-sm"><thead><tr className="text-left"><th>Fecha</th><th>Persona</th><th>Importe</th><th>Comprobante</th><th>Registró</th></tr></thead><tbody>{payments.map(p=><tr key={p.id} className="border-t"><td className="py-2 pr-3">{p.payment_date}</td><td className="pr-3">{p.persona_nombre}</td><td className="pr-3">{money(p.amount_cents/100)}</td><td className="pr-3 break-words">{p.reference}<span className="block text-xs text-muted-foreground">{p.expense_id ? `Gasto #${p.expense_id}`:'Compensación sin salida de efectivo'} · Comisiones {p.commission_ids?.join(', ')}</span></td><td>{p.actor}</td></tr>)}</tbody></table></div></details>
    <Dialog open={!!review} onOpenChange={open=>{if(!open && !approve.isPending)setReview(null)}}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Revisar elegibilidad</DialogTitle></DialogHeader>
      <p className="text-sm">{review?.persona_nombre} · {review?.case_title} · {money(review?.comision || 0)}</p>
      <FormGuidance required="Evidencia de la revisión. Marca elegible solo si corresponde aprobar." optional="Ningún texto: la evidencia es necesaria incluso al rechazar." missing={[!evidence.trim() && 'evidencia']} /><Label htmlFor="commission-evidence">Evidencia y resultado de la revisión *</Label><Textarea id="commission-evidence" value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="Quién originó y desarrolló el negocio, acuerdo o documento que lo acredita. En venta cruzada, explica qué servicio adicional se consiguió."/>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={eligible} onChange={e=>setEligible(e.target.checked)}/>Confirmo que es elegible y autorizo su liquidación. No es una renovación automática ni un simple seguimiento administrativo.</label>
      <p className="text-xs text-muted-foreground">Si no es elegible, la revisión anulará el devengo sin borrar el historial. Los ajustes de pagos anteriores deben aprobarse para su compensación.</p>
      <DialogFooter><Button variant="outline" disabled={approve.isPending} onClick={()=>setReview(null)}>Cancelar</Button><Button disabled={!evidence.trim() || approve.isPending} onClick={()=>approve.mutate()}>{eligible?'Aprobar':'Marcar no elegible'}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={pay} onOpenChange={open=>{if(!settle.isPending)setPay(open)}}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Registrar liquidación</DialogTitle></DialogHeader>
      <p>{chosen[0]?.persona_nombre} · {selected.length} movimientos · <strong>{money(total)}</strong></p>
      <FormGuidance required="Fecha y comprobante; cuenta de egreso si el total es positivo. Solo comisiones aprobadas de una misma persona." optional="Cuenta únicamente si el total es cero y se trata de una compensación." missing={[!paymentDate && 'fecha', !reference.trim() && 'comprobante', total>0 && !account && 'cuenta de egreso']} /><Label htmlFor="commission-date">Fecha del pago realizado *</Label><Input id="commission-date" type="date" max={today()} value={paymentDate} onChange={e=>setPaymentDate(e.target.value)}/>
      <Label htmlFor="commission-reference">Referencia o comprobante *</Label><Input id="commission-reference" value={reference} onChange={e=>setReference(e.target.value)} placeholder="Transferencia, recibo o referencia verificable"/>
      {total>0 && <><Label htmlFor="commission-account">Cuenta del egreso *</Label><select id="commission-account" className="border rounded-md p-2 bg-background w-full" value={account} onChange={e=>setAccount(e.target.value)}><option value="">Seleccionar cuenta</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.account_code} · {a.nombre}</option>)}</select></>}
      <DialogFooter><Button variant="outline" disabled={settle.isPending} onClick={()=>setPay(false)}>Cancelar</Button><Button disabled={settle.isPending || !reference.trim() || !paymentDate || total<0 || (total>0 && !account)} onClick={()=>settle.mutate()}>Confirmar pago registrado</Button></DialogFooter>
    </DialogContent></Dialog>
  </section>
}
