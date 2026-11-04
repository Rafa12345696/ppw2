import { ESTADOS_PEDIDO, ENVIOS, ESTADOS_PAGO } from '../../formato';

// Etiqueta de color para un estado; el texto siempre acompana al color (no depende solo del color)
function Etiqueta({ info, valor }) {
  const { texto, tono } = info || { texto: valor, tono: 'neutra' };
  return (
    <span className={`etiqueta etiqueta-${tono}`}>
      <span className="punto" aria-hidden="true" />
      {texto}
    </span>
  );
}

export const EstadoPedido = ({ estado }) => <Etiqueta info={ESTADOS_PEDIDO[estado]} valor={estado} />;
export const EstadoEnvio = ({ envio }) => <Etiqueta info={ENVIOS[envio]} valor={envio} />;
export const EstadoPago = ({ estado }) => <Etiqueta info={ESTADOS_PAGO[estado]} valor={estado} />;
