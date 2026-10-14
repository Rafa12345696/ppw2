import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthResolver } from './auth.resolver.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { MailModule } from '../mail/mail.module.js';
import { JWT_SECRET } from './auth.constants.js';

@Module({
  imports: [
    UsuariosModule,
    MailModule,
    PassportModule,
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, AuthResolver, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}