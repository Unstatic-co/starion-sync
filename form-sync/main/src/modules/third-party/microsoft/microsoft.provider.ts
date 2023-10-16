import { ConfidentialClientApplication } from '@azure/msal-node';
import { ConfigService } from '@nestjs/config';
import { InjectTokens } from 'src/common/inject-tokens';
import { ConfigName, MicrosoftConfig } from 'src/config';

export const MicrosoftAuthClientProvider = {
  provide: InjectTokens.MICROSOFT_AUTH_CLIENT,
  useFactory: async (configService: ConfigService) => {
    const microsoftConfig = configService.get<MicrosoftConfig>(
      `${ConfigName.MICROSOFT}`,
    );
    const { clientId, clientSecret } = microsoftConfig;
    return new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret,
      },
    });
  },
  inject: [ConfigService],
};
