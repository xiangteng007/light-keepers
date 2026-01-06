/**
 * 演練模式守衛 (Drill Mode Guard)
 * 攔截寫入操作，將資料重導向或標記為演練資料
 */

import { Injectable, CanActivate, ExecutionContext, CallHandler, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DrillSimulationService } from '../drill.service';

/**
 * Guard: 檢查是否在演練模式
 */
@Injectable()
export class DrillModeGuard implements CanActivate {
    constructor(private drillService: DrillSimulationService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();

        // 將演練狀態附加到請求物件
        request.isDrillMode = this.drillService.isDrillMode();
        request.drillState = this.drillService.getGlobalState();

        return true;
    }
}

/**
 * Interceptor: 在演練模式下修改寫入行為
 */
@Injectable()
export class DrillModeInterceptor implements NestInterceptor {
    constructor(private drillService: DrillSimulationService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const isDrillMode = this.drillService.isDrillMode();

        if (isDrillMode) {
            // 在寫入操作中添加演練標記
            if (request.body && typeof request.body === 'object') {
                request.body.isDrill = true;
                request.body.drillScenarioId = this.drillService.getGlobalState().activeScenarioId;
            }
        }

        return next.handle().pipe(
            map(data => {
                if (isDrillMode && data && typeof data === 'object') {
                    return {
                        ...data,
                        _drillMode: true,
                        _drillWarning: '⚠️ 此為演練資料，非真實紀錄',
                    };
                }
                return data;
            }),
        );
    }
}

/**
 * 演練模式裝飾器 - 標記需要演練隔離的方法
 */
export function DrillIsolated() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const drillService = (this as any).drillService;

            if (drillService && drillService.isDrillMode()) {
                // 在演練模式下，可以選擇：
                // 1. 寫入臨時表
                // 2. 添加 isDrill 標記
                // 3. 寫入 Redis
                console.log(`[DRILL] ${propertyKey} called in drill mode`);

                // 修改參數以添加演練標記
                if (args[0] && typeof args[0] === 'object') {
                    args[0].isDrill = true;
                }
            }

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
