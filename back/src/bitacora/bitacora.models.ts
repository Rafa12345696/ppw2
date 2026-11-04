import { ObjectType, InputType, Field, ID } from '@nestjs/graphql';
import { Paginado } from '../backoffice/paginacion.js';

// Un renglon de la tabla bitacora_admin (PostgreSQL)
@ObjectType()
export class RegistroBitacora {
  @Field(() => ID)
  id: string;

  @Field()
  fecha: Date;

  @Field()
  adminEmail: string;

  // Nombre de la mutation que ejecuto el admin, por ejemplo actualizarProducto
  @Field()
  accion: string;

  // PRODUCTO, CATEGORIA, USUARIO, PEDIDO, IMAGEN u OTRO
  @Field()
  entidad: string;

  @Field(() => String, { nullable: true })
  entidadId?: string | null;

  // Argumentos de la accion en JSON, sin contraseñas ni tokens
  @Field(() => String, { nullable: true })
  detalle?: string | null;
}

@ObjectType()
export class BitacoraPagina extends Paginado(RegistroBitacora) {}

@InputType()
export class FiltroBitacora {
  @Field(() => String, { nullable: true })
  buscar?: string | null;

  @Field(() => String, { nullable: true })
  entidad?: string | null;

  @Field(() => String, { nullable: true })
  desde?: string | null;

  @Field(() => String, { nullable: true })
  hasta?: string | null;
}
