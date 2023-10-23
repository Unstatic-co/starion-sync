import { ConfigName } from '@lib/core/config';
import { registerAs } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

export enum BrokerType {
  KAFKA = 'kafka',
  REDIS = 'redis',
}

export const TRANSPORT_MAP = {
  [BrokerType.KAFKA]: Transport.KAFKA,
  [BrokerType.REDIS]: Transport.REDIS,
};

export interface BrokerConfig {
  type: BrokerType;
  options: object;
}

const brokerConfig = (() => {
  const {
    BROKER_TYPE,
    BROKER_URIS,
    KAFKA_CLIENT_ID,
    KAFKA_CONSUMER_GROUP_ID,
    KAFKA_SSL_ENABLED,
    KAFKA_BROKER_API_KEY,
    KAFKA_BROKER_SECRET,
    KAFKA_PARTITION_CONSUMED_CONCURRENTLY,
  } = process.env;
  let options;

  switch (BROKER_TYPE) {
    case BrokerType.KAFKA:
      options = {
        client: {
          clientId: KAFKA_CLIENT_ID,
          brokers: BROKER_URIS.split(','),
          ssl: KAFKA_SSL_ENABLED === 'true',
          // sasl: {
          // mechanism: 'plain', // plain or scram-sha-256 or scram-sha-512
          // username: KAFKA_BROKER_API_KEY,
          // password: KAFKA_BROKER_SECRET,
          // },
        },
        consumer: {
          groupId: KAFKA_CONSUMER_GROUP_ID,
          allowAutoTopicCreation: true,
        },
        producer: {
          allowAutoTopicCreation: true,
          idempotent: true,
        },
        run: {
          partitionsConsumedConcurrently:
            KAFKA_PARTITION_CONSUMED_CONCURRENTLY || 10,
        },
      } as KafkaBrokerConfig;
      break;
    default:
      options = {
        client: {
          clientId: KAFKA_CLIENT_ID,
          brokers: BROKER_URIS.split(','),
          ssl: KAFKA_SSL_ENABLED === 'true',
          // sasl: {
          // mechanism: 'plain', // plain or scram-sha-256 or scram-sha-512
          // username: KAFKA_BROKER_API_KEY,
          // password: KAFKA_BROKER_SECRET,
          // },
        },
        consumer: {
          groupId: KAFKA_CONSUMER_GROUP_ID,
          allowAutoTopicCreation: true,
        },
        producer: {
          allowAutoTopicCreation: true,
          idempotent: true,
        },
        run: {
          partitionsConsumedConcurrently:
            KAFKA_PARTITION_CONSUMED_CONCURRENTLY || 10,
        },
      } as KafkaBrokerConfig;
      break;
  }

  return {
    type: BROKER_TYPE || 'development',
    options,
  } as BrokerConfig;
})();

export const brokerConfigRegister = registerAs(ConfigName.BROKER, () => {
  return brokerConfig;
});

export interface KafkaBrokerConfig {
  client: {
    clientId: string;
    brokers: string[];
    ssl: boolean;
    sasl: {
      mechanism: string; // plain or scram-sha-256 or scram-sha-512
      username: string;
      password: string;
    };
  };
  consumer: {
    groupId: string;
    allowAutoTopicCreation: boolean;
  };
  producer: {
    allowAutoTopicCreation: boolean;
    idempotent: boolean;
  };
  run: {
    partitionsConsumedConcurrently: number;
  };
}
