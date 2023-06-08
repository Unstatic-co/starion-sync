import { Module } from '@nestjs/common';
import orchestratorProviders from './orchestrator.provider';

@Module({
  imports: [],
  providers: [...orchestratorProviders],
  exports: [...orchestratorProviders],
})
export class OrchestratorModule {}
