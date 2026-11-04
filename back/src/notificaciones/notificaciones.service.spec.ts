import { NotificacionesService, claveAviso } from './notificaciones.service.js';

describe('claveAviso', () => {
  it('relaciona cada estado con su aviso', () => {
    expect(claveAviso({ estado: 'PENDIENTE_PAGO' })).toBeNull();
    expect(claveAviso({ estado: 'PAGADO', envio: null })).toBe('PAGADO');
    expect(claveAviso({ estado: 'PAGADO', envio: 'POR_PREPARAR' })).toBe('PAGADO');
    expect(claveAviso({ estado: 'PAGADO', envio: 'ENVIADO' })).toBe('ENVIADO');
    expect(claveAviso({ estado: 'EXPIRADO' })).toBe('EXPIRADO');
  });
});

describe('NotificacionesService.avisarCambio', () => {
  const pedido = {
    id: '65f0c0ffee00000000000001',
    estado: 'PAGADO',
    envio: null,
    total: 850,
    avisoEnviado: null as string | null,
    usuario: { email: 'cliente@elixir.com', nombre: 'Cliente', telefono: '+523312345678' },
  };

  function armar(reclamados: number) {
    const prisma = {
      pedido: {
        findUnique: vi.fn().mockResolvedValue({ ...pedido }),
        updateMany: vi.fn().mockResolvedValue({ count: reclamados }),
      },
    };
    const mail = { configurado: () => true, enviar: vi.fn().mockResolvedValue(undefined) };
    const whatsapp = { configurado: () => true, enviar: vi.fn().mockResolvedValue(undefined) };
    const servicio = new NotificacionesService(prisma as any, mail as any, whatsapp as any);
    return { servicio, prisma, mail, whatsapp };
  }

  it('manda correo y WhatsApp cuando el estado es nuevo', async () => {
    const { servicio, mail, whatsapp } = armar(1);
    await servicio.avisarCambio(pedido.id);
    expect(mail.enviar).toHaveBeenCalledOnce();
    expect(mail.enviar.mock.calls[0][0].asunto).toContain('Recibimos tu pago');
    expect(whatsapp.enviar).toHaveBeenCalledWith('+523312345678', expect.stringContaining('Elixir'));
  });

  it('no repite el aviso si otro proceso ya lo reclamo', async () => {
    const { servicio, mail, whatsapp } = armar(0);
    await servicio.avisarCambio(pedido.id);
    expect(mail.enviar).not.toHaveBeenCalled();
    expect(whatsapp.enviar).not.toHaveBeenCalled();
  });

  it('un fallo del proveedor no rompe el flujo', async () => {
    const { servicio, mail } = armar(1);
    mail.enviar.mockRejectedValue(new Error('Brevo caido'));
    await expect(servicio.avisarCambio(pedido.id)).resolves.toBeUndefined();
  });
});
