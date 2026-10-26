import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Producto } from '../productos/producto.model.js';

@ObjectType()
export class ProductoCambio {
  // CREADO, ACTUALIZADO o ELIMINADO
  @Field()
  accion: string;

  @Field(() => ID)
  productoId: string;

  @Field(() => ID)
  categoriaId: string;

  // Al eliminar ya no hay producto que mostrar
  @Field(() => Producto, { nullable: true })
  producto?: Producto | null;
}