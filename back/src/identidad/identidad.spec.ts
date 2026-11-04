import { createHmac } from 'crypto';
import { estadoDe, fechaDeLaIne, firmaDiditValida, jsonCanonico } from './didit.js';
import { IdentidadService } from './identidad.service.js';

const SECRETO = 'secreto-de-prueba';

describe('firma de Didit', () => {
  const cuerpo = { status: 'Approved', session_id: 'abc', decision: { score: 98.5, b: 2, a: 'ñ' } };
  const firmar = (texto: string) => createHmac('sha256', SECRETO).update(texto).digest('hex');
  const ahora = 1_800_000_000;

  it('ordena las llaves sin espacios', () => {
    expect(jsonCanonico(cuerpo)).toBe('{"decision":{"a":"ñ","b":2,"score":98.5},"session_id":"abc","status":"Approved"}');
  });

  it('acepta una firma correcta y reciente', () => {
    expect(firmaDiditValida(cuerpo, firmar(jsonCanonico(cuerpo)), String(ahora - 10), SECRETO, ahora)).toBe(true);
  });

  it('rechaza firma alterada, vieja o faltante', () => {
    const buena = firmar(jsonCanonico(cuerpo));
    expect(firmaDiditValida({ ...cuerpo, status: 'Declined' }, buena, String(ahora), SECRETO, ahora)).toBe(false);
    expect(firmaDiditValida(cuerpo, buena, String(ahora - 301), SECRETO, ahora)).toBe(false);
    expect(firmaDiditValida(cuerpo, undefined, String(ahora), SECRETO, ahora)).toBe(false);
  });
});

describe('estadoDe y fechaDeLaIne', () => {
  it('traduce los estados de Didit', () => {
    expect(estadoDe('Approved')).toBe('APROBADA');
    expect(estadoDe('Declined')).toBe('RECHAZADA');
    expect(estadoDe('In Review')).toBe('EN_REVISION');
    expect(estadoDe('Expired')).toBe('ABANDONADA');
    expect(estadoDe('In Progress')).toBe('PENDIENTE');
  });

  it('lee la fecha de nacimiento de la INE', () => {
    expect(fechaDeLaIne({ id_verifications: [{ date_of_birth: '1990-05-17' }] })?.toISOString()).toBe('1990-05-17T00:00:00.000Z');
    expect(fechaDeLaIne({ id_verifications: [] })).toBeNull();
  });
});

describe('IdentidadService.aplicarDecision', () => {
  const ID = '65f0c0ffee00000000000001';

  function armar(usuario: Record<string, unknown>) {
    const prisma = {
      usuario: {
        findUnique: vi.fn().mockResolvedValue({ id: ID, identidadVerificada: false, verificacionSesion: 's1', ...usuario }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    return { servicio: new IdentidadService(prisma as any), prisma };
  }
  const decision = (dob: string, status = 'Approved', session_id = 's1') => ({
    vendor_data: ID,
    session_id,
    status,
    id_verifications: [{ date_of_birth: dob }],
  });

  it('aprueba a un adulto y guarda la fecha de la INE', async () => {
    const { servicio, prisma } = armar({});
    await servicio.aplicarDecision(decision('1990-05-17'));
    const data = prisma.usuario.update.mock.calls[0][0].data;
    expect(data.identidadVerificada).toBe(true);
    expect(data.verificacionEstado).toBe('APROBADA');
    expect(data.fechaNacimiento.toISOString()).toBe('1990-05-17T00:00:00.000Z');
  });

  it('no verifica a un menor aunque Didit apruebe la INE', async () => {
    const { servicio, prisma } = armar({});
    const anio = new Date().getUTCFullYear() - 15;
    await servicio.aplicarDecision(decision(`${anio}-01-01`));
    const data = prisma.usuario.update.mock.calls[0][0].data;
    expect(data.identidadVerificada).toBeUndefined();
    expect(data.verificacionEstado).toBe('MENOR');
  });

  it('ignora resultados de una sesion vieja o de una cuenta ya verificada', async () => {
    const vieja = armar({});
    await vieja.servicio.aplicarDecision(decision('1990-05-17', 'Declined', 'otra'));
    expect(vieja.prisma.usuario.update).not.toHaveBeenCalled();

    const ya = armar({ identidadVerificada: true });
    await ya.servicio.aplicarDecision(decision('1990-05-17', 'Declined'));
    expect(ya.prisma.usuario.update).not.toHaveBeenCalled();
  });
});
