import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class EstadoIdentidad {
  // false si la tienda no tiene Didit configurado: se compra sin verificar
  @Field()
  requerida: boolean;

  @Field()
  verificada: boolean;

  // PENDIENTE, EN_REVISION, APROBADA, RECHAZADA, MENOR o ABANDONADA (null si nunca empezo)
  @Field(() => String, { nullable: true })
  estado: string | null;
}

@ObjectType()
export class SesionIdentidad {
  // Pagina de Didit donde el cliente toma foto a su INE y su selfie
  @Field()
  url: string;
}
