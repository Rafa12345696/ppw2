import { createHmac, timingSafeEqual } from 'crypto';

// Funciones sueltas de Didit (sin Nest) para poder probarlas facil

export const DIDIT_API = 'https://verification.didit.me';

// Con la llave y el workflow puestos, comprar exige identidad verificada.
// Sin ellos (por ejemplo en tu compu sin configurar) se compra como antes.
export function verificacionObligatoria() {
  return Boolean(process.env.DIDIT_API_KEY && process.env.DIDIT_WORKFLOW_ID);
}

// Estados de Didit -> los nuestros
export type EstadoVerificacion = 'PENDIENTE' | 'EN_REVISION' | 'APROBADA' | 'RECHAZADA' | 'MENOR' | 'ABANDONADA';

export function estadoDe(statusDidit?: string | null): EstadoVerificacion {
  switch (statusDidit) {
    case 'Approved':
      return 'APROBADA';
    case 'Declined':
      return 'RECHAZADA';
    case 'In Review':
      return 'EN_REVISION';
    case 'Abandoned':
    case 'Expired':
    case 'Kyc Expired':
      return 'ABANDONADA';
    default:
      return 'PENDIENTE'; // Not Started, In Progress, Awaiting User, Resubmitted
  }
}

// Ordena las llaves de los objetos (tambien los de adentro)
function ordenarLlaves(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenarLlaves);
  if (valor && typeof valor === 'object') {
    const obj = valor as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = ordenarLlaves(obj[k]);
        return acc;
      }, {});
  }
  return valor;
}

// Texto que Didit firma: el JSON del aviso con las llaves ordenadas y sin espacios.
// (Didit tambien pide volver 1.0 en 1, pero JSON.parse ya lo hace solo)
export function jsonCanonico(cuerpo: unknown) {
  return JSON.stringify(ordenarLlaves(cuerpo));
}

// Revisa X-Signature-V2 (HMAC-SHA256) y que X-Timestamp no tenga mas de 5 minutos
export function firmaDiditValida(
  cuerpo: unknown,
  firma: string | undefined,
  timestamp: string | undefined,
  secreto: string,
  ahora = Math.floor(Date.now() / 1000),
) {
  if (!firma || !timestamp) return false;
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(ahora - ts) > 300) return false;

  const esperado = Buffer.from(createHmac('sha256', secreto).update(jsonCanonico(cuerpo)).digest('hex'));
  const recibido = Buffer.from(firma);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

// Fecha de nacimiento que leyo Didit de la INE ("AAAA-MM-DD"), si la hay
export function fechaDeLaIne(decision: any): Date | null {
  const lista = Array.isArray(decision?.id_verifications)
    ? decision.id_verifications
    : decision?.id_verification
      ? [decision.id_verification]
      : [];
  const texto = lista.find((v: any) => v?.date_of_birth)?.date_of_birth;
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(typeof texto === 'string' ? texto : '');
  if (!partes) return null;
  const fecha = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}
