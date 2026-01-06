import { Module, Global } from '@nestjs/common';
import { I18nApiService } from './i18n-api.service';

@Global()
@Module({
    providers: [I18nApiService],
    exports: [I18nApiService],
})
export class I18nApiModule { }
