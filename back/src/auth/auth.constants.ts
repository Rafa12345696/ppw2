// Clave con la que se firman y verifican los JWT. Se lee una sola vez al arrancar.
const secreto = process.env.JWT_ACCESS_SECRET;

// En Render no se permite arrancar sin clave: con una clave conocida cualquiera podria fabricar tokens de ADMIN.
// Render define sola la variable RENDER en sus servidores.
if (!secreto && process.env.RENDER) {
  throw new Error('Falta la variable JWT_ACCESS_SECRET en Render');
}
if (!secreto) {
  console.warn('[auth] Falta JWT_ACCESS_SECRET en el .env: se usa una clave solo para desarrollo');
}

export const JWT_SECRET = secreto || 'clave_solo_para_desarrollo';