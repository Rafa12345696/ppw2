import { Module } from '@nestjs/common';
import { ImagenesService } from './imagenes.service.js';
import { ImagenesResolver } from './imagenes.resolver.js';

@Module({
  providers: [ImagenesService, ImagenesResolver],
})
export class ImagenesModule {}