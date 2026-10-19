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

  @Field(() => Date)
  fecha: Date;

  @Field()
  estado: string;

  @Field(() => String, { nullable: true })
  envio?: string | null;

  @Field(() => Date, { nullable: true })
  envioActualizadoEn?: Date | null;

  @Field(() => Float)
  total: number;

  @Field(() => String, { nullable: true })
  metodoPago?: string | null;

  @Field(() => Date, { nullable: true })
  expiraEn?: Date | null;

  @Field(() => Date, { nullable: true })
  pagadoEn?: Date | null;

  @Field(() => ID)
  usuarioId: string;

  @Field(() => Usuario, { nullable: true })
  usuario?: Usuario;

  @Field(() => [ItemPedidoType])
  detalles: ItemPedidoType[];
}