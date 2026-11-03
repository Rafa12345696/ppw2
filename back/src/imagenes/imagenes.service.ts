import { Injectable, BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

const CARPETA = 'elixir/productos';
const FORMATOS = 'jpg,jpeg,png,webp';

@Injectable()
export class ImagenesService {
  firmarSubida() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException('La subida de imagenes no esta configurada en el servidor');
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // Solo se firman parametros que decide el servidor: el cliente no puede cambiarlos
    const params: Record<string, string | number> = {
      allowed_formats: FORMATOS,
      folder: CARPETA,
      timestamp,
    };
    const aFirmar = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    const signature = createHash('sha1')
      .update(aFirmar + apiSecret)
      .digest('hex');

    return {
      cloudName,
      apiKey,
      timestamp,
      folder: CARPETA,
      allowedFormats: FORMATOS,
      signature,
      urlSubida: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    };
  }
}