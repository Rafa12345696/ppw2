export default function BotonesPago({ pedidoId }) {
  return (
    <a href={`/pagar?pedido=${pedidoId}`}>
      <button>Pagar ahora</button>
    </a>
  );
}