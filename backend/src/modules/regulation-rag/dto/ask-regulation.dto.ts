import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { RegulationDomain, RegulationRegion } from '../regulation-rag.types';

/**
 * 法規問答輸入。
 *
 * 沿用 P0 資安修復建立的慣例：所有 @Body() 一律走具體 DTO + class-validator，
 * 不使用行內型別（行內型別＝驗證空轉，見 security-invariants.spec.ts）。
 */
export class AskRegulationDto {
    @IsString()
    @MinLength(2, { message: '問題至少需 2 個字' })
    @MaxLength(500, { message: '問題長度上限 500 字' })
    question!: string;

    /** 必填 —— domain 隔離的 API 層防線，不給預設值以免誤跨領域檢索 */
    @IsEnum(RegulationDomain, { message: 'domain 必須為 tw-disaster-regulation 或 tw-wartime-mobilization' })
    domain!: RegulationDomain;

    /** 使用者所在縣市。帶了回「該縣市＋中央」，不帶只回中央法規。 */
    @IsOptional()
    @IsEnum(RegulationRegion)
    region?: RegulationRegion;
}
