import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RegistrarInput {
  @Field()
  nombre: string;

  @Field()
  email: string;

  @Field()
  password: string;
}