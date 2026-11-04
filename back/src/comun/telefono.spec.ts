import { normalizarTelefono } from './telefono.js';

describe('normalizarTelefono', () => {
  it('convierte 10 digitos a formato +52', () => {
    expect(normalizarTelefono('33 1234 5678')).toBe('+523312345678');
    expect(normalizarTelefono('(33) 1234-5678')).toBe('+523312345678');
  });

  it('respeta un numero internacional', () => {
    expect(normalizarTelefono('+14155238886')).toBe('+14155238886');
  });

  it('vacio significa quitar el telefono', () => {
    expect(normalizarTelefono('')).toBeNull();
    expect(normalizarTelefono(null)).toBeNull();
  });

  it('rechaza numeros incompletos', () => {
    expect(() => normalizarTelefono('12345')).toThrow('Telefono no valido');
  });
});
