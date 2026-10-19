import { createClient } from 'graphql-ws';

const URL_HTTP = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/graphql';
// http pasa a ws y https pasa a wss
const URL_WS = URL_HTTP.replace(/^http/, 'ws');

// Abre una suscripcion GraphQL y regresa la funcion para cerrarla
export function suscribirse({ query, variables = {}, token, onData, onEstado }) {
  const cliente = createClient({
    url: URL_WS,
    connectionParams: { authToken: token },
    retryAttempts: 10,
    keepAlive: 20000,
    on: {
      connected: () => onEstado?.(true),
      closed: () => onEstado?.(false),
    },
  });

  const cancelar = cliente.subscribe(
    { query, variables },
    {
      next: (resultado) => {
        if (resultado.data) onData?.(resultado.data);
      },
      error: (e) => {
        console.error('Suscripcion:', e);
        onEstado?.(false);
      },
      complete: () => {},
    },
  );

  return () => {
    cancelar();
    cliente.dispose();
  };
}