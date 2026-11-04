// Fecha mas reciente con la que alguien ya cumple 18 anos, en formato AAAA-MM-DD para <input type="date">.
// Solo es ayuda visual: quien valida de verdad es el servidor.
export function fechaMaximaNacimiento() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}