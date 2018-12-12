import { Schema, Type } from 'avsc';
import { ProduceRequest } from 'kafka-node';
import { Transform, TransformCallback } from 'stream';
import { constructMessage } from './message';
import { SchemaRegistryResolver } from './SchemaRegistryResolver';
import { SchemaResolver } from './types';

export interface AvroProduceRequest extends ProduceRequest {
  schema: Schema;
  messages: any[];
}

export class AvroSerializer extends Transform {
  private resolver: SchemaResolver;

  constructor(resolver: SchemaResolver | string) {
    super({ objectMode: true });
    this.resolver = typeof resolver === 'string' ? new SchemaRegistryResolver(resolver) : resolver;
  }

  async _transform(request: AvroProduceRequest, encoding: string, callback: TransformCallback) {
    try {
      const type = Type.forSchema(request.schema);
      const schemaId = await this.resolver.toId(request.topic, request.schema);

      callback(undefined, {
        ...request,
        messages: request.messages.map(message => constructMessage({ schemaId, buffer: type.toBuffer(message) })),
      });
    } catch (error) {
      callback(error);
    }
  }
}