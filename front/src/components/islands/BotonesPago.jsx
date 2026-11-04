// Enlace con estilo de boton (un <button> dentro de un <a> no es HTML valido)
export default function BotonesPago({ pedidoId, secundario = false }) {
  return (
    <a className={`btn ${secundario ? 'btn-secundario btn-sm' : 'btn-primario'}`} href={`/pagar?pedido=${pedidoId}`}>
      Pagar ahora
    </a>
  );
}
