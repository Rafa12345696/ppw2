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

@ObjectType()
export class ConfigPagos {
  @Field(() => String, { nullable: true })
  mpPublicKey?: string | null;

  @Field(() => String, { nullable: true })
  paypalClientId?: string | null;

  @Field()
  paypalCurrency: string;
}

@ObjectType()
export class ResultadoPagoMP {
  @Field()
  estado: string;

  @Field(() => String, { nullable: true })
  detalle?: string | null;

  @Field(() => String, { nullable: true })
  urlComprobante?: string | null;

  @Field()
  pedidoEstado: string;
}