import { Module } from '@nestjs/common';
import { IpWhitelistService, IpWhitelistGuard } from './ip-whitelist.service';

@Module({
    providers: [IpWhitelistService, IpWhitelistGuard],
    exports: [IpWhitelistService, IpWhitelistGuard],
})
export class IpWhitelistModule { }
