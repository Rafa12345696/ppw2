import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductosModule } from './productos/productos.module.js';
import { PedidosModule } from './pedidos/pedidos.module.js';
import { CategoriasModule } from './categorias/categorias.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PagosModule } from './pagos/pagos.module.js';
import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
      context: ({ req }: { req: any }) => ({ req }),
    }),
    PrismaModule,
    ProductosModule,
    PedidosModule,
    CategoriasModule,
    UsuariosModule,
    AuthModule,
    PagosModule,
  ],
})
export class AppModule {}