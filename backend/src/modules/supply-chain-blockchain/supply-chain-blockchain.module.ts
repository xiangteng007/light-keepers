import { Module } from '@nestjs/common';
import { SupplyChainBlockchainService } from './supply-chain-blockchain.service';
import { SupplyChainBlockchainController } from './supply-chain-blockchain.controller';

@Module({
    providers: [SupplyChainBlockchainService],
    controllers: [SupplyChainBlockchainController],
    exports: [SupplyChainBlockchainService],
})
export class SupplyChainBlockchainModule { }
