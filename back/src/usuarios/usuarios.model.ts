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

  @Field(() => Boolean, { nullable: true })
  activo?: boolean | null;

  @Field(() => Date, { nullable: true })
  fechaNacimiento?: Date | null;

  @Field(() => String, { nullable: true })
  telefono?: string | null;

  // true cuando Didit aprobo su INE y selfie
  @Field(() => Boolean, { nullable: true })
  identidadVerificada?: boolean | null;

  // PENDIENTE, EN_REVISION, APROBADA, RECHAZADA, MENOR o ABANDONADA
  @Field(() => String, { nullable: true })
  verificacionEstado?: string | null;

  @Field(() => Date, { nullable: true })
  createdAt?: Date | null;
}