const URL = 'http://localhost:3000/graphql';

export async function graphqlRequest(query, variables = {}) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error(json.errors);
  }
  return json.data;
}