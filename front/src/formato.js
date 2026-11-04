// Formatos y catalogos de estados compartidos por la tienda y el panel de admin.
// Asi un mismo estado siempre se ve con el mismo texto y el mismo color.

export const dinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
export const fechaHora = (f) => (f ? new Date(f).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const fecha = (f) => (f ? new Date(f).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—');
export const folio = (id) => `ELX-${id.slice(-8).toUpperCase()}`;

// tono = variante de la clase .etiqueta (ok, aviso, error, info, neutra)
export const ESTADOS_PEDIDO = {
  PENDIENTE_PAGO: { texto: 'Pendiente de pago', tono: 'aviso' },
  PAGADO: { texto: 'Pagado', tono: 'ok' },
  CANCELADO: { texto: 'Cancelado', tono: 'neutra' },
  EXPIRADO: { texto: 'Expirado', tono: 'neutra' },
};

export const PASOS_ENVIO = ['POR_PREPARAR', 'PREPARANDO', 'ENVIADO', 'ENTREGADO'];
export const ENVIOS = {
  POR_PREPARAR: { texto: 'Por preparar', tono: 'neutra' },
  PREPARANDO: { texto: 'Preparando', tono: 'info' },
  ENVIADO: { texto: 'Enviado', tono: 'info' },
  ENTREGADO: { texto: 'Entregado', tono: 'ok' },
};

export const ESTADOS_PAGO = {
  APROBADO: { texto: 'Aprobado', tono: 'ok' },
  PENDIENTE: { texto: 'Pendiente', tono: 'aviso' },
  RECHAZADO: { texto: 'Rechazado', tono: 'error' },
  ERROR: { texto: 'Error', tono: 'error' },
  MONTO_INVALIDO: { texto: 'Monto invalido', tono: 'error' },
  REQUIERE_REEMBOLSO: { texto: 'Requiere reembolso', tono: 'aviso' },
  REEMBOLSADO: { texto: 'Reembolsado', tono: 'neutra' },
};

export const METODOS = { MERCADOPAGO: 'Mercado Pago', PAYPAL: 'PayPal' };

// Quita acentos y mayusculas para buscar ("anejo" encuentra "Añejo")
export const normalizar = (t) =>
  (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
