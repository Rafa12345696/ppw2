import { InputType, Field } from '@nestjs/graphql';
import { Rol } from '../usuarios.model.js';

@InputType()
export class CrearUsuarioInput {
  @Field()
  nombre: string;

  @Field()
  email: string;

  @Field()
  password: string;

  @Field(() => Rol)
  rol: Rol;
}