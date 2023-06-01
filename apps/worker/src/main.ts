import { HttpAdapterHost, NestFactory } from '@nestjs/core';
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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.get(ConfigName.APP) as AppConfig;
  const { environment, port, isSwaggerShowed, swaggerUser, swaggerPassword } =
    appConfig;

  if (environment === 'dev') {
    app.enableCors();
  } else if (environment === 'prod') {
    app.enableCors();
  }

  const { httpAdapter } = app.get(HttpAdapterHost);

  app.useGlobalFilters(new AllExceptionFilter(httpAdapter));
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor());

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

  await app.listen(port);
}
bootstrap();
