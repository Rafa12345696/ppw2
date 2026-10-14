import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class PagoIniciado {
  @Field()
  url: string;

  @Field(() => ID)
  pagoId: string;
}