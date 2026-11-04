import { calcularEdad, esMayorDeEdad, leerFechaNacimiento } from './edad.js';

describe('edad', () => {
  beforeEach(() => {
    // 3 de noviembre de 2026, 12:00 en CDMX (18:00 UTC)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T18:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cuenta la edad y respeta el dia del cumpleaños', () => {
    expect(calcularEdad(new Date(Date.UTC(2008, 10, 3)))).toBe(18); // cumple hoy
    expect(calcularEdad(new Date(Date.UTC(2008, 10, 4)))).toBe(17); // cumple mañana
  });

  it('usa la fecha de CDMX y no la de UTC', () => {
    // 3 de noviembre a las 23:00 en CDMX ya es 4 de noviembre en UTC
    vi.setSystemTime(new Date('2026-11-04T05:00:00Z'));
    expect(calcularEdad(new Date(Date.UTC(2008, 10, 4)))).toBe(17);
  });

  it('acepta a un mayor de edad', () => {
    const fecha = leerFechaNacimiento('2000-05-10');
    expect(fecha.toISOString()).toBe('2000-05-10T00:00:00.000Z');
    expect(esMayorDeEdad(fecha)).toBe(true);
  });

  it('rechaza a menores de 18', () => {
    expect(() => leerFechaNacimiento('2010-01-01')).toThrow('mayores de 18');
  });

  it('rechaza fechas que no existen o con formato incorrecto', () => {
    expect(() => leerFechaNacimiento('2001-02-30')).toThrow('no valida');
    expect(() => leerFechaNacimiento('10/05/2000')).toThrow('no valida');
    expect(() => leerFechaNacimiento('')).toThrow('no valida');
    expect(() => leerFechaNacimiento('1890-01-01')).toThrow('no valida');
  });

  it('sin fecha no es mayor de edad', () => {
    expect(esMayorDeEdad(null)).toBe(false);
  });
});
