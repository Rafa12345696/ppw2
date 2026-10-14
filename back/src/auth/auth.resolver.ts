import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service.js';
import { AuthPayload } from './dto/auth-payload.model.js';
import { LoginInput } from './dto/login.input.js';
import { RegistrarInput } from './dto/registrar.input.js';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthPayload)
  registrar(@Args('data') data: RegistrarInput) {
    return this.authService.registrar(data);
  }

  @Mutation(() => AuthPayload)
  login(@Args('data') data: LoginInput) {
    return this.authService.login(data);
  }

  @Mutation(() => Boolean)
  solicitarRecuperacion(@Args('email') email: string) {
    return this.authService.solicitarRecuperacion(email);
  }

  @Mutation(() => Boolean)
  restablecerPassword(
    @Args('token') token: string,
    @Args('password') password: string,
  ) {
    return this.authService.restablecerPassword(token, password);
  }
}