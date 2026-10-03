import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Usuario } from '../usuarios/usuarios.model.js';

@ObjectType()
export class ItemPedidoType {
  @Field(() => ID)
  productoId: string;

  @Field()
  nombre: string;

  @Field(() => Int)
  cantidad: number;

  @Field(() => Float)
  precioUnit: number;
}

@ObjectType()
export class Pedido {
  @Field(() => ID)
  id: string;

  @Field()
  estado: string;

  @Field(() => Float)
  total: number;

  @Field(() => ID)
  usuarioId: string;

  @Field(() => Usuario, { nullable: true })
  usuario?: Usuario;

  @Field(() => [ItemPedidoType])
  detalles: ItemPedidoType[];
}