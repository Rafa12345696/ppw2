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
export class ProductoSinMovimiento {
  @Field(() => ID)
  id: string;

  @Field()
  nombre: string;

  @Field(() => Int)
  stock: number;
}

@ObjectType()
export class CategoriaVenta {
  @Field()
  categoria: string;

  @Field(() => Float)
  total: number;

  @Field(() => Int)
  unidades: number;
}

@ObjectType()
export class ClienteTop {
  @Field(() => ID)
  id: string;

  @Field()
  nombre: string;

  @Field()
  email: string;

  @Field(() => Int)
  pedidos: number;

  @Field(() => Float)
  total: number;
}

@ObjectType()
export class PuntoUsuarios {
  @Field()
  fecha: string;

  @Field(() => Int)
  cantidad: number;
}

@ObjectType()
export class DiaSemanaVenta {
  @Field()
  dia: string;

  @Field(() => Float)
  total: number;

  @Field(() => Int)
  pedidos: number;
}

@ObjectType()
export class HoraVenta {
  @Field(() => Int)
  hora: number;

  @Field(() => Int)
  pedidos: number;
}

@ObjectType()
export class ParProductos {
  @Field()
  a: string;

  @Field()
  b: string;

  @Field(() => Int)
  veces: number;
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

  @Field(() => Float)
  ingresosAnterior: number;

  @Field(() => Int)
  pedidosAnterior: number;

  @Field(() => Float)
  tasaConversion: number;

  @Field(() => Int)
  pedidosCreados: number;

  @Field(() => Int)
  usuariosNuevos: number;

  @Field(() => Int)
  clientesRecurrentes: number;

  @Field(() => [PuntoVenta])
  ventasPorDia: PuntoVenta[];

  @Field(() => [DiaSemanaVenta])
  ventasPorDiaSemana: DiaSemanaVenta[];

  @Field(() => [HoraVenta])
  ventasPorHora: HoraVenta[];

  @Field(() => [ProductoTop])
  topProductos: ProductoTop[];

  @Field(() => [CategoriaVenta])
  ventasPorCategoria: CategoriaVenta[];

  @Field(() => [ParProductos])
  productosRelacionados: ParProductos[];

  @Field(() => [ProductoSinMovimiento])
  productosSinMovimiento: ProductoSinMovimiento[];

  @Field(() => [ProductoStockBajo])
  stockBajo: ProductoStockBajo[];

  @Field(() => [ClienteTop])
  topClientes: ClienteTop[];

  @Field(() => [PuntoUsuarios])
  usuariosPorDia: PuntoUsuarios[];

  @Field(() => [VentaMetodo])
  ventasPorMetodo: VentaMetodo[];

  @Field(() => [EstadoConteo])
  pedidosPorEstado: EstadoConteo[];
}