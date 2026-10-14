import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class PuntoVenta {
  @Field()
  fecha: string;

  @Field(() => Float)
  total: number;

  @Field(() => Int)
  pedidos: number;
}

@ObjectType()
export class ProductoTop {
  @Field()
  nombre: string;

  @Field(() => Int)
  unidades: number;

  @Field(() => Float)
  ingresos: number;
}

@ObjectType()
export class VentaMetodo {
  @Field()
  metodo: string;

  @Field(() => Float)
  total: number;

  @Field(() => Int)
  pedidos: number;
}

@ObjectType()
export class EstadoConteo {
  @Field()
  estado: string;

  @Field(() => Int)
  cantidad: number;
}

@ObjectType()
export class ProductoStockBajo {
  @Field(() => ID)
  id: string;

  @Field()
  nombre: string;

  @Field(() => Int)
  stock: number;
}

@ObjectType()
export class Estadisticas {
  @Field(() => Float)
  ingresosTotales: number;

  @Field(() => Int)
  pedidosPagados: number;

  @Field(() => Float)
  ticketPromedio: number;

  @Field(() => Int)
  pedidosPendientes: number;

  @Field(() => [PuntoVenta])
  ventasPorDia: PuntoVenta[];

  @Field(() => [ProductoTop])
  topProductos: ProductoTop[];

  @Field(() => [VentaMetodo])
  ventasPorMetodo: VentaMetodo[];

  @Field(() => [EstadoConteo])
  pedidosPorEstado: EstadoConteo[];

  @Field(() => [ProductoStockBajo])
  stockBajo: ProductoStockBajo[];
}