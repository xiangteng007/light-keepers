import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() Decorator
 * 標記端點為公開存取（Level 0）
 * 
 * 使用此裝飾器的端點將允許匿名訪客存取，
 * 搭配 OptionalJwtGuard 使用可同時支援匿名和登入用戶。
 * 
 * @example
 * @Public()
 * @Get('dashboard')
 * getDashboard() { }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
