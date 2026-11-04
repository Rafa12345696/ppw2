import { BadRequestException } from '@nestjs/common';

// Acepta 10 digitos (se asume Mexico, +52) o un numero internacional con "+".
// Regresa null si viene vacio (sirve para quitar el telefono).
export function normalizarTelefono(texto?: string | null): string | null {
  const limpio = (texto ?? '').replace(/[\s()-]/g, '');
  if (!limpio) return null;
  if (/^\d{10}$/.test(limpio)) return `+52${limpio}`;
  if (/^\+\d{11,15}$/.test(limpio)) return limpio;
  throw new BadRequestException('Telefono no valido: escribe 10 digitos o el formato +52...');
}
