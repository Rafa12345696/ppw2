// Iconos de linea (decorativos: aria-hidden). El texto o aria-label del boton da el significado.
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
};

const icono = (hijos) =>
  function Icono({ tam = 18 }) {
    return (
      <svg {...base} width={tam} height={tam}>
        {hijos}
      </svg>
    );
  };

export const IcoCerrar = icono(<path d="M6 6l12 12M18 6 6 18" />);
export const IcoCheck = icono(<path d="m5 12 4.5 4.5L19 7" />);
export const IcoAlerta = icono(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </>,
);
export const IcoInfo = icono(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.5v.01" />
  </>,
);
export const IcoReloj = icono(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);
export const IcoOjo = icono(
  <>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);
export const IcoOjoTachado = icono(
  <>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>,
);
export const IcoFiltro = icono(<path d="M4 6h16M7 12h10M10 18h4" />);
export const IcoCandado = icono(
  <>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </>,
);
export const IcoCamion = icono(
  <>
    <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </>,
);
export const IcoBolsa = icono(
  <>
    <path d="M5 8h14l-1 12H6z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </>,
);
export const IcoBotella = icono(
  <path d="M10 2h4v5c2 1.2 3 3 3 5v9a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-9c0-2 1-3.8 3-5z" />,
);
export const IcoBasura = icono(
  <>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </>,
);
