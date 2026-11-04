import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import Imagen from './Imagen';

const FIRMAR = `
  mutation {
    firmarSubidaImagen {
      cloudName
      apiKey
      timestamp
      folder
      allowedFormats
      signature
      urlSubida
    }
  }
`;

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 8;

function subir(archivo, firma, onProgreso) {
  return new Promise((resolve, reject) => {
    // Solo viajan los parametros que el servidor firmo
    const datos = new FormData();
    datos.append('file', archivo);
    datos.append('api_key', firma.apiKey);
    datos.append('timestamp', String(firma.timestamp));
    datos.append('signature', firma.signature);
    datos.append('folder', firma.folder);
    datos.append('allowed_formats', firma.allowedFormats);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', firma.urlSubida);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let respuesta = {};
      try {
        respuesta = JSON.parse(xhr.responseText);
      } catch {
        // respuesta que no es JSON
      }
      if (xhr.status >= 200 && xhr.status < 300 && respuesta.secure_url) {
        resolve(respuesta.secure_url);
      } else {
        reject(new Error(respuesta.error?.message || 'Cloudinary rechazo la imagen'));
      }
    };
    xhr.onerror = () => reject(new Error('No se pudo conectar con Cloudinary'));
    xhr.send(datos);
  });
}

export default function SubirImagen({ valor, onCambio }) {
  const token = useStore((state) => state.token);
  const entrada = useRef(null);
  const [local, setLocal] = useState('');
  const [progreso, setProgreso] = useState(null);
  const [error, setError] = useState('');
  const [arrastrando, setArrastrando] = useState(false);

  // Libera la vista previa local al terminar o desmontar
  useEffect(() => () => local && URL.revokeObjectURL(local), [local]);

  const procesar = async (archivo) => {
    setError('');
    if (!archivo) return;
    if (!TIPOS.includes(archivo.type)) {
      setError('Formato no permitido. Usa JPG, PNG o WEBP.');
      return;
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      setError(`La imagen pesa mas de ${MAX_MB} MB. Elige una mas ligera.`);
      return;
    }

    setLocal(URL.createObjectURL(archivo));
    setProgreso(0);
    try {
      const datos = await graphqlRequest(FIRMAR, {}, token);
      const url = await subir(archivo, datos.firmarSubidaImagen, setProgreso);
      onCambio(url);
    } catch (e) {
      setError(e.message || 'No se pudo subir la imagen');
    }
    setProgreso(null);
    setLocal('');
    if (entrada.current) entrada.current.value = '';
  };

  const subiendo = progreso !== null;

  return (
    <div className="pila-sm">
      <div
        className="zona-subida"
        data-arrastrando={arrastrando}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          procesar(e.dataTransfer.files?.[0]);
        }}
      >
        <div className="vista">
          {local ? (
            <img src={local} alt="Vista previa de la imagen que se esta subiendo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : valor ? (
            <Imagen url={valor} alt="Imagen actual del producto" anchos={[200, 400]} sizes="220px" prioridad />
          ) : (
            <Imagen url="" alt="Producto" />
          )}
        </div>

        <input
          ref={entrada}
          id="subir-imagen"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => procesar(e.target.files?.[0])}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <button type="button" className="btn btn-neutro btn-bloque" onClick={() => entrada.current?.click()} disabled={subiendo} aria-busy={subiendo}>
          {subiendo ? `Subiendo ${progreso}%...` : valor ? 'Cambiar imagen' : 'Elegir imagen'}
        </button>
        <p className="texto-3">O arrastra una foto aqui. JPG, PNG o WEBP, maximo {MAX_MB} MB.</p>
        {subiendo && (
          <div className="progreso" role="progressbar" aria-label="Subida de imagen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progreso}>
            <div style={{ width: `${progreso}%` }} />
          </div>
        )}
      </div>

      {error && <div className="alerta alerta-error" role="alert">{error}</div>}

      <details>
        <summary className="texto-3" style={{ cursor: 'pointer' }}>Usar una ruta o URL en lugar de subir un archivo</summary>
        <label htmlFor="imagen-url" className="sr-only">Ruta o URL de la imagen</label>
        <input
          id="imagen-url"
          className="control"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          placeholder="/imagenes/archivo.jpg o https://..."
          style={{ marginTop: 8 }}
        />
      </details>
    </div>
  );
}
