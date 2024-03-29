import { registerAs } from '@nestjs/config';
import { ConfigName } from './config.enum';
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
    KAFKA_SASL_ENABLED,
    KAFKA_SASL_MECHANISM,
    KAFKA_SASL_USERNAME,
    KAFKA_SASL_PASSWORD,
  } = process.env;
  let options;

  switch (BROKER_TYPE) {
    case BrokerType.KAFKA:
      options = {
        client: {
          clientId: KAFKA_CLIENT_ID,
          brokers: BROKER_URIS.split(','),
          connectionTimeout: 3000,
          retry: {
            retries: 8,
          },
          ssl: KAFKA_SSL_ENABLED === 'true',
          sasl:
            KAFKA_SASL_ENABLED === 'true'
              ? {
                  mechanism: KAFKA_SASL_MECHANISM || 'SCRAM-SHA-256', // plain or scram-sha-256 or scram-sha-512
                  username: KAFKA_SASL_USERNAME,
                  password: KAFKA_SASL_PASSWORD,
                }
              : undefined,
        },
        consumer: {
          groupId: KAFKA_CONSUMER_GROUP_ID,
          allowAutoTopicCreation: true,
        },
        producer: {
          allowAutoTopicCreation: true,
          idempotent: true,
        },
      } as KafkaBrokerConfig;
      break;
    default:
      options = {
        client: {
          clientId: KAFKA_CLIENT_ID,
          brokers: BROKER_URIS.split(','),
          connectionTimeout: 3000,
          retry: {
            retries: 8,
          },
          ssl: KAFKA_SSL_ENABLED === 'true',
          sasl:
            KAFKA_SASL_ENABLED === 'true'
              ? {
                  mechanism: KAFKA_SASL_MECHANISM, // plain or scram-sha-256 or scram-sha-512
                  username: KAFKA_SASL_USERNAME,
                  password: KAFKA_SASL_PASSWORD,
                }
              : undefined,
        },
        consumer: {
          groupId: KAFKA_CONSUMER_GROUP_ID,
          allowAutoTopicCreation: true,
        },
        producer: {
          allowAutoTopicCreation: true,
          idempotent: true,
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
    ssl?: boolean;
    sasl?: {
      mechanism: string; // plain or scram-sha-256 or scram-sha-512
      username: string;
      password: string;
    };
    connectionTimeout?: number;
    retry?: {
      initialRetryTime?: number;
      retries?: number;
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
}
