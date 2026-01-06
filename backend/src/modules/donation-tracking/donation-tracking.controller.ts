import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DonationTrackingService } from './donation-tracking.service';
import { CreateDonationDto, AllocateFundsDto } from './dto/donation.dto';

@ApiTags('Donation 捐款追蹤')
@Controller('api/donations')
export class DonationTrackingController {
    constructor(private readonly donationService: DonationTrackingService) { }

    @Post()
    @ApiOperation({ summary: '記錄捐款', description: '記錄新的捐款' })
    recordDonation(@Body() dto: CreateDonationDto): any {
        return this.donationService.recordDonation(dto);
    }

    @Post(':id/allocate')
    @ApiOperation({ summary: '分配捐款', description: '將捐款分配至特定用途' })
    allocateFunds(@Param('id') id: string, @Body() dto: AllocateFundsDto): any {
        return this.donationService.allocateFunds(id, dto);
    }

    @Get(':id/trail')
    @ApiOperation({ summary: '捐款追蹤', description: '取得捐款的完整流向' })
    getDonationTrail(@Param('id') id: string): any {
        return this.donationService.getDonationTrail(id);
    }

    @Get('donor/:id')
    @ApiOperation({ summary: '捐款者報表', description: '取得特定捐款者的報表' })
    getDonorReport(@Param('id') id: string): any {
        return this.donationService.getDonorReport(id);
    }

    @Get('public/stats')
    @ApiOperation({ summary: '公開統計', description: '取得公開的捐款統計' })
    getPublicStats(): any {
        return this.donationService.getPublicStats();
    }
}
