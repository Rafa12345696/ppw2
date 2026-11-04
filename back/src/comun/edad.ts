import { BadRequestException } from '@nestjs/common';

export const EDAD_MINIMA = 18;

// "Hoy" en hora de CDMX, para que la edad no cambie a las 6 pm por la diferencia con UTC
function hoyCdmx() {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' })
    .format(new Date())
    .split('-')
    .map(Number);
  return { y, m, d };
}

// Las fechas de nacimiento se guardan a medianoche UTC: se leen con getUTC* para no correrse un dia
export function calcularEdad(fecha: Date) {
  const hoy = hoyCdmx();
  const mes = fecha.getUTCMonth() + 1;
  let edad = hoy.y - fecha.getUTCFullYear();
  if (hoy.m < mes || (hoy.m === mes && hoy.d < fecha.getUTCDate())) edad--;
  return edad;
}

export function esMayorDeEdad(fecha?: Date | null) {
  return !!fecha && calcularEdad(fecha) >= EDAD_MINIMA;
}

// Convierte "AAAA-MM-DD" (lo que manda <input type="date">) en Date y valida que sea mayor de edad
export function leerFechaNacimiento(texto?: string | null): Date {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec((texto ?? '').trim());
  if (!partes) throw new BadRequestException('Fecha de nacimiento no valida');

  const [y, m, d] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const fecha = new Date(Date.UTC(y, m - 1, d));
  // Rechaza fechas que no existen, como 2001-02-30
  if (fecha.getUTCFullYear() !== y || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) {
    throw new BadRequestException('Fecha de nacimiento no valida');
  }

  const edad = calcularEdad(fecha);
  if (edad < 0 || edad > 120) throw new BadRequestException('Fecha de nacimiento no valida');
  if (edad < EDAD_MINIMA) {
    throw new BadRequestException('Elixir es solo para mayores de 18 años');
  }
  return fecha;
}