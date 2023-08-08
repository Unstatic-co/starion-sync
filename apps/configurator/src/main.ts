import { ContextIdFactory, HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import * as expressBasicAuth from 'express-basic-auth';
import { AllExceptionFilter } from './common/exception/exception.filter';
import { ValidationPipe } from './common/validation/validation.pipe';
import { LoggingInterceptor } from './common/interceptor/logging.interceptor';
import { ConfigService } from '@nestjs/config';
import { AppConfig, ConfigName } from '@lib/core/config';
import { BrokerConfig, TRANSPORT_MAP } from '@lib/core/config/broker.config';
import { Logger } from '@nestjs/common';
import { AggregateByDataProvidertTypeContextIdStrategy } from '@lib/microservice';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.get(ConfigName.APP) as AppConfig;
  const { environment, port, isSwaggerShowed, swaggerUser, swaggerPassword } =
    appConfig;

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionFilter(httpAdapter));
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor());
  if (environment === 'production') {
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  }

  // Microservice Transports
  const brokerConfig = configService.get(ConfigName.BROKER) as BrokerConfig;
  app.connectMicroservice({
    transport: TRANSPORT_MAP[brokerConfig.type],
    options: brokerConfig.options,
  });

  // Swagger
  if (isSwaggerShowed) {
    app.use(
      ['/swagger'],
      expressBasicAuth({
        challenge: true,
        users: {
          [swaggerUser]: swaggerPassword,
        },
      }),
    );
    const config = new DocumentBuilder()
      .setTitle('Starion Sync')
      .setDescription('Starion Sync API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    const customOptions: SwaggerCustomOptions = {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: 'My API Docs',
    };
    SwaggerModule.setup('swagger', app, document, customOptions);
  }

  app.startAllMicroservices();
  await app.listen(port, () => {
    Logger.log(`Server is listening at http://localhost:${port}`);
    Logger.log(`Evironment: ${environment}`);
  });

  ContextIdFactory.apply(new AggregateByDataProvidertTypeContextIdStrategy());
}
bootstrap();
