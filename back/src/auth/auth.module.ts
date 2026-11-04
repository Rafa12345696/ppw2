import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthResolver } from './auth.resolver.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { MailModule } from '../mail/mail.module.js';
import { JWT_SECRET } from './auth.constants.js';

// La verificacion del token la hace GqlAuthGuard (sin Passport). Aqui solo se configura la firma del login.
@Module({
  imports: [
    UsuariosModule,
    MailModule,
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, AuthResolver],
  exports: [JwtModule],
})
export class AuthModule {}