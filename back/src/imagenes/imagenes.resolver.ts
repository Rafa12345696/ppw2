import { Resolver, Mutation, ObjectType, Field, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ImagenesService } from './imagenes.service.js';
import { Rol } from '../usuarios/usuarios.model.js';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ObjectType()
export class FirmaSubida {
  @Field()
  cloudName: string;

  @Field()
  apiKey: string;

  @Field(() => Int)
  timestamp: number;

  @Field()
  folder: string;

  @Field()
  allowedFormats: string;

  @Field()
  signature: string;

  @Field()
  urlSubida: string;
}

@Resolver()
export class ImagenesResolver {
  constructor(private readonly imagenesService: ImagenesService) {}

  @Mutation(() => FirmaSubida)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  firmarSubidaImagen() {
    return this.imagenesService.firmarSubida();
  }
}   