import { Injectable, Logger } from '@nestjs/common';

/**
 * Attendance Service
 * Check-in/out with GPS and QR
 */
@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);
    private records: Map<string, AttendanceRecord> = new Map();

    /**
     * GPS 打卡
     */
    checkInWithGps(volunteerId: string, location: GpsLocation): CheckInResult {
        const record = this.createRecord(volunteerId, 'gps', location);
        return {
            success: true,
            recordId: record.id,
            timestamp: record.checkInTime,
            location: record.location,
        };
    }

    /**
     * QR Code 打卡
     */
    checkInWithQr(volunteerId: string, qrCode: string): CheckInResult {
        const locationInfo = this.validateQrCode(qrCode);
        if (!locationInfo) {
            return { success: false, error: 'Invalid QR code' };
        }

        const record = this.createRecord(volunteerId, 'qr', locationInfo);
        return {
            success: true,
            recordId: record.id,
            timestamp: record.checkInTime,
        };
    }

    /**
     * 簽退
     */
    checkOut(recordId: string, location?: GpsLocation): CheckOutResult {
        const record = this.records.get(recordId);
        if (!record) {
            return { success: false, error: 'Record not found' };
        }

        if (record.checkOutTime) {
            return { success: false, error: 'Already checked out' };
        }

        record.checkOutTime = new Date();
        record.checkOutLocation = location;
        record.hoursWorked = this.calculateHours(record.checkInTime, record.checkOutTime);

        return {
            success: true,
            recordId,
            checkOutTime: record.checkOutTime,
            hoursWorked: record.hoursWorked,
        };
    }

    /**
     * 取得志工出勤記錄
     */
    getVolunteerRecords(volunteerId: string, startDate?: Date, endDate?: Date): AttendanceRecord[] {
        return Array.from(this.records.values())
            .filter((r) => {
                if (r.volunteerId !== volunteerId) return false;
                if (startDate && r.checkInTime < startDate) return false;
                if (endDate && r.checkInTime > endDate) return false;
                return true;
            })
            .sort((a, b) => b.checkInTime.getTime() - a.checkInTime.getTime());
    }

    /**
     * 取得每日統計
     */
    getDailySummary(date: Date): DailySummary {
        const dateStr = date.toISOString().split('T')[0];
        const dayRecords = Array.from(this.records.values()).filter((r) =>
            r.checkInTime.toISOString().split('T')[0] === dateStr);

        const uniqueVolunteers = new Set(dayRecords.map((r) => r.volunteerId));
        const totalHours = dayRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

        return {
            date: dateStr,
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
    getMonthlyReport(volunteerId: string, month: number, year: number): MonthlyReport {
        const records = this.getVolunteerRecords(volunteerId).filter((r) => {
            const d = r.checkInTime;
            return d.getMonth() + 1 === month && d.getFullYear() === year;
        });

        const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
        const daysWorked = new Set(records.map((r) => r.checkInTime.toISOString().split('T')[0])).size;

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
    generateQrCode(locationId: string, locationName: string): QrCodeInfo {
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 30);

        const code = Buffer.from(JSON.stringify({
            locationId,
            locationName,
            expiry: expiry.toISOString(),
            nonce: Math.random().toString(36).substring(7),
        })).toString('base64');

        return {
            code,
            locationId,
            locationName,
            expiresAt: expiry,
            qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`,
        };
    }

    private createRecord(volunteerId: string, method: 'gps' | 'qr', location: GpsLocation | QrLocation): AttendanceRecord {
        const record: AttendanceRecord = {
            id: `att-${Date.now()}`,
            volunteerId,
            method,
            checkInTime: new Date(),
            location,
        };

        this.records.set(record.id, record);
        return record;
    }

    private validateQrCode(code: string): QrLocation | null {
        try {
            const decoded = JSON.parse(Buffer.from(code, 'base64').toString('utf8'));
            if (new Date(decoded.expiry) < new Date()) return null;
            return { locationId: decoded.locationId, locationName: decoded.locationName };
        } catch {
            return null;
        }
    }

    private calculateHours(start: Date, end: Date): number {
        return Math.round((end.getTime() - start.getTime()) / 3600000 * 10) / 10;
    }
}

// Types
interface GpsLocation { lat: number; lng: number; accuracy?: number; }
interface QrLocation { locationId: string; locationName: string; }
interface AttendanceRecord { id: string; volunteerId: string; method: 'gps' | 'qr'; checkInTime: Date; checkOutTime?: Date; location: GpsLocation | QrLocation; checkOutLocation?: GpsLocation; hoursWorked?: number; }
interface CheckInResult { success: boolean; recordId?: string; timestamp?: Date; location?: any; error?: string; }
interface CheckOutResult { success: boolean; recordId?: string; checkOutTime?: Date; hoursWorked?: number; error?: string; }
interface DailySummary { date: string; totalCheckIns: number; uniqueVolunteers: number; totalHours: number; avgHoursPerPerson: number; byCheckInMethod: { gps: number; qr: number }; }
interface MonthlyReport { volunteerId: string; month: number; year: number; totalRecords: number; daysWorked: number; totalHours: number; avgHoursPerDay: number; }
interface QrCodeInfo { code: string; locationId: string; locationName: string; expiresAt: Date; qrImageUrl: string; }
