import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { VolunteerInsurance, InsuranceType } from './volunteer-insurance.entity';

export interface CreateInsuranceDto {
    volunteerId: string;
    insuranceType: InsuranceType;
    insuranceCompany: string;
    policyNumber?: string;
    coverageType?: string;
    coverageAmount?: number;
    validFrom: Date;
    validTo: Date;
    coversTasks?: string[];
    fileUrl?: string;
    notes?: string;
    createdBy?: string;
}

export interface UpdateInsuranceDto {
    insuranceType?: InsuranceType;
    insuranceCompany?: string;
    policyNumber?: string;
    coverageType?: string;
    coverageAmount?: number;
    validFrom?: Date;
    validTo?: Date;
    coversTasks?: string[];
    fileUrl?: string;
    notes?: string;
    isActive?: boolean;
}

@Injectable()
export class InsuranceService {
    private readonly logger = new Logger(InsuranceService.name);

    constructor(
        @InjectRepository(VolunteerInsurance)
        private insuranceRepository: Repository<VolunteerInsurance>,
    ) { }

    // 取得志工的所有保險
    async findByVolunteer(volunteerId: string): Promise<VolunteerInsurance[]> {
        return this.insuranceRepository.find({
            where: { volunteerId },
            order: { validTo: 'DESC' },
        });
    }

    // 取得志工的有效保險
    async findActiveByVolunteer(volunteerId: string): Promise<VolunteerInsurance[]> {
        const now = new Date();
        return this.insuranceRepository.find({
            where: {
                volunteerId,
                isActive: true,
                validFrom: LessThanOrEqual(now),
                validTo: MoreThanOrEqual(now),
            },
        });
    }

    // 取得單一保險
    async findOne(id: string): Promise<VolunteerInsurance> {
        const insurance = await this.insuranceRepository.findOne({ where: { id } });
        if (!insurance) {
            throw new NotFoundException(`Insurance ${id} not found`);
        }
        return insurance;
    }

    // 建立保險
    async create(dto: CreateInsuranceDto): Promise<VolunteerInsurance> {
        const insurance = this.insuranceRepository.create({
            ...dto,
            isActive: true,
        });
        const saved = await this.insuranceRepository.save(insurance);
        this.logger.log(`Created insurance for volunteer ${dto.volunteerId}`);
        return saved;
    }

    // 更新保險
    async update(id: string, dto: UpdateInsuranceDto): Promise<VolunteerInsurance> {
        const insurance = await this.findOne(id);
        Object.assign(insurance, dto);
        const updated = await this.insuranceRepository.save(insurance);
        this.logger.log(`Updated insurance ${id}`);
        return updated;
    }

    // 停用保險
    async deactivate(id: string): Promise<VolunteerInsurance> {
        return this.update(id, { isActive: false });
    }

    // 檢查志工是否有有效保險（可指定任務類型）
    async checkCoverage(volunteerId: string, taskType?: string): Promise<{
        hasCoverage: boolean;
        insurances: VolunteerInsurance[];
    }> {
        const activeInsurances = await this.findActiveByVolunteer(volunteerId);

        let coveringInsurances = activeInsurances;
        if (taskType) {
            coveringInsurances = activeInsurances.filter(ins =>
                !ins.coversTasks ||
                ins.coversTasks.length === 0 ||
                ins.coversTasks.includes(taskType)
            );
        }

        return {
            hasCoverage: coveringInsurances.length > 0,
            insurances: coveringInsurances,
        };
    }

    // 取得即將到期的保險
    async getExpiring(daysAhead: number = 30): Promise<VolunteerInsurance[]> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        return this.insuranceRepository
            .createQueryBuilder('insurance')
            .where('insurance.isActive = true')
            .andWhere('insurance.validTo >= :now', { now })
            .andWhere('insurance.validTo <= :futureDate', { futureDate })
            .leftJoinAndSelect('insurance.volunteer', 'volunteer')
            .getMany();
    }

    // 取得保險類型選項
    getInsuranceTypes(): { code: InsuranceType; name: string }[] {
        return [
            { code: 'personal', name: '個人保險' },
            { code: 'group', name: '團體保險' },
            { code: 'task_specific', name: '任務專屬保險' },
        ];
    }
}
