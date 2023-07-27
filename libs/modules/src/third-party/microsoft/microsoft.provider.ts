import { ConfidentialClientApplication } from '@azure/msal-node';
import { ConfigName, MicrosoftConfig } from '@lib/core/config';
import { InjectTokens } from '@lib/modules/inject-tokens';
import { ConfigService } from '@nestjs/config';

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
