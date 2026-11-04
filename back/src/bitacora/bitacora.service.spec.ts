import { limpiarArgs, entidadDe } from './bitacora.service.js';

describe('bitacora', () => {
  it('oculta contraseñas y tokens, incluso anidados', () => {
    const limpio = limpiarArgs({
      id: 'u1',
      password: 'secreto',
      data: { nombre: 'Ana', accessToken: 'abc' },
    });
    expect(limpio).toEqual({ id: 'u1', password: '[oculto]', data: { nombre: 'Ana', accessToken: '[oculto]' } });
  });

  it('identifica la entidad por el nombre de la accion', () => {
    expect(entidadDe('actualizarProducto')).toBe('PRODUCTO');
    expect(entidadDe('eliminarCategoria')).toBe('CATEGORIA');
    expect(entidadDe('restablecerPasswordUsuario')).toBe('USUARIO');
    expect(entidadDe('cambiarEnvioPedido')).toBe('PEDIDO');
    expect(entidadDe('firmarSubidaImagen')).toBe('IMAGEN');
    expect(entidadDe('otraCosa')).toBe('OTRO');
  });
});
