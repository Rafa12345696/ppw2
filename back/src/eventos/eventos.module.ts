import { Global, Module } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from './eventos.constants.js';
import { EventosService } from './eventos.service.js';
import { EventosResolver } from './eventos.resolver.js';

@Global()
@Module({
  providers: [{ provide: PUB_SUB, useValue: new PubSub() }, EventosService, EventosResolver],
  exports: [PUB_SUB, EventosService],
})
export class EventosModule {}