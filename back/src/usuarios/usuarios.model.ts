import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';

export enum Rol {
  CLIENTE = 'CLIENTE',
  ADMIN = 'ADMIN',
}

registerEnumType(Rol, { name: 'Rol' });

@ObjectType()
export class Usuario {
  @Field(() => ID)
  id: string;

  @Field()
  nombre: string;

  @Field()
  email: string;

  @Field(() => Rol)
  rol: Rol;
}