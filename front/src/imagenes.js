const MARCA = '/image/upload/';

export function esCloudinary(url) {
  return typeof url === 'string' && url.startsWith('https://res.cloudinary.com/') && url.includes(MARCA);
}

// Inserta la transformacion justo despues de /image/upload/
// c_limit reduce sin recortar y nunca agranda; f_auto y q_auto eligen formato y calidad
export function urlConAncho(url, ancho) {
  if (!esCloudinary(url)) return url;
  const i = url.indexOf(MARCA) + MARCA.length;
  return `${url.slice(0, i)}f_auto,q_auto,c_limit,w_${ancho}/${url.slice(i)}`;
}

// Props listos para un <img>: src, srcSet y sizes (solo si la imagen es de Cloudinary)
export function propsImagen(url, { anchos = [320, 480, 720, 960], sizes = '100vw' } = {}) {
  if (!esCloudinary(url)) return { src: url };
  return {
    src: urlConAncho(url, anchos[Math.min(1, anchos.length - 1)]),
    srcSet: anchos.map((w) => `${urlConAncho(url, w)} ${w}w`).join(', '),
    sizes,
  };
}