export const PUB_SUB = 'PUB_SUB';
export const TOPIC_ESTADISTICAS = 'estadisticas.actualizadas';
export const TOPIC_PRODUCTOS = 'productos.cambio';

// Cada cliente escucha solo el canal de sus propios pedidos
export const topicPedidosDeUsuario = (usuarioId: string) => `pedidos.usuario.${usuarioId}`;