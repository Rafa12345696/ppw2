import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RegistrarInput {
  @Field()
  nombre: string;

  @Field()
  email: string;

  @Field()
  password: string;

  // Formato AAAA-MM-DD (el que manda <input type="date">)
  @Field()
  fechaNacimiento: string;

  // Opcional: para recibir avisos del pedido por WhatsApp
  @Field({ nullable: true })
  telefono?: string;
}