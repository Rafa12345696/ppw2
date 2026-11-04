// Un id de MongoDB son 24 caracteres hexadecimales.
// Validarlo antes de consultar evita que Prisma lance error con ids mal formados.
export const OBJECT_ID = /^[a-f\d]{24}$/i;