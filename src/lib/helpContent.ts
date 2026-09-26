import type { HelpContent } from '@/components/HelpButton'

export const dashboardHelp: HelpContent = {
  title: 'Dashboard',
  description:
    'Vista general del despacho: comercial, operativa y financiera. Aquí no se registra nada — es un resumen de lo que ya está cargado en las demás pantallas.',
  steps: [
    'Revisa primero la barra roja de "Plazos legales críticos" — son tareas marcadas como críticas que vencen en 3 días o ya vencieron.',
    'La campana de alertas (arriba a la derecha) agrupa tareas vencidas, expedientes sin actividad, cobros vencidos y desviaciones de presupuesto.',
    'Los gráficos de ingresos/gastos y el cumplimiento por familia se alimentan de lo registrado en Flujo de Caja, Facturas y Finanzas.',
    'Haz clic en cualquier tarjeta o ítem de alerta para ir directo al expediente o tarea relacionada.',
  ],
  tips: [
    'Si el dashboard se ve vacío es porque aún no hay clientes, expedientes o movimientos financieros cargados — empieza por Clientes y Expedientes.',
  ],
}

export const clientsHelp: HelpContent = {
  title: 'Clientes',
  description:
    'Ficha de cada persona o empresa que es o fue cliente del despacho. Es el punto de partida: expedientes, sesiones y facturas siempre se enlazan a un cliente.',
  before: [
    'Tipo de cliente: Física o Jurídica.',
    'Cédula/ID, teléfono y email si los tienes (solo el nombre es obligatorio).',
    'Si es cliente jurídico, conviene tener también el nombre de la persona de contacto.',
  ],
  steps: [
    'Pulsa "Nuevo cliente" y completa nombre, tipo, cédula, teléfono, WhatsApp, email, dirección y notas internas.',
    'Guarda — desde su ficha luego podrás ver expedientes, sesiones, facturas y su estado de cuenta.',
    '"Estado de cuenta" muestra indicadores (servicios contratados, facturación acumulada, último servicio, recurrencia) y el resumen financiero (facturado, pagado, pendiente, recibido).',
    '"Papelera" guarda clientes archivados — se pueden restaurar, nunca se elimina información histórica.',
  ],
  tips: ['No se puede eliminar un cliente con casos u oportunidades ligadas — primero hay que archivarlo.'],
}

export const pipelineHelp: HelpContent = {
  title: 'Pipeline Comercial',
  description:
    'Embudo comercial: sigue a un prospecto desde que se contacta hasta que se convierte en cliente (Ganado) o se pierde (Perdido).',
  before: [
    'Nombre y contacto del prospecto (si aún no es cliente), o el cliente ya existente en el sistema.',
    'El servicio de interés (se busca por código o nombre del catálogo).',
    'Canal de captación (cómo llegó) y origen del negocio (quién lo generó — esto define la comisión).',
  ],
  steps: [
    'Pulsa "Nueva oportunidad" y elige si es un prospecto nuevo o un cliente existente.',
    'Completa servicio de interés, honorarios estimados, canal de captación y origen del negocio.',
    'Mueve la tarjeta entre columnas conforme avanza: Prospecto → Cotizado → Ganado / Perdido.',
    'Al marcarla como Perdida debes indicar el motivo. Al ganar puedes registrar al prospecto o vincular una ficha existente.',
    'Antes de abrir, confirma honorarios pactados, alcance aceptado, condiciones de cobro y revisión de posibles conflictos.',
    'Revisa el plan sugerido por el servicio: incluye al menos una tarea con fecha y responsable. La apertura crea todo en una sola operación.',
  ],
  tips: [
    'El honorario estimado aquí solo mide el valor del embudo — no es el honorario final que se factura en el expediente.',
    '"Origen del negocio" sí afecta comisiones; "Canal de captación" es solo informativo.',
    'El historial conserva el seguimiento comercial y el acuerdo de apertura. Abrir el expediente no registra un pago.',
    'Los avisos de seguimiento incompleto señalan oportunidades sin responsable, próxima acción o fecha.',
  ],
}

export const casesHelp: HelpContent = {
  title: 'Expedientes',
  description:
    'El expediente es donde vive el trabajo real de un caso: datos judiciales, honorarios, tareas, sesiones y estado de cobro. Siempre pertenece a un cliente.',
  before: [
    'El cliente ya debe existir en el sistema (créalo primero en Clientes si hace falta).',
    'El servicio del catálogo que se presta, honorarios contratados y costos directos estimados.',
    'Si es un caso judicial: número de expediente judicial/oficial, contraparte, juzgado/entidad y abogado responsable.',
  ],
  steps: [
    'Pulsa "Nuevo expediente", elige el cliente, título, estado y prioridad.',
    'Al elegir el servicio del catálogo, si tiene una plantilla de tareas configurada, se sugiere un checklist inicial — puedes desmarcar las que no apliquen o agregar más antes de crear el expediente.',
    'Completa honorarios contratados, costos directos estimados y mes de cobro esperado — esto alimenta el estado de cobro y el saldo pendiente.',
    'En la sección judicial agrega número interno/oficial, contraparte, juzgado y abogado responsable.',
    'Usa "Próxima acción" para anotar el siguiente paso pendiente (ej. enviar minuta al cliente).',
    'Desde el detalle del expediente se agregan tareas, sesiones y adjuntos ligados a ese caso — si agregas una tarea o sesión con "monto adicional", ese monto sube automáticamente los honorarios contratados y queda en la bitácora del expediente (pestaña Tareas).',
  ],
  tips: [
    'El estado de cobro y el saldo pendiente se calculan solos a partir de los honorarios contratados vs. lo facturado — no se editan a mano.',
    'Las tareas de la plantilla ya están incluidas en los honorarios pactados, sin recargo — el recargo automático solo aplica a tareas/sesiones agregadas después, marcadas con un monto adicional.',
    '"Papelera" guarda expedientes archivados, igual que en Clientes.',
    'Si comparas contra el Archivo Maestro de Excel: el "estado_expediente" de esa hoja (Cotizado/Aceptado/En ejecución/Finalizado/Facturado/Cobrado/Suspendido) aquí se ve repartido en dos lugares — "Cotizado" y "Aceptado" son estados de la oportunidad en Pipeline Comercial, antes de que el caso se abra; una vez abierto, el expediente usa "Estado" (Abierto/En trámite/En pausa/Cerrado) y "Estado de cobro" (En ejecución/Finalizado pendiente de facturar/Facturado pendiente de cobro/Cobrado/Suspendido) por separado.',
    'El "origen_negocio" del Excel (Andrea/Alfredo/Guadalupe/Referido/Orgánico/Otro) se captura en Pipeline Comercial al crear la oportunidad, no en el expediente — el expediente solo hereda quién originó el negocio a través de "Originadores" (usado para calcular comisión).',
  ],
}

export const tasksHelp: HelpContent = {
  title: 'Tareas',
  description: 'Tareas agrupadas por expediente en lista y tablero, ordenadas alfabéticamente. Cada expediente tiene sus propias columnas de estado.',
  before: ['El expediente al que pertenece la tarea (obligatorio) y un título claro.'],
  steps: [
    'Pulsa "Nueva tarea" — puedes crearla sin entrar primero al expediente, solo elige a cuál pertenece.',
    'Agrega fecha de vencimiento, notas y un responsable si aplica.',
    'Marca "Plazo legal crítico" si es un plazo que no se puede perder (se resalta en rojo en el Dashboard).',
    'Filtra por expediente, estado, responsable o etiqueta. Los filtros se conservan al alternar entre lista y tablero.',
    'Haz clic en el círculo junto a la tarea para marcarla como completada, o en el nombre del responsable para reasignarla.',
  ],
  tips: [
    'Los plazos legales críticos vencidos o a 3 días se muestran aparte en el Dashboard para que no se pierdan entre las tareas normales.',
    'Expande o contrae los expedientes para concentrarte en uno. Usa Nueva tarea dentro de su bloque para dejarlo seleccionado.',
    'En el tablero, arrastra las tareas entre las columnas del mismo expediente para cambiar su estado.',
    'Reasignar el responsable no requiere abrir el expediente — se cambia directamente desde esta lista.',
  ],
}

export const sessionsHelp: HelpContent = {
  title: 'Agenda',
  description: 'Calendario de citas y consultas con clientes: quién, cuándo, de qué tipo y en qué estado.',
  before: [
    'El cliente (obligatorio) y, si aplica, el expediente relacionado.',
    'Fecha, hora de inicio y hora de fin.',
    'El tipo de consulta (ej. Consulta inicial, Audiencia — el sistema sugiere opciones mientras escribes).',
  ],
  steps: [
    'Pulsa "Nueva sesión", elige el cliente y, opcionalmente, el expediente.',
    'Define fecha, hora de inicio y fin — el sistema avisa si se cruza con otra sesión ya agendada.',
    'Escribe el tipo de consulta y notas u observaciones.',
    'Actualiza el estado (Pendiente, En proceso, Finalizada, Cancelada) conforme avance la cita.',
  ],
  tips: ['Si el horario coincide con otra sesión, verás una advertencia — no impide guardar, pero conviene revisarlo antes.'],
}

export const cashflowHelp: HelpContent = {
  title: 'Flujo de Caja',
  description: 'Registro de todo el dinero que entra y sale del despacho: ingresos, gastos operativos y costos directos de los casos.',
  before: [
    'Para un ingreso: monto, fecha y, si aplica, cliente, caso y detalle.',
    'Para un gasto o costo: cuenta contable (definida en Finanzas → Plan de Cuentas), monto, fecha y detalle.',
    'IVA y monto reembolsable, si corresponde.',
  ],
  steps: [
    'Usa las pestañas Ingresos, Gastos, Costos Directos y Por Cliente según el tipo de movimiento.',
    'Pulsa "Nuevo" en la pestaña correspondiente y completa monto, fecha, cuenta contable y detalle.',
    'Filtra por rango de fechas con el selector superior para ver un período específico.',
  ],
  tips: ['Las cuentas contables se administran en Finanzas → Plan de Cuentas — créalas ahí primero si no aparece la que necesitas.'],
}

export const invoicesHelp: HelpContent = {
  title: 'Facturas y pagos',
  description: 'Prepara cargos por expediente, emite la factura y registra el dinero recibido por separado.',
  before: ['Selecciona cliente y expediente. El número se asigna automáticamente si lo dejas vacío.',
    'Los extras deben estar autorizados y completados, salvo que hayas acordado facturar por anticipado.'],
  steps: [
    'Desde el expediente pulsa Preparar factura, o entra en Nueva Factura.',
    'Agrega extras con su importe acordado, gastos reembolsables y las demás partidas. Los gastos internos no se ofrecen como cargos.',
    'Guarda un borrador para revisar o emite la factura. Emitir no registra un pago ni envía un correo.',
    'En Registrar pago indica importe, fecha real, cuenta y referencia. También puedes aplicar un anticipo ya registrado sin duplicar caja.',
    'El saldo determina automáticamente si queda pendiente, parcialmente pagada o pagada. Puedes imprimir el documento con su desglose y saldo.',
  ],
  tips: [
    'Solo los borradores se editan o eliminan. Las facturas emitidas conservan su contenido.',
    'Cancelar libera partidas y aplicaciones de pagos. Los ingresos permanecen como saldo disponible para otra factura del mismo expediente; no equivale a devolver dinero.',
    'Los pagos muestran su historial. La parte reembolsable no se trata como honorario.',
  ],
}

export const payrollHelp: HelpContent = {
  title: 'Planilla',
  description: 'Cálculo de planilla (ISSS, AFP, renta, horas extra, nocturnidad, descuentos) y registro de pagos a colaboradores, organizado por período.',
  before: [
    'El colaborador debe existir en Finanzas → Personal, con una cuenta contable de nómina enlazada (para planilla calculada).',
    'Las tasas de ley vigentes en Configuración de nómina — ISSS, AFP y la tabla de retención de renta cambian con el tiempo, verifícalas con tu contador.',
  ],
  steps: [
    'Pulsa "Nuevo pago" y elige "Planilla calculada" para un pago mensual real: selecciona al colaborador, el salario base se prellena desde Personal, y agrega horas extra, nocturnidad, bonos y descuentos (faltas, préstamos) del mes.',
    'Usa "Calcular vista previa" para ver el desglose (ISSS, AFP, renta, neto) antes de guardar.',
    'Usa "Pago manual" solo para un bono suelto o ajuste que ya traes calculado — no pasa por el motor ni por las deducciones de ley.',
    'El ícono de flecha en cada fila calculada despliega el desglose completo. El lápiz permite corregir fecha y notas; el neto solo puede cambiarse en pagos manuales. Para cambiar un cálculo, anula y genera de nuevo. El historial conserva las correcciones.',
    'Al guardar, caja registra el neto. En Obligaciones registra cada remesa ISSS, AFP e ISR con fecha y comprobante: así no se adelantan ni duplican las salidas.',
    '"Config. de ley" abre el historial versionado de tasas ISSS/AFP y la tabla de renta — cada cambio crea una versión nueva, nunca se sobrescribe la anterior, para que una planilla ya pagada conserve la tasa que aplicaba en ese momento.',
    '"Prestaciones" abre una calculadora aparte de aguinaldo, vacaciones (15 días + 30%) e indemnización por despido — son cálculos anuales o de fin de relación laboral, no forman parte de la planilla mensual y no se guardan automáticamente.',
  ],
  tips: [
    'Las comisiones se liquidan desde Comisiones. No copies un importe ya pagado como bono; el pago manual no calcula impuestos ni cotizaciones.',
    'Una planilla calculada no se puede duplicar para la misma persona y el mismo período — evita el doble pago accidental. Un pago manual (bono) sí puede repetirse.',
    'Si la tabla de retención de renta está vacía, el motor calcula ISSS y AFP pero avisa que no retuvo renta — el guardado se bloquea hasta completarla en Configuración de ley.',
    'AFP no tiene tope de cotización por ley — solo ISSS lo tiene. Déjalo vacío en Config. de ley salvo que confirmes que la ley cambió.',
  ],
}

export const reportsHelp: HelpContent = {
  title: 'Reportes',
  description: 'Resumen financiero y operativo imprimible del despacho para un período determinado.',
  before: ['Nada que registrar aquí — solo que Flujo de Caja, Facturas y Finanzas ya tengan datos cargados en el período que quieres reportar.'],
  steps: [
    'Elige un período predefinido o "Personalizado" para definir fechas Desde/Hasta.',
    'Revisa las tarjetas resumen y los gráficos, que se generan automáticamente con lo ya registrado.',
    'Pulsa "Imprimir / Guardar PDF" para exportar el reporte tal como se ve en pantalla.',
  ],
}

export const catalogoHelp: HelpContent = {
  title: 'Catálogo Maestro',
  description: 'Catálogo de referencia con todas las categorías, subcategorías, servicios y familias que ofrece el despacho. Es de solo lectura.',
  steps: [
    'Usa las pestañas Catálogo y Familias, junto con el buscador, para consultar categorías, subcategorías y servicios existentes.',
    'Haz clic en el ícono de checklist junto a un servicio para administrar su plantilla de tareas — la lista que se sugiere al crear un expediente con ese servicio (esto sí es edición directa, no pasa por Gobierno del Catálogo).',
    'Haz clic en el ícono de reloj para ver el historial de cambios de un servicio.',
    'Si necesitas crear, modificar o dar de baja el servicio en sí (nombre, tarifa, código), ve a "Gobierno del Catálogo" y levanta una solicitud — no se edita directamente aquí.',
  ],
}

export const finanzasHelp: HelpContent = {
  title: 'Finanzas',
  description: 'Configuración financiera de fondo del despacho: plan de cuentas contables, personal, gastos fijos, punto de equilibrio y presupuesto anual.',
  before: [
    'Para una cuenta contable: código, tipo, grupo/subgrupo y nombre.',
    'Para personal: nombre de la persona, cargo y monto mensual.',
  ],
  steps: [
    'Plan de Cuentas: crea las categorías contables (ingreso/gasto) que luego usarás en Flujo de Caja y Facturas.',
    'Personal: registra colaboradores con su monto mensual — de aquí se alimenta Nóminas.',
    'Gastos Fijos: gastos recurrentes con mes de inicio y fin.',
    'Punto de Equilibrio: define costo variable %, margen operativo meta y margen de seguridad por período.',
    'Presupuesto: metas de volumen, ticket objetivo y margen directo objetivo por familia y mes.',
  ],
  tips: ['Configura primero el Plan de Cuentas — casi todas las demás pantallas (Flujo de Caja, Facturas) dependen de que esas cuentas ya existan.'],
}

export const comisionesHelp: HelpContent = {
  title: 'Comisiones',
  description:
    'Compensación variable por originador del negocio — se calcula sola, por tramos mensuales acumulados, con base en el "origen del negocio" registrado en el Pipeline.',
  before: ['Nada que llenar directamente — las comisiones se generan solas cuando se cobra un ingreso ligado a una oportunidad con origen de negocio asignado.'],
  steps: [
    'Elige el mes para ver el resumen de comisiones por persona y el detalle por expediente.',
    'Primero se recuperan los costos directos reales del expediente; solo el excedente cobrado genera comisión. Los cambios de costos y abonos recalculan las comisiones y requieren nueva revisión.',
    'En Revisión y pago, documenta la elegibilidad y aprueba cada comisión. Selecciona las aprobadas de una persona, incluye sus ajustes y registra fecha, comprobante y cuenta del egreso. El sistema guarda el gasto una sola vez; no envía dinero al banco.',
    'Si reviertes una comisión sin pagar, se anula conservando el historial. Si ya fue pagada, el pago se conserva y el ajuste se compensa desde el siguiente período. Aprobar y pagar requieren permisos específicos.',
    'Exporta el detalle a CSV si lo necesitas.',
  ],
  tips: ['El campo que determina quién cobra comisión es "Origen del negocio" en Pipeline, no el "Canal de captación".'],
}

export const gobiernoHelp: HelpContent = {
  title: 'Gobierno del Catálogo',
  description:
    'Flujo de solicitudes para crear, modificar o dar de baja categorías, subcategorías, servicios y familias del Catálogo Maestro — evita que cualquiera edite el catálogo directamente.',
  before: [
    'El tipo de solicitud (Alta, Cambio o Baja) y el tipo de registro (Categoría, Subcategoría, Servicio o Familia).',
    'Si es Cambio o Baja: el registro existente que quieres modificar.',
    'El motivo de la solicitud.',
  ],
  steps: [
    'Pulsa "Nueva solicitud", elige tipo de solicitud y tipo de registro.',
    'Para una Alta, completa nombre, código, categoría/subcategoría padre, tarifa y costo de referencia.',
    'Para Cambio o Baja, busca y selecciona el registro existente que quieres afectar.',
    'Sigue el flujo de estados: Solicitado → En revisión → Aprobado (activa el cambio en el Catálogo Maestro automáticamente) o Rechazado.',
  ],
  tips: ['Al aprobar una solicitud, el sistema revisa duplicidad y aplica el cambio directo en el Catálogo Maestro — no hay un paso extra.'],
}

export const usersHelp: HelpContent = {
  title: 'Usuarios',
  description: 'Cuentas de acceso al sistema para el personal del despacho — solo administradores pueden ver esta pantalla.',
  before: ['Usuario, nombre completo, correo y el rol que va a tener (los roles y sus permisos se definen en Roles y Permisos).'],
  steps: [
    'Pulsa "Nuevo usuario" y completa usuario, nombre, correo, rol y contraseña inicial.',
    'Para cambiar la contraseña de alguien más adelante, usa la opción correspondiente desde su fila.',
  ],
  tips: ['Crea primero el rol adecuado en Roles y Permisos si el que necesitas todavía no existe.'],
}

export const rolesHelp: HelpContent = {
  title: 'Roles y Permisos',
  description: 'Define qué puede ver y hacer cada tipo de usuario en el sistema, agrupando permisos bajo un nombre de rol.',
  before: ['El nombre del rol, una descripción breve y qué permisos debe tener en cada módulo (ver, crear, editar, etc.).'],
  steps: [
    'Pulsa "Nuevo rol" y asígnale nombre y descripción.',
    'Marca los permisos que debe tener en cada módulo (Clientes, Expedientes, Finanzas, etc.).',
    'Asigna ese rol a los usuarios correspondientes desde Usuarios.',
  ],
  tips: ['Los roles marcados como "Sistema" vienen predefinidos y no deberían editarse a la ligera.'],
}

export const settingsHelp: HelpContent = {
  title: 'Configuración',
  description: 'Preferencias generales del sistema: tema visual, divisa, datos del despacho e integración con calendarios.',
  steps: [
    'Elige el tema (claro/oscuro) y la divisa activa en los paneles correspondientes — la divisa afecta cómo se muestran todos los montos del sistema.',
    'Completa los datos del despacho en el panel correspondiente.',
    'Conecta Google Calendar u Outlook si quieres sincronizar la Agenda.',
  ],
}
