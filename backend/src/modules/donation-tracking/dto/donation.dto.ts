import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateDonationDto {
    @ApiPropertyOptional({ description: '捐款者ID' })
    @IsString()
    @IsOptional()
    donorId?: string;

    @ApiPropertyOptional({ description: '捐款者姓名' })
    @IsString()
    @IsOptional()
    donorName?: string;

    @ApiProperty({ description: '金額', example: 10000 })
    @IsNumber()
    amount: number;

    @ApiProperty({ description: '幣別', example: 'TWD' })
    @IsString()
    currency: string;

    @ApiPropertyOptional({ description: '指定用途' })
    @IsString()
    @IsOptional()
    purpose?: string;

    @ApiPropertyOptional({ description: '匿名捐款', default: false })
    @IsBoolean()
    @IsOptional()
    anonymous?: boolean;

    @ApiProperty({ description: '付款方式', example: 'credit_card' })
    @IsString()
    paymentMethod: string;
}

export class AllocateFundsDto {
    @ApiProperty({ description: '用途', example: '物資採購' })
    @IsString()
    purpose: string;

    @ApiProperty({ description: '金額', example: 5000 })
    @IsNumber()
    amount: number;

    @ApiPropertyOptional({ description: '說明' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: '關聯事件ID' })
    @IsString()
    @IsOptional()
    incidentId?: string;
}
