import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class ActualizacionEstadisticas {
  @Field()
  motivo: string;

  @Field(() => ID, { nullable: true })
  referencia?: string | null;

  @Field(() => Date)
  fecha: Date;
}