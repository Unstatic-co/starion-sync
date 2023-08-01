import { AppConfig, ConfigName } from '@lib/core/config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const LoggerModule = WinstonModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => {
    const { logLevel, environment } = configService.get<AppConfig>(
      ConfigName.APP,
    );
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize({ all: true }),
          winston.format.prettyPrint(),
          winston.format.printf((info) => {
            return `${info.timestamp} ${info.level.toLocaleUpperCase()}: ${
              info.message
            }`;
          }),
        ),
        handleExceptions: true,
      }),
    ];

    if (environment === 'production') {
      transports.push(
        new winston.transports.File({
          filename: 'logs/combine.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
          handleExceptions: true,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      );
    }

    return {
      level: logLevel,
      transports,
      exitOnError: false,
    };
  },
  inject: [ConfigService],
});
