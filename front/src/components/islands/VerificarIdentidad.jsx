import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import { IcoAlerta, IcoCheck, IcoInfo, IcoReloj } from './Iconos';

const ESTADO = `query { miVerificacion { requerida verificada estado } }`;
const INICIAR = `mutation { iniciarVerificacion { url } }`;

const LLAVE_DESTINO = 'elixir-verificacion-destino';
const EN_CURSO = ['PENDIENTE', 'EN_REVISION'];

// Solo rutas internas, igual que en el login
function interna(ruta) {
  return typeof ruta === 'string' && ruta.startsWith('/') && !ruta.startsWith('//') && !ruta.startsWith('/\\');
}

function leerDestino() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (interna(next)) return next;
  try {
    const guardado = sessionStorage.getItem(LLAVE_DESTINO);
    if (interna(guardado)) return guardado;
  } catch {
    // sin almacenamiento: no pasa nada
  }
  return '/tienda';
}

function guardarDestino(ruta) {
  try {
    sessionStorage.setItem(LLAVE_DESTINO, ruta);
  } catch {
    // sin almacenamiento: al volver se va a la tienda
  }
}

// Mensaje para cada resultado que no es "aprobada"
const RESULTADOS = {
  RECHAZADA: {
    tono: 'error',
    texto: 'No pudimos verificar tu identidad. Revisa que tu INE este vigente, que se lea bien y que la selfie sea tuya. Puedes intentarlo otra vez.',
  },
  ABANDONADA: { tono: 'aviso', texto: 'La verificacion anterior no se termino o ya vencio. Empieza una nueva.' },
  PENDIENTE: { tono: 'aviso', texto: 'Tienes una verificacion sin terminar. Puedes empezar de nuevo.' },
};

export default function VerificarIdentidad() {
  const token = useStore((state) => state.token);
  const usuario = useStore((state) => state.usuario);
  const hidratado = useStore((state) => state.hidratado);
  const actualizarUsuario = useStore((state) => state.actualizarUsuario);

  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [destino, setDestino] = useState('/tienda');
  const intentos = useRef(0);
  // true mientras se espera el resultado (al cerrar la ventana de Didit o al volver de su pagina)
  const esperando = useRef(false);

  useEffect(() => {
    if (!hidratado) return;
    if (!usuario) {
      window.location.href = '/login?next=/verificar-identidad';
      return;
    }
    setDestino(leerDestino());
    // Desde el celular Didit puede regresar aqui con ?verificationSessionId=...
    esperando.current = new URLSearchParams(window.location.search).has('verificationSessionId');
    setRevisando(esperando.current);
    consultar();
  }, [hidratado]);

  const consultar = async () => {
    try {
      const data = await graphqlRequest(ESTADO, {}, token);
      const r = data.miVerificacion;
      setInfo(r);
      if (r.verificada && !usuario?.identidadVerificada) actualizarUsuario({ identidadVerificada: true });
      if (!r.verificada && EN_CURSO.includes(r.estado) && esperando.current && intentos.current < 10) {
        intentos.current += 1;
        setTimeout(consultar, 4000);
      } else {
        esperando.current = false;
        setRevisando(false);
      }
    } catch (e) {
      setError(e.message || 'No se pudo consultar tu verificacion');
      setRevisando(false);
    }
  };

  const esperarResultado = () => {
    esperando.current = true;
    intentos.current = 0;
    setRevisando(true);
    consultar();
  };

  // La verificacion se abre en una ventana encima de la tienda (SDK de Didit)
  const empezar = async (e) => {
    e.preventDefault();
    if (!acepto) return;
    setEnviando(true);
    setError('');
    try {
      const data = await graphqlRequest(INICIAR, {}, token);
      const url = data.iniciarVerificacion.url;
      guardarDestino(destino);

      let sdk;
      try {
        sdk = (await import('@didit-protocol/sdk-web')).DiditSdk.shared;
      } catch {
        window.location.href = url; // si el SDK no carga, se usa la pagina de Didit
        return;
      }

      sdk.onComplete = (resultado) => {
        setEnviando(false);
        if (resultado.type === 'completed') {
          esperarResultado(); // el resultado bueno llega al servidor; aqui solo se consulta
        } else if (resultado.type === 'failed') {
          setError(
            resultado.error?.type === 'cameraAccessDenied'
              ? 'Necesitamos permiso para usar tu camara. Activalo en tu navegador e intenta de nuevo.'
              : resultado.error?.type === 'sessionExpired'
                ? 'La verificacion vencio. Empieza una nueva.'
                : 'No se pudo completar la verificacion. Intenta de nuevo.',
          );
        }
        // "cancelled": cerro la ventana; puede volver a intentarlo
      };
      sdk.startVerification({ url, configuration: { showExitConfirmation: true, closeModalOnComplete: true } });
      setEnviando(false);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar la verificacion');
      setEnviando(false);
    }
  };

  if (!info && !error) {
    return <div className="esqueleto" style={{ height: 320 }} aria-label="Cargando tu verificacion" />;
  }

  if (info && !info.requerida) {
    return (
      <div className="tarjeta pila">
        <div className="alerta alerta-info" role="status">
          <IcoInfo /> <span>Por ahora la tienda no pide verificar tu identidad.</span>
        </div>
        <a className="btn btn-primario" href={destino}>Continuar</a>
      </div>
    );
  }

  if (info?.verificada) {
    return (
      <div className="tarjeta pila">
        <div className="alerta alerta-ok" role="status">
          <IcoCheck /> <span>Tu identidad esta verificada. Ya puedes comprar.</span>
        </div>
        <a className="btn btn-primario" href={destino}>Continuar</a>
      </div>
    );
  }

  if (info?.estado === 'MENOR') {
    return (
      <div className="tarjeta pila">
        <div className="alerta alerta-error" role="alert">
          <IcoAlerta /> <span>Tu INE indica que eres menor de 18 años. En Elixir solo pueden comprar mayores de edad.</span>
        </div>
        <a className="btn btn-fantasma" href="/tienda">Volver a la tienda</a>
      </div>
    );
  }

  if (revisando || (info?.estado === 'EN_REVISION')) {
    return (
      <div className="tarjeta pila" aria-live="polite">
        <div className="alerta alerta-info" role="status">
          <IcoReloj />
          <span>
            {revisando
              ? 'Estamos recibiendo el resultado de tu verificacion...'
              : 'Tu verificacion esta en revision manual. Suele tardar poco; vuelve a esta pagina en un rato.'}
          </span>
        </div>
        {!revisando && (
          <button type="button" className="btn btn-fantasma" onClick={esperarResultado}>
            Revisar otra vez
          </button>
        )}
      </div>
    );
  }

  const previo = RESULTADOS[info?.estado];

  return (
    <form onSubmit={empezar} className="tarjeta pila-lg">
      {previo && (
        <div className={`alerta alerta-${previo.tono}`} role="status">
          <IcoAlerta /> <span>{previo.texto}</span>
        </div>
      )}

      <div className="pila-sm">
        <h2>Antes de tu primera compra</h2>
        <p className="texto-2">
          Por ley solo vendemos alcohol a mayores de edad. Para confirmarlo te pedimos una foto de tu INE y una selfie.
          Se hace una sola vez y tarda unos 2 minutos.
        </p>
      </div>

      <div className="pila-sm">
        <h3>Ten a la mano</h3>
        <ul className="lista-check">
          {['Tu INE vigente (por los dos lados)', 'Un celular o computadora con camara', 'Buena luz, sin lentes oscuros ni gorra'].map((t) => (
            <li key={t}><IcoCheck tam={16} /> {t}</li>
          ))}
        </ul>
      </div>

      <p className="texto-3">
        La verificacion la hace Didit, un servicio especializado. Elixir solo guarda si fue aprobada y tu fecha de
        nacimiento; no guardamos las fotos de tu INE ni tu selfie.
      </p>

      <label className="casilla">
        <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} required />
        <span>Acepto que Didit procese mi INE y mi selfie (datos biometricos) para verificar mi identidad y mi edad.</span>
      </label>

      {error && (
        <div className="alerta alerta-error" role="alert">
          <IcoAlerta /> <span>{error}</span>
        </div>
      )}

      <div className="acciones">
        <button type="submit" className="btn btn-primario btn-lg" disabled={!acepto || enviando} aria-busy={enviando}>
          {enviando ? 'Abriendo...' : 'Verificar con mi INE'}
        </button>
        <a className="btn btn-fantasma" href="/tienda">Ahora no</a>
      </div>
    </form>
  );
}
