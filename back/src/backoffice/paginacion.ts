import type { Type } from '@nestjs/common';
import { ObjectType, Field, Int } from '@nestjs/graphql';

export const OBJECT_ID = /^[a-f\d]{24}$/i;

// Molde para respuestas paginadas: { items, total, pagina, paginas }
export function Paginado<T>(clase: Type<T>) {
  @ObjectType({ isAbstract: true })
  abstract class PaginaAbstracta {
    @Field(() => [clase])
    items: T[];

    @Field(() => Int)
    total: number;

    @Field(() => Int)
    pagina: number;

    @Field(() => Int)
    paginas: number;
  }
  return PaginaAbstracta;
}

export function normalizarPagina(pagina?: number | null, porPagina?: number | null) {
  const p = Math.max(1, Math.floor(pagina ?? 1));
  const n = Math.min(50, Math.max(1, Math.floor(porPagina ?? 10)));
  return { pagina: p, porPagina: n, skip: (p - 1) * n, take: n };
}

export function armarPagina<T>(items: T[], total: number, pagina: number, porPagina: number) {
  return { items, total, pagina, paginas: Math.max(1, Math.ceil(total / porPagina)) };
}

// Fechas "YYYY-MM-DD" interpretadas en hora de la Ciudad de Mexico (UTC-6, sin horario de verano)
export function rangoFechas(desde?: string | null, hasta?: string | null) {
  const valido = /^\d{4}-\d{2}-\d{2}$/;
  const rango: { gte?: Date; lte?: Date } = {};

  if (desde && valido.test(desde)) {
    const d = new Date(`${desde}T00:00:00.000-06:00`);
    if (!Number.isNaN(d.getTime())) rango.gte = d;
  }
  if (hasta && valido.test(hasta)) {
    const h = new Date(`${hasta}T23:59:59.999-06:00`);
    if (!Number.isNaN(h.getTime())) rango.lte = h;
  }
  return rango.gte || rango.lte ? rango : undefined;
}