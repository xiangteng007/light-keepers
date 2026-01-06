import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    MissionOverlay,
    Location,
    LocationAlias,
    OverlayLock,
    OverlayAuditLog,
    MapPackage,
    Sector,
    RallyPoint,
    PlannedRoute,
} from './entities';
import { OverlaysController } from './overlays.controller';
import { OverlaysService } from './overlays.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { MapPackagesController } from './map-packages.controller';
import { MapPackagesService } from './map-packages.service';
import { MapDispatchController } from './map-dispatch.controller';
import { MapDispatchService } from './map-dispatch.service';
import { OverlayGateway } from './overlay.gateway';
import { AuthModule } from '../auth/auth.module';
import { TasksModule } from '../tasks/tasks.module';
import { MissionSessionsModule } from '../mission-sessions/mission-sessions.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            MissionOverlay,
            Location,
            LocationAlias,
            OverlayLock,
            OverlayAuditLog,
            MapPackage,
            Sector,
            RallyPoint,
            PlannedRoute,
        ]),
        forwardRef(() => AuthModule),
        forwardRef(() => TasksModule),
        forwardRef(() => MissionSessionsModule),
    ],
    controllers: [
        OverlaysController,
        LocationsController,
        MapPackagesController,
        MapDispatchController,
    ],
    providers: [
        OverlaysService,
        LocationsService,
        MapPackagesService,
        MapDispatchService,
        OverlayGateway,
    ],
    exports: [
        OverlaysService,
        LocationsService,
        MapPackagesService,
        MapDispatchService,
        OverlayGateway,
    ],
})
export class OverlaysModule { }

