import { ContextIdFactory, HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionFilter } from './common/exception/exception.filter';
import { ValidationPipe } from './common/validation/validation.pipe';
import { LoggingInterceptor } from './common/interceptor/logging.interceptor';
import { ConfigService } from '@nestjs/config';
import { AppConfig, ConfigName } from '@lib/core/config';
import { BrokerConfig, TRANSPORT_MAP } from '@lib/core/config/broker.config';
import { Logger } from '@nestjs/common';
import { AggregateByDataProvidertTypeContextIdStrategy } from '@lib/microservice';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ApiKeyGuard } from './common/guard/apiKey.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.get(ConfigName.APP) as AppConfig;
  const { environment, port } = appConfig;

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.enableCors();
  app.useGlobalGuards(new ApiKeyGuard(configService));
  app.useGlobalFilters(new AllExceptionFilter(httpAdapter));
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Microservice Transports
  const brokerConfig = configService.get(ConfigName.BROKER) as BrokerConfig;
  app.connectMicroservice({
    transport: TRANSPORT_MAP[brokerConfig.type],
    options: brokerConfig.options,
  });

  if (environment === 'production' || environment === 'stagging') {
    await app.startAllMicroservices();
  } else {
    app.startAllMicroservices();
  }
  await app.listen(port, () => {
    Logger.log(`Server is listening at http://localhost:${port}`);
    Logger.log(`Evironment: ${environment}`);
  });

  ContextIdFactory.apply(new AggregateByDataProvidertTypeContextIdStrategy());
}
bootstrap();
