import { Module } from '@nestjs/common';
import { DroneSwarmService } from './drone-swarm.service';
import { DroneSwarmController } from './drone-swarm.controller';

@Module({
    providers: [DroneSwarmService],
    controllers: [DroneSwarmController],
    exports: [DroneSwarmService],
})
export class DroneSwarmModule { }
