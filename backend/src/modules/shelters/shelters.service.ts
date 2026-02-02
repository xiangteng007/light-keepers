import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
    Shelter,
    ShelterStatus,
    ShelterEvacuee,
    EvacueeStatus,
    ShelterHealthScreening,
    ShelterDailyReport,
} from './entities/shelter.entity';
import {
    CreateShelterDto,
    ActivateShelterDto,
    CheckInEvacueeDto,
    HealthScreeningDto,
    AssignBedDto,
    CreateDailyReportDto,
} from './dto/shelter.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class SheltersService {
    constructor(
        @InjectRepository(Shelter)
        private shelterRepo: Repository<Shelter>,
        @InjectRepository(ShelterEvacuee)
        private evacueeRepo: Repository<ShelterEvacuee>,
        @InjectRepository(ShelterHealthScreening)
        private screeningRepo: Repository<ShelterHealthScreening>,
        @InjectRepository(ShelterDailyReport)
        private reportRepo: Repository<ShelterDailyReport>,
    ) {}

    // ==================== Shelter CRUD ====================

    async create(dto: CreateShelterDto): Promise<Shelter> {
        const shelter = new Shelter();
        Object.assign(shelter, {
            ...dto,
            facilities: dto.facilities ? JSON.stringify(dto.facilities) : undefined,
        });
        return this.shelterRepo.save(shelter);
    }

    async findAll(): Promise<Shelter[]> {
        return this.shelterRepo.find({
            order: { name: 'ASC' },
        });
    }

    async findById(id: string): Promise<Shelter> {
        const shelter = await this.shelterRepo.findOne({ where: { id } });
        if (!shelter) {
            throw new NotFoundException(`Shelter ${id} not found`);
        }
        return shelter;
    }

    async findByStatus(status: ShelterStatus): Promise<Shelter[]> {
        return this.shelterRepo.find({
            where: { status },
            order: { currentOccupancy: 'DESC' },
        });
    }

    // ==================== Shelter Operations ====================

    async activate(id: string, dto: ActivateShelterDto, userId: string): Promise<Shelter> {
        const shelter = await this.findById(id);

        if (shelter.status === ShelterStatus.OPEN) {
            throw new ConflictException('Shelter is already active');
        }

        shelter.status = ShelterStatus.OPEN;
        shelter.activatedBy = userId;
        shelter.activatedAt = new Date();
        if (dto.missionSessionId) {
            shelter.missionSessionId = dto.missionSessionId;
        }

        return this.shelterRepo.save(shelter);
    }

    async deactivate(id: string): Promise<Shelter> {
        const shelter = await this.findById(id);

        if (shelter.currentOccupancy > 0) {
            throw new BadRequestException('Cannot deactivate shelter with evacuees. Check out all evacuees first.');
        }

        shelter.status = ShelterStatus.CLOSED;
        return this.shelterRepo.save(shelter);
    }

    // ==================== Evacuee Operations ====================

    async checkIn(shelterId: string, dto: CheckInEvacueeDto, userId: string): Promise<ShelterEvacuee> {
        const shelter = await this.findById(shelterId);

        if (shelter.status !== ShelterStatus.OPEN && shelter.status !== ShelterStatus.FULL) {
            throw new BadRequestException('Shelter is not open for check-in');
        }

        if (shelter.currentOccupancy >= shelter.capacity) {
            shelter.status = ShelterStatus.FULL;
            await this.shelterRepo.save(shelter);
            throw new BadRequestException('Shelter is at full capacity');
        }

        // Generate unique query code
        const queryCode = `QC-${randomBytes(3).toString('hex').toUpperCase()}`;

        const evacuee = new ShelterEvacuee();
        Object.assign(evacuee, {
            shelterId,
            name: dto.name,
            idNumber: dto.idNumber ? this.maskIdNumber(dto.idNumber) : undefined,
            age: dto.age,
            gender: dto.gender,
            phone: dto.phone,
            emergencyContact: dto.emergencyContact,
            emergencyPhone: dto.emergencyPhone,
            specialNeeds: dto.specialNeeds || [],
            queryCode,
            checkedInBy: userId,
            status: EvacueeStatus.CHECKED_IN,
        });

        const saved = await this.evacueeRepo.save(evacuee);

        // Update occupancy
        shelter.currentOccupancy += 1;
        if (shelter.currentOccupancy >= shelter.capacity) {
            shelter.status = ShelterStatus.FULL;
        }
        await this.shelterRepo.save(shelter);

        return saved;
    }

    async checkOut(shelterId: string, evacueeId: string, userId: string): Promise<ShelterEvacuee> {
        const evacuee = await this.evacueeRepo.findOne({
            where: { id: evacueeId, shelterId },
        });

        if (!evacuee) {
            throw new NotFoundException(`Evacuee ${evacueeId} not found in shelter ${shelterId}`);
        }

        if (evacuee.status !== EvacueeStatus.CHECKED_IN) {
            throw new BadRequestException('Evacuee is not currently checked in');
        }

        evacuee.status = EvacueeStatus.CHECKED_OUT;
        evacuee.checkedOutBy = userId;
        evacuee.checkedOutAt = new Date();

        const saved = await this.evacueeRepo.save(evacuee);

        // Update occupancy
        const shelter = await this.findById(shelterId);
        shelter.currentOccupancy = Math.max(0, shelter.currentOccupancy - 1);
        if (shelter.status === ShelterStatus.FULL && shelter.currentOccupancy < shelter.capacity) {
            shelter.status = ShelterStatus.OPEN;
        }
        await this.shelterRepo.save(shelter);

        return saved;
    }

    async getEvacuees(shelterId: string): Promise<ShelterEvacuee[]> {
        return this.evacueeRepo.find({
            where: { shelterId, status: EvacueeStatus.CHECKED_IN },
            order: { checkedInAt: 'DESC' },
        });
    }

    async queryByCode(queryCode: string): Promise<{ found: boolean; shelter?: Shelter; evacuee?: ShelterEvacuee }> {
        const evacuee = await this.evacueeRepo.findOne({
            where: { queryCode },
            relations: ['shelter'],
        });

        if (!evacuee) {
            return { found: false };
        }

        return {
            found: true,
            shelter: evacuee.shelter,
            evacuee,
        };
    }

    // ==================== Health Screening ====================

    async createHealthScreening(
        shelterId: string,
        evacueeId: string,
        dto: HealthScreeningDto,
        userId: string,
    ): Promise<ShelterHealthScreening> {
        const evacuee = await this.evacueeRepo.findOne({
            where: { id: evacueeId, shelterId },
        });

        if (!evacuee) {
            throw new NotFoundException(`Evacuee ${evacueeId} not found in shelter ${shelterId}`);
        }

        const screening = new ShelterHealthScreening();
        Object.assign(screening, {
            evacueeId,
            shelterId,
            ...dto,
            screenedBy: userId,
        });

        return this.screeningRepo.save(screening);
    }

    async getHealthScreenings(shelterId: string, evacueeId?: string): Promise<ShelterHealthScreening[]> {
        const where: any = { shelterId };
        if (evacueeId) {
            where.evacueeId = evacueeId;
        }

        return this.screeningRepo.find({
            where,
            order: { screenedAt: 'DESC' },
        });
    }

    // ==================== Bed Assignment ====================

    async assignBed(shelterId: string, evacueeId: string, dto: AssignBedDto): Promise<ShelterEvacuee> {
        const evacuee = await this.evacueeRepo.findOne({
            where: { id: evacueeId, shelterId },
        });

        if (!evacuee) {
            throw new NotFoundException(`Evacuee ${evacueeId} not found in shelter ${shelterId}`);
        }

        evacuee.bedAssignment = dto.bedAssignment;
        return this.evacueeRepo.save(evacuee);
    }

    // ==================== Daily Reports ====================

    async createDailyReport(
        shelterId: string,
        dto: CreateDailyReportDto,
        userId: string,
    ): Promise<ShelterDailyReport> {
        const shelter = await this.findById(shelterId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if report already exists for today
        const existing = await this.reportRepo.findOne({
            where: {
                shelterId,
                reportDate: today,
            },
        });

        if (existing) {
            throw new ConflictException('Daily report already exists for today');
        }

        // Calculate stats
        const startOfDay = new Date(today);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const [newArrivals, departures, medicalCases] = await Promise.all([
            this.evacueeRepo.count({
                where: {
                    shelterId,
                    checkedInAt: Between(startOfDay, endOfDay),
                },
            }),
            this.evacueeRepo.count({
                where: {
                    shelterId,
                    checkedOutAt: Between(startOfDay, endOfDay),
                },
            }),
            this.screeningRepo.count({
                where: {
                    shelterId,
                    requiresImmediateAttention: true,
                    screenedAt: Between(startOfDay, endOfDay),
                },
            }),
        ]);

        const report = new ShelterDailyReport();
        Object.assign(report, {
            shelterId,
            reportDate: today,
            totalEvacuees: shelter.currentOccupancy,
            newArrivals,
            departures,
            medicalCases,
            supplyStatus: dto.supplyStatus,
            issues: dto.issues,
            needs: dto.needs,
            reportedBy: userId,
        });

        return this.reportRepo.save(report);
    }

    async getDailyReports(shelterId: string, limit = 30): Promise<ShelterDailyReport[]> {
        return this.reportRepo.find({
            where: { shelterId },
            order: { reportDate: 'DESC' },
            take: limit,
        });
    }

    // ==================== Helper Methods ====================

    private maskIdNumber(idNumber: string): string {
        if (idNumber.length < 4) return idNumber;
        return idNumber.substring(0, 1) + '*'.repeat(idNumber.length - 4) + idNumber.substring(idNumber.length - 3);
    }
}
