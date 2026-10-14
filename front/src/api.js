const URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/graphql';

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
  const json = await res.json();
  if (json.errors) {
    console.error(json.errors);
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
  const json = await res.json();
  return json.data;
}