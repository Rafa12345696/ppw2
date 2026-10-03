import { ObjectType, Field } from '@nestjs/graphql';
import { Usuario } from '../../usuarios/usuarios.model.js';

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken: string;

  @Field(() => Usuario)
  usuario: Usuario;
}