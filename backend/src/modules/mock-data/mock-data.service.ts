import { Injectable, Logger } from '@nestjs/common';

/**
 * Mock Data Service
 * Generate test data for development
 */
@Injectable()
export class MockDataService {
    private readonly logger = new Logger(MockDataService.name);

    /**
     * 產生假事件
     */
    generateEvents(count: number): MockEvent[] {
        const types = ['earthquake', 'flood', 'fire', 'typhoon', 'landslide'];
        const locations = ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市'];

        return Array.from({ length: count }, (_, i) => ({
            id: `event-${i + 1}`,
            title: `${types[i % types.length]}災情 #${i + 1}`,
            type: types[i % types.length],
            severity: Math.floor(Math.random() * 5) + 1,
            location: locations[i % locations.length],
            lat: 23.5 + Math.random() * 2,
            lng: 120.5 + Math.random() * 1,
            occurredAt: new Date(Date.now() - Math.random() * 30 * 24 * 3600000).toISOString(),
            status: ['active', 'resolved', 'monitoring'][i % 3],
            description: `這是一個模擬的${types[i % types.length]}災情事件`,
        }));
    }

    /**
     * 產生假志工
     */
    generateVolunteers(count: number): MockVolunteer[] {
        const names = ['王大明', '李小華', '張三', '林四', '陳五', '黃六', '吳七', '劉八'];
        const skills = ['rescue', 'medical', 'logistics', 'communication', 'driving'];

        return Array.from({ length: count }, (_, i) => ({
            id: `vol-${i + 1}`,
            name: names[i % names.length] + (i + 1),
            phone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
            email: `volunteer${i + 1}@example.com`,
            skills: [skills[i % skills.length], skills[(i + 1) % skills.length]],
            status: ['active', 'inactive', 'on_duty'][i % 3],
            totalHours: Math.floor(Math.random() * 500),
            joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 3600000).toISOString(),
        }));
    }

    /**
     * 產生假出勤記錄
     */
    generateAttendance(volunteerIds: string[], days: number): MockAttendance[] {
        const records: MockAttendance[] = [];

        for (let d = 0; d < days; d++) {
            const date = new Date();
            date.setDate(date.getDate() - d);

            for (const volId of volunteerIds) {
                if (Math.random() > 0.3) { // 70% 出勤率
                    const checkIn = new Date(date);
                    checkIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));

                    const checkOut = new Date(checkIn);
                    checkOut.setHours(checkIn.getHours() + 4 + Math.floor(Math.random() * 4));

                    records.push({
                        id: `att-${volId}-${d}`,
                        volunteerId: volId,
                        date: date.toISOString().split('T')[0],
                        checkIn: checkIn.toTimeString().slice(0, 5),
                        checkOut: checkOut.toTimeString().slice(0, 5),
                        hours: (checkOut.getTime() - checkIn.getTime()) / 3600000,
                    });
                }
            }
        }

        return records;
    }

    /**
     * 產生假警報
     */
    generateAlerts(count: number): MockAlert[] {
        const severities = ['critical', 'warning', 'info'];
        const titles = ['豪雨特報', '地震警報', '土石流警戒', '強風特報', '低溫特報'];

        return Array.from({ length: count }, (_, i) => ({
            id: `alert-${i + 1}`,
            title: titles[i % titles.length],
            severity: severities[i % severities.length],
            description: `這是一個模擬的${titles[i % titles.length]}`,
            issuedAt: new Date(Date.now() - Math.random() * 7 * 24 * 3600000).toISOString(),
            expiresAt: new Date(Date.now() + Math.random() * 24 * 3600000).toISOString(),
            affectedAreas: ['台北市', '新北市'].slice(0, i % 2 + 1),
        }));
    }

    /**
     * 產生完整測試資料集
     */
    generateFullDataset(): MockDataset {
        const events = this.generateEvents(20);
        const volunteers = this.generateVolunteers(50);
        const attendance = this.generateAttendance(volunteers.slice(0, 10).map((v) => v.id), 30);
        const alerts = this.generateAlerts(10);

        return { events, volunteers, attendance, alerts, generatedAt: new Date().toISOString() };
    }

    /**
     * 重置資料
     */
    resetData(): void {
        this.logger.log('Mock data reset');
    }
}

// Types
interface MockEvent { id: string; title: string; type: string; severity: number; location: string; lat: number; lng: number; occurredAt: string; status: string; description: string; }
interface MockVolunteer { id: string; name: string; phone: string; email: string; skills: string[]; status: string; totalHours: number; joinedAt: string; }
interface MockAttendance { id: string; volunteerId: string; date: string; checkIn: string; checkOut: string; hours: number; }
interface MockAlert { id: string; title: string; severity: string; description: string; issuedAt: string; expiresAt: string; affectedAreas: string[]; }
interface MockDataset { events: MockEvent[]; volunteers: MockVolunteer[]; attendance: MockAttendance[]; alerts: MockAlert[]; generatedAt: string; }
