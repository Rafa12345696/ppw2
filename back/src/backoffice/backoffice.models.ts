import { ObjectType, InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import { Producto } from '../productos/producto.model.js';
import { Pedido } from '../pedidos/pedido.model.js';
import { PagoRegistro } from '../pagos/pago.model.js';
import { Usuario, Rol } from '../usuarios/usuarios.model.js';
import { Paginado } from './paginacion.js';

@InputType()
export class FiltroProductos {
  @Field(() => String, { nullable: true })
  buscar?: string | null;

  @Field(() => ID, { nullable: true })
  categoriaId?: string | null;

  // BAJO (1 a 5 piezas) o AGOTADO
  @Field(() => String, { nullable: true })
  stock?: string | null;
}

@InputType()
export class FiltroPedidos {
  @Field(() => String, { nullable: true })
  buscar?: string | null;

  @Field(() => String, { nullable: true })
  estado?: string | null;

  @Field(() => String, { nullable: true })
  envio?: string | null;

  @Field(() => String, { nullable: true })
  metodoPago?: string | null;

  @Field(() => String, { nullable: true })
  desde?: string | null;

  @Field(() => String, { nullable: true })
  hasta?: string | null;
}

@InputType()
export class FiltroFacturas {
  @Field(() => String, { nullable: true })
  buscar?: string | null;

  @Field(() => String, { nullable: true })
  metodoPago?: string | null;

  @Field(() => String, { nullable: true })
  desde?: string | null;

  @Field(() => String, { nullable: true })
  hasta?: string | null;
}

@InputType()
export class FiltroPagos {
  @Field(() => String, { nullable: true })
  buscar?: string | null;

  @Field(() => String, { nullable: true })
  proveedor?: string | null;

  @Field(() => String, { nullable: true })
  estado?: string | null;

  @Field(() => String, { nullable: true })
  desde?: string | null;

  @Field(() => String, { nullable: true })
  hasta?: string | null;
}

@InputType()
export class FiltroUsuarios {
  @Field(() => String, { nullable: true })
  buscar?: string | null;

  @Field(() => Rol, { nullable: true })
  rol?: Rol | null;

  // ACTIVO o DESACTIVADO
  @Field(() => String, { nullable: true })
  estado?: string | null;
}

@InputType()
export class ActualizarUsuarioInput {
  @Field(() => String, { nullable: true })
  nombre?: string | null;

  @Field(() => Rol, { nullable: true })
  rol?: Rol | null;
}

@ObjectType()
export class CategoriaAdmin {
  @Field(() => ID)
  id: string;

  @Field()
  nombre: string;

  @Field(() => Int)
  totalProductos: number;
}

@ObjectType()
export class ProductosPagina extends Paginado(Producto) {}

@ObjectType()
export class PedidosPagina extends Paginado(Pedido) {}

@ObjectType()
export class PagosPagina extends Paginado(PagoRegistro) {}

@ObjectType()
export class UsuariosPagina extends Paginado(Usuario) {}