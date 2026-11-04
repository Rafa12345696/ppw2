const URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/graphql';

// Evita que varias peticiones fallidas al mismo tiempo redirijan varias veces
let cerrandoSesion = false;

// NestJS convierte UnauthorizedException (401) en el codigo UNAUTHENTICATED
function esNoAutenticado(errores) {
  return errores.some(
    (e) =>
      e?.extensions?.code === 'UNAUTHENTICATED' ||
      e?.extensions?.originalError?.statusCode === 401,
  );
}

// Token vencido, invalido o cuenta desactivada: cierra la sesion (el carrito se guarda) y manda al login
async function sesionInvalida() {
  if (typeof window === 'undefined' || cerrandoSesion) return;
  cerrandoSesion = true;

  // Import dinamico: api.js tambien se usa en el servidor de Astro, donde no hay localStorage
  const { useStore } = await import('./store.js');
  useStore.getState().cerrarSesion();

  const aqui = window.location.pathname + window.location.search;
  window.location.href = `/login?expirada=1&next=${encodeURIComponent(aqui)}`;
}

// Si Render esta dormido a veces responde una pagina HTML en vez de JSON
async function leerJson(res) {
  try {
    return await res.json();
  } catch {
    throw new Error('El servidor no respondio bien. Si estaba dormido, intenta de nuevo en unos segundos.');
  }
}

export async function graphqlRequest(query, variables = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = await leerJson(res);

  if (json.errors) {
    // El mensaje va como texto para no ver solo "Array(1)" en la consola
    console.error('GraphQL:', json.errors.map((e) => e.message).join(' | '), json.errors);

    // Solo si se mando token: un login con contrasena incorrecta tambien es 401, pero no lleva token
    if (token && esNoAutenticado(json.errors)) {
      await sesionInvalida();
      throw new Error('Tu sesion termino. Inicia sesion de nuevo.');
    }
    throw new Error(json.errors[0]?.message || 'Error en la consulta');
  }
  return json.data;
}

// Version para el servidor de Astro (sin token, solo lectura publica)
export async function graphqlFetchSSR(query, variables = {}) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(8000),
  });
  const json = await leerJson(res);
  return json.data;
}