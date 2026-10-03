import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Producto } from '../productos/producto.model.js';

@ObjectType()
export class Categoria {
  @Field(() => ID)
  id: string;

  @Field()
  nombre: string;

  @Field(() => [Producto], { nullable: true })
  productos?: Producto[];
}