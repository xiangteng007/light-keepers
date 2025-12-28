import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donor } from './donor.entity';
import { Donation } from './donation.entity';
import { Receipt } from './receipt.entity';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { ReceiptPdfService } from './receipt-pdf.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Donor, Donation, Receipt]),
    ],
    controllers: [DonationsController],
    providers: [DonationsService, ReceiptPdfService],
    exports: [DonationsService, ReceiptPdfService],
})
export class DonationsModule { }

