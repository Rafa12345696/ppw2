import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { JwtService } from '@nestjs/jwt';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductosModule } from './productos/productos.module.js';
import { PedidosModule } from './pedidos/pedidos.module.js';
import { CategoriasModule } from './categorias/categorias.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PagosModule } from './pagos/pagos.module.js';
import { EstadisticasModule } from './estadisticas/estadisticas.module.js';
import { EventosModule } from './eventos/eventos.module.js';
import { HealthController } from './health.controller.js';
import { JWT_SECRET } from './auth/auth.constants.js';

const jwtWs = new JwtService({ secret: JWT_SECRET });

@Module({
  controllers: [HealthController],
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
      subscriptions: {
        'graphql-ws': {
          // El navegador no puede mandar encabezados en un WebSocket: el token viaja en connectionParams
          onConnect: (ctx: any) => {
            const token = ctx?.connectionParams?.authToken;
            if (typeof token !== 'string' || !token) {
              throw new Error('Falta el token de acceso');
            }
            try {
              ctx.extra.wsPayload = jwtWs.verify(token);
            } catch {
              throw new Error('Token invalido o expirado');
            }
          },
        },
      },
      // HTTP trae req; en WebSocket se arma uno con el token ya verificado
      context: (ctx: any) => {
        const req = ctx?.req ?? { headers: {} };
        if (ctx?.extra?.wsPayload) req.wsPayload = ctx.extra.wsPayload;
        return { req };
      },
    }),
    PrismaModule,
    EventosModule,
    ProductosModule,
    PedidosModule,
    CategoriasModule,
    UsuariosModule,
    AuthModule,
    PagosModule,
    EstadisticasModule,
  ],
})
export class AppModule {}