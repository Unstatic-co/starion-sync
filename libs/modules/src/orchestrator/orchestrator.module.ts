import { Module } from '@nestjs/common';
import orchestratorProviders from './orchestrator.provider';
import { OrchestratorService } from './orchestrator.service';

@Module({
  imports: [],
  providers: [...orchestratorProviders, OrchestratorService],
  exports: [...orchestratorProviders, OrchestratorService],
})
export class OrchestratorModule {}
