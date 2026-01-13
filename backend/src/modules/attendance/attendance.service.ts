/**
 * Attendance Service
 * 出勤管理服務 - 資料庫持久化版本
 * 
 * 支援 GPS 和 QR Code 打卡，關聯任務和任務場次
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { AttendanceRecord, GpsLocation, QrLocation, CheckInMethod } from './entities/attendance-record.entity';

// Result Types
export interface CheckInResult {
    success: boolean;
    recordId?: string;
    timestamp?: Date;
    location?: GpsLocation | QrLocation;
    error?: string;
}

export interface CheckOutResult {
    success: boolean;
    recordId?: string;
    checkOutTime?: Date;
    hoursWorked?: number;
    error?: string;
}

export interface DailySummary {
    date: string;
    totalCheckIns: number;
    uniqueVolunteers: number;
    totalHours: number;
    avgHoursPerPerson: number;
    byCheckInMethod: { gps: number; qr: number };
}

export interface MonthlyReport {
    volunteerId: string;
    month: number;
    year: number;
    totalRecords: number;
    daysWorked: number;
    totalHours: number;
    avgHoursPerDay: number;
}

export interface QrCodeInfo {
    code: string;
    locationId: string;
    locationName: string;
    expiresAt: Date;
    qrImageUrl: string;
}

export interface CheckInOptions {
    taskId?: string;
    missionSessionId?: string;
    volunteerName?: string;
    notes?: string;
}

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(
        @InjectRepository(AttendanceRecord)
        private readonly recordRepo: Repository<AttendanceRecord>,
    ) { }

    /**
     * GPS 打卡
     */
    async checkInWithGps(
        volunteerId: string,
        location: GpsLocation,
        options: CheckInOptions = {},
    ): Promise<CheckInResult> {
        const record = await this.createRecord(volunteerId, 'gps', location, options);

        this.logger.log(`GPS check-in: volunteer ${volunteerId}, task ${options.taskId || 'N/A'}`);

        return {
            success: true,
            recordId: record.id,
            timestamp: record.checkInTime,
            location: record.checkInLocation as GpsLocation,
        };
    }

    /**
     * QR Code 打卡
     */
    async checkInWithQr(
        volunteerId: string,
        qrCode: string,
        options: CheckInOptions = {},
    ): Promise<CheckInResult> {
        const locationInfo = this.validateQrCode(qrCode);
        if (!locationInfo) {
            return { success: false, error: 'Invalid or expired QR code' };
        }

        const record = await this.createRecord(volunteerId, 'qr', locationInfo, options);

        this.logger.log(`QR check-in: volunteer ${volunteerId}, location ${locationInfo.locationName}`);

        return {
            success: true,
            recordId: record.id,
            timestamp: record.checkInTime,
            location: record.checkInLocation,
        };
    }

    /**
     * 簽退
     */
    async checkOut(recordId: string, location?: GpsLocation): Promise<CheckOutResult> {
        const record = await this.recordRepo.findOne({ where: { id: recordId } });

        if (!record) {
            return { success: false, error: 'Record not found' };
        }

        if (record.checkOutTime) {
            return { success: false, error: 'Already checked out' };
        }

        record.checkOutTime = new Date();
        if (location) {
            record.checkOutLocation = location;
        }
        record.hoursWorked = this.calculateHours(record.checkInTime, record.checkOutTime);

        await this.recordRepo.save(record);

        this.logger.log(`Check-out: record ${recordId}, hours ${record.hoursWorked}`);

        return {
            success: true,
            recordId,
            checkOutTime: record.checkOutTime,
            hoursWorked: record.hoursWorked,
        };
    }

    /**
     * 根據任務自動簽到
     */
    async checkInForTask(
        volunteerId: string,
        taskId: string,
        missionSessionId: string,
        location?: GpsLocation,
        volunteerName?: string,
    ): Promise<CheckInResult> {
        // 檢查是否已有未簽退的記錄
        const existingOpen = await this.recordRepo.findOne({
            where: {
                volunteerId,
                taskId,
                checkOutTime: undefined,
            },
        });

        if (existingOpen) {
            return {
                success: true,
                recordId: existingOpen.id,
                timestamp: existingOpen.checkInTime,
                location: existingOpen.checkInLocation,
            };
        }

        return this.checkInWithGps(volunteerId, location || { lat: 0, lng: 0 }, {
            taskId,
            missionSessionId,
            volunteerName,
            notes: 'Auto check-in on task start',
        });
    }

    /**
     * 根據任務自動簽退
     */
    async checkOutForTask(volunteerId: string, taskId: string, location?: GpsLocation): Promise<CheckOutResult> {
        const record = await this.recordRepo.findOne({
            where: {
                volunteerId,
                taskId,
                checkOutTime: undefined,
            },
            order: { checkInTime: 'DESC' },
        });

        if (!record) {
            return { success: false, error: 'No open attendance record for this task' };
        }

        return this.checkOut(record.id, location);
    }

    /**
     * 取得志工出勤記錄
     */
    async getVolunteerRecords(
        volunteerId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<AttendanceRecord[]> {
        const where: any = { volunteerId };

        if (startDate && endDate) {
            where.checkInTime = Between(startDate, endDate);
        } else if (startDate) {
            where.checkInTime = MoreThanOrEqual(startDate);
        } else if (endDate) {
            where.checkInTime = LessThanOrEqual(endDate);
        }

        return this.recordRepo.find({
            where,
            order: { checkInTime: 'DESC' },
        });
    }

    /**
     * 取得任務的出勤記錄
     */
    async getTaskRecords(taskId: string): Promise<AttendanceRecord[]> {
        return this.recordRepo.find({
            where: { taskId },
            order: { checkInTime: 'DESC' },
        });
    }

    /**
     * 取得任務場次的出勤記錄
     */
    async getMissionSessionRecords(missionSessionId: string): Promise<AttendanceRecord[]> {
        return this.recordRepo.find({
            where: { missionSessionId },
            order: { checkInTime: 'DESC' },
        });
    }

    /**
     * 取得每日統計
     */
    async getDailySummary(date: Date): Promise<DailySummary> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const dayRecords = await this.recordRepo.find({
            where: {
                checkInTime: Between(startOfDay, endOfDay),
            },
        });

        const uniqueVolunteers = new Set(dayRecords.map((r) => r.volunteerId));
        const totalHours = dayRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

        return {
            date: date.toISOString().split('T')[0],
            totalCheckIns: dayRecords.length,
            uniqueVolunteers: uniqueVolunteers.size,
            totalHours,
            avgHoursPerPerson: uniqueVolunteers.size > 0 ? totalHours / uniqueVolunteers.size : 0,
            byCheckInMethod: {
                gps: dayRecords.filter((r) => r.method === 'gps').length,
                qr: dayRecords.filter((r) => r.method === 'qr').length,
            },
        };
    }

    /**
     * 取得月度報表
     */
    async getMonthlyReport(volunteerId: string, month: number, year: number): Promise<MonthlyReport> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const records = await this.getVolunteerRecords(volunteerId, startDate, endDate);

        const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
        const daysWorked = new Set(
            records.map((r) => r.checkInTime.toISOString().split('T')[0])
        ).size;

        return {
            volunteerId,
            month,
            year,
            totalRecords: records.length,
            daysWorked,
            totalHours,
            avgHoursPerDay: daysWorked > 0 ? totalHours / daysWorked : 0,
        };
    }

    /**
     * 產生 QR Code
     */
    generateQrCode(locationId: string, locationName: string, expiryMinutes: number = 30): QrCodeInfo {
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + expiryMinutes);

        const payload = {
            locationId,
            locationName,
            expiry: expiry.toISOString(),
            nonce: Math.random().toString(36).substring(7),
        };

        const code = Buffer.from(JSON.stringify(payload)).toString('base64');

        return {
            code,
            locationId,
            locationName,
            expiresAt: expiry,
            qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`,
        };
    }

    /**
     * 取得目前簽到中的志工
     */
    async getActiveVolunteers(missionSessionId?: string): Promise<AttendanceRecord[]> {
        const where: any = {
            checkOutTime: undefined,
        };

        if (missionSessionId) {
            where.missionSessionId = missionSessionId;
        }

        return this.recordRepo.find({
            where,
            order: { checkInTime: 'DESC' },
        });
    }

    // ==================== Private Methods ====================

    private async createRecord(
        volunteerId: string,
        method: CheckInMethod,
        location: GpsLocation | QrLocation,
        options: CheckInOptions,
    ): Promise<AttendanceRecord> {
        const record = this.recordRepo.create({
            volunteerId,
            volunteerName: options.volunteerName,
            taskId: options.taskId,
            missionSessionId: options.missionSessionId,
            method,
            checkInTime: new Date(),
            checkInLocation: location,
            notes: options.notes,
        });

        return this.recordRepo.save(record);
    }

    private validateQrCode(code: string): QrLocation | null {
        try {
            const decoded = JSON.parse(Buffer.from(code, 'base64').toString('utf8'));
            if (new Date(decoded.expiry) < new Date()) {
                this.logger.warn('QR code expired');
                return null;
            }
            return {
                locationId: decoded.locationId,
                locationName: decoded.locationName,
            };
        } catch (e) {
            this.logger.warn('Invalid QR code format');
            return null;
        }
    }

    private calculateHours(start: Date, end: Date): number {
        return Math.round(((end.getTime() - start.getTime()) / 3600000) * 10) / 10;
    }
}
