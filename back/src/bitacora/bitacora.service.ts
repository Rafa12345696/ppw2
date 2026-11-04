import { Injectable, Logger, OnModuleDestroy, OnModuleInit, BadRequestException } from '@nestjs/common';
import pg from 'pg';
import { normalizarPagina, armarPagina, rangoFechas } from '../backoffice/paginacion.js';
import type { FiltroBitacora } from './bitacora.models.js';

// La bitacora vive en PostgreSQL (Neon). La tabla se crea sola al arrancar si no existe.
const CREAR_TABLA = `
  CREATE TABLE IF NOT EXISTS bitacora_admin (
    id          BIGSERIAL PRIMARY KEY,
    fecha       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    admin_id    VARCHAR(24)  NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    accion      VARCHAR(80)  NOT NULL,
    entidad     VARCHAR(20)  NOT NULL,
    entidad_id  VARCHAR(64),
    detalle     TEXT
  );
  CREATE INDEX IF NOT EXISTS bitacora_admin_fecha_idx ON bitacora_admin (fecha DESC);
`;

const SENSIBLES = /password|contrase|token|secret|clave|firma|signature/i;

// Quita contraseñas, tokens y similares antes de guardar los argumentos
export function limpiarArgs(valor: unknown, profundidad = 0): unknown {
  if (profundidad > 4) return '[...]';
  if (Array.isArray(valor)) return valor.slice(0, 20).map((v) => limpiarArgs(v, profundidad + 1));
  if (valor instanceof Date) return valor.toISOString();
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).map(([k, v]) => [k, SENSIBLES.test(k) ? '[oculto]' : limpiarArgs(v, profundidad + 1)]),
    );
  }
  return valor;
}

// Que tipo de cosa toco la accion, a partir del nombre de la mutation
export function entidadDe(accion: string) {
  const a = accion.toLowerCase();
  if (a.includes('producto')) return 'PRODUCTO';
  if (a.includes('categoria')) return 'CATEGORIA';
  if (a.includes('usuario') || a.includes('password')) return 'USUARIO';
  if (a.includes('pedido')) return 'PEDIDO';
  if (a.includes('imagen')) return 'IMAGEN';
  return 'OTRO';
}

export interface EntradaBitacora {
  adminId: string;
  adminEmail: string;
  accion: string;
  entidadId?: string | null;
  args: unknown;
}

@Injectable()
export class BitacoraService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BitacoraService.name);
  private pool: pg.Pool | null = null;
  private lista: Promise<void> = Promise.resolve();

  onModuleInit() {
    const url = process.env.POSTGRES_URL;
    if (!url) {
      this.logger.warn('Falta POSTGRES_URL: la bitacora del admin queda desactivada');
      return;
    }
    this.pool = new pg.Pool({ connectionString: url, max: 3, idleTimeoutMillis: 30_000 });
    // Neon cierra conexiones inactivas: sin este manejador el proceso se caeria
    this.pool.on('error', (e) => this.logger.error(`Conexion a PostgreSQL perdida: ${e.message}`));
    // No se espera aqui para no retrasar el arranque; registrar() y pagina() si esperan
    this.lista = this.pool
      .query(CREAR_TABLA)
      .then(() => this.logger.log('Bitacora lista en PostgreSQL'))
      .catch((e: Error) => this.logger.error(`No se pudo preparar la bitacora: ${e.message}`));
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  // Nunca lanza error: una falla de la bitacora no debe deshacer la accion del admin
  async registrar(e: EntradaBitacora) {
    if (!this.pool) return;
    try {
      await this.lista;
      const detalle = JSON.stringify(limpiarArgs(e.args) ?? {}).slice(0, 2000);
      await this.pool.query(
        `INSERT INTO bitacora_admin (admin_id, admin_email, accion, entidad, entidad_id, detalle)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [e.adminId, e.adminEmail, e.accion, entidadDe(e.accion), e.entidadId ?? null, detalle],
      );
    } catch (error) {
      this.logger.error(`No se pudo registrar "${e.accion}" en la bitacora: ${(error as Error).message}`);
    }
  }

  async pagina(f: FiltroBitacora | undefined, pagina?: number | null, porPagina?: number | null) {
    if (!this.pool) {
      throw new BadRequestException('La bitacora no esta configurada: falta POSTGRES_URL en el servidor');
    }
    await this.lista;

    const pag = normalizarPagina(pagina, porPagina);
    const condiciones: string[] = [];
    const valores: unknown[] = [];
    const param = (v: unknown) => {
      valores.push(v);
      return `$${valores.length}`;
    };

    const buscar = f?.buscar?.trim();
    if (buscar) {
      // Se escapan % y _ para que se busquen como texto normal
      const p = param(`%${buscar.replace(/[\\%_]/g, '\\$&')}%`);
      condiciones.push(
        `(accion ILIKE ${p} OR admin_email ILIKE ${p} OR COALESCE(entidad_id, '') ILIKE ${p} OR COALESCE(detalle, '') ILIKE ${p})`,
      );
    }
    if (f?.entidad) condiciones.push(`entidad = ${param(f.entidad)}`);

    const rango = rangoFechas(f?.desde, f?.hasta);
    if (rango?.gte) condiciones.push(`fecha >= ${param(rango.gte)}`);
    if (rango?.lte) condiciones.push(`fecha <= ${param(rango.lte)}`);

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    // El conteo usa solo los valores de los filtros; la consulta de la pagina agrega LIMIT y OFFSET
    const valoresFiltro = [...valores];
    const n = valores.length;
    const valoresPagina = [...valores, pag.take, pag.skip];

    const [filas, conteo] = await Promise.all([
      this.pool.query(
        `SELECT id, fecha, admin_email, accion, entidad, entidad_id, detalle
         FROM bitacora_admin ${where}
         ORDER BY fecha DESC, id DESC
         LIMIT $${n + 1} OFFSET $${n + 2}`,
        valoresPagina,
      ),
      this.pool.query(`SELECT COUNT(*)::int AS total FROM bitacora_admin ${where}`, valoresFiltro),
    ]);

    const items = filas.rows.map((r) => ({
      id: String(r.id),
      fecha: r.fecha as Date,
      adminEmail: r.admin_email as string,
      accion: r.accion as string,
      entidad: r.entidad as string,
      entidadId: r.entidad_id as string | null,
      detalle: r.detalle as string | null,
    }));
    return armarPagina(items, conteo.rows[0].total as number, pag.pagina, pag.porPagina);
  }
}
