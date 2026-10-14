import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType()
export class PagoIniciado {
  @Field()
  url: string;

  @Field(() => ID)
  pagoId: string;
}

@ObjectType()
export class PagoRegistro {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  pedidoId: string;

  @Field()
  proveedor: string;

  @Field()
  estado: string;

  @Field(() => Float)
  monto: number;

  @Field()
  moneda: string;

  @Field(() => String, { nullable: true })
  referencia?: string | null;

  @Field(() => String, { nullable: true })
  pagoIdExterno?: string | null;

  @Field(() => Date)
  creadoEn: Date;

  @Field(() => Date)
  actualizadoEn: Date;
}