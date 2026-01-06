import { Injectable, Logger } from '@nestjs/common';

export interface MissingPerson {
    id: string;
    reportType: 'missing' | 'found' | 'seeking';
    status: 'active' | 'found' | 'reunified' | 'closed';
    name: string;
    alias?: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    description: string;
    distinguishingFeatures?: string;
    lastSeenLocation: string;
    lastSeenTime: Date;
    photos: string[];
    photoEmbeddings?: number[][];
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    disasterEventId?: string;
    shelterId?: string;
    foundLocation?: string;
    foundTime?: Date;
    metadata?: Record<string, any>;
    reportedBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PhotoMatch {
    sourcePersonId: string;
    matchedPersonId: string;
    similarity: number;
    matchedAt: Date;
    verificationStatus: 'pending' | 'confirmed' | 'rejected';
    verifiedBy?: string;
}

export interface ReunificationCase {
    id: string;
    missingPersonId: string;
    seekingPersonId?: string;
    status: 'potential_match' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    matchScore: number;
    matchType: 'photo' | 'description' | 'shelter_report' | 'manual';
    reunificationLocation?: string;
    reunifiedAt?: Date;
    notes: string[];
    createdAt: Date;
}

export interface ShelterReport {
    shelterId: string;
    shelterName: string;
    personId: string;
    personName: string;
    arrivalTime: Date;
    photoUrl?: string;
    healthStatus: 'healthy' | 'injured' | 'critical';
    notes?: string;
}

@Injectable()
export class FamilyReunificationService {
    private readonly logger = new Logger(FamilyReunificationService.name);
    private persons: Map<string, MissingPerson> = new Map();
    private matches: Map<string, PhotoMatch> = new Map();
    private cases: Map<string, ReunificationCase> = new Map();
    private shelterReports: Map<string, ShelterReport[]> = new Map();

    // ===== 失蹤人口登記 =====

    reportMissingPerson(data: Omit<MissingPerson, 'id' | 'status' | 'createdAt' | 'updatedAt'>): MissingPerson {
        const person: MissingPerson = {
            ...data,
            id: `mp-${Date.now()}`,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.persons.set(person.id, person);
        this.logger.log(`Missing person reported: ${person.name} (${person.id})`);

        // 自動進行照片比對
        if (person.photos.length > 0) {
            this.runPhotoMatching(person.id);
        }

        return person;
    }

    getPerson(id: string): MissingPerson | undefined {
        return this.persons.get(id);
    }

    searchPersons(options: {
        name?: string;
        status?: string;
        disasterEventId?: string;
        shelterId?: string;
    }): MissingPerson[] {
        return Array.from(this.persons.values())
            .filter(p => {
                if (options.name && !p.name.includes(options.name) && !p.alias?.includes(options.name)) return false;
                if (options.status && p.status !== options.status) return false;
                if (options.disasterEventId && p.disasterEventId !== options.disasterEventId) return false;
                if (options.shelterId && p.shelterId !== options.shelterId) return false;
                return true;
            });
    }

    updatePerson(id: string, updates: Partial<MissingPerson>): MissingPerson | null {
        const person = this.persons.get(id);
        if (!person) return null;
        Object.assign(person, updates, { updatedAt: new Date() });
        return person;
    }

    markAsFound(id: string, location: string): MissingPerson | null {
        const person = this.persons.get(id);
        if (!person) return null;
        person.status = 'found';
        person.foundLocation = location;
        person.foundTime = new Date();
        person.updatedAt = new Date();
        this.logger.log(`Person found: ${person.name} at ${location}`);
        return person;
    }

    // ===== AI 照片比對 =====

    private runPhotoMatching(personId: string): PhotoMatch[] {
        const person = this.persons.get(personId);
        if (!person) return [];

        const matches: PhotoMatch[] = [];

        // 模擬 AI 照片比對
        this.persons.forEach((other) => {
            if (other.id === personId) return;
            if (other.reportType === person.reportType) return; // 不比對同類型

            // 模擬相似度計算
            const similarity = Math.random();
            if (similarity > 0.7) {
                const match: PhotoMatch = {
                    sourcePersonId: personId,
                    matchedPersonId: other.id,
                    similarity,
                    matchedAt: new Date(),
                    verificationStatus: 'pending',
                };
                this.matches.set(`${personId}-${other.id}`, match);
                matches.push(match);

                // 自動建立潛在配對案例
                if (similarity > 0.8) {
                    this.createReunificationCase(personId, other.id, similarity, 'photo');
                }
            }
        });

        if (matches.length > 0) {
            this.logger.log(`Found ${matches.length} potential matches for ${person.name}`);
        }

        return matches;
    }

    getMatches(personId: string): PhotoMatch[] {
        return Array.from(this.matches.values())
            .filter(m => m.sourcePersonId === personId || m.matchedPersonId === personId);
    }

    verifyMatch(sourceId: string, matchedId: string, status: 'confirmed' | 'rejected', userId: string): PhotoMatch | null {
        const match = this.matches.get(`${sourceId}-${matchedId}`);
        if (!match) return null;
        match.verificationStatus = status;
        match.verifiedBy = userId;

        if (status === 'confirmed') {
            this.createReunificationCase(sourceId, matchedId, match.similarity, 'photo');
        }

        return match;
    }

    // ===== 團聚案例管理 =====

    private createReunificationCase(
        missingPersonId: string,
        seekingPersonId: string,
        matchScore: number,
        matchType: ReunificationCase['matchType']
    ): ReunificationCase {
        const caseRecord: ReunificationCase = {
            id: `case-${Date.now()}`,
            missingPersonId,
            seekingPersonId,
            status: 'potential_match',
            matchScore,
            matchType,
            notes: [],
            createdAt: new Date(),
        };
        this.cases.set(caseRecord.id, caseRecord);
        return caseRecord;
    }

    getCase(id: string): ReunificationCase | undefined {
        return this.cases.get(id);
    }

    getCasesByPerson(personId: string): ReunificationCase[] {
        return Array.from(this.cases.values())
            .filter(c => c.missingPersonId === personId || c.seekingPersonId === personId);
    }

    getAllCases(status?: string): ReunificationCase[] {
        return Array.from(this.cases.values())
            .filter(c => !status || c.status === status);
    }

    confirmMatch(caseId: string): ReunificationCase | null {
        const caseRecord = this.cases.get(caseId);
        if (!caseRecord) return null;
        caseRecord.status = 'confirmed';
        this.logger.log(`Match confirmed: Case ${caseId}`);
        return caseRecord;
    }

    startReunification(caseId: string, location: string): ReunificationCase | null {
        const caseRecord = this.cases.get(caseId);
        if (!caseRecord) return null;
        caseRecord.status = 'in_progress';
        caseRecord.reunificationLocation = location;
        return caseRecord;
    }

    completeReunification(caseId: string, notes?: string): ReunificationCase | null {
        const caseRecord = this.cases.get(caseId);
        if (!caseRecord) return null;

        caseRecord.status = 'completed';
        caseRecord.reunifiedAt = new Date();
        if (notes) caseRecord.notes.push(notes);

        // 更新人員狀態
        const missing = this.persons.get(caseRecord.missingPersonId);
        if (missing) missing.status = 'reunified';
        const seeking = caseRecord.seekingPersonId ? this.persons.get(caseRecord.seekingPersonId) : null;
        if (seeking) seeking.status = 'reunified';

        this.logger.log(`Reunification completed: Case ${caseId}`);
        return caseRecord;
    }

    addCaseNote(caseId: string, note: string): ReunificationCase | null {
        const caseRecord = this.cases.get(caseId);
        if (!caseRecord) return null;
        caseRecord.notes.push(`[${new Date().toISOString()}] ${note}`);
        return caseRecord;
    }

    // ===== 收容所通報 =====

    reportFromShelter(data: ShelterReport): ShelterReport {
        let reports = this.shelterReports.get(data.shelterId);
        if (!reports) {
            reports = [];
            this.shelterReports.set(data.shelterId, reports);
        }
        reports.push(data);

        // 嘗試與失蹤人口比對
        this.matchWithMissingPersons(data);

        return data;
    }

    private matchWithMissingPersons(report: ShelterReport): void {
        this.persons.forEach((person) => {
            if (person.status !== 'active') return;
            if (person.reportType !== 'missing') return;

            // 簡單名稱比對
            if (person.name === report.personName || person.alias === report.personName) {
                this.logger.log(`Potential shelter match: ${person.name} at ${report.shelterName}`);
                this.createReunificationCase(person.id, report.personId, 0.9, 'shelter_report');
            }
        });
    }

    getShelterReports(shelterId: string): ShelterReport[] {
        return this.shelterReports.get(shelterId) || [];
    }

    // ===== 統計 =====

    getStats(): {
        totalMissing: number;
        totalFound: number;
        totalReunified: number;
        pendingMatches: number;
        activeCases: number;
    } {
        const persons = Array.from(this.persons.values());
        return {
            totalMissing: persons.filter(p => p.status === 'active' && p.reportType === 'missing').length,
            totalFound: persons.filter(p => p.status === 'found').length,
            totalReunified: persons.filter(p => p.status === 'reunified').length,
            pendingMatches: Array.from(this.matches.values()).filter(m => m.verificationStatus === 'pending').length,
            activeCases: Array.from(this.cases.values()).filter(c => c.status === 'in_progress').length,
        };
    }

    // ===== 通知 =====

    notifyFamily(caseId: string, message: string): { success: boolean; notifiedContacts: string[] } {
        const caseRecord = this.cases.get(caseId);
        if (!caseRecord) return { success: false, notifiedContacts: [] };

        const notifiedContacts: string[] = [];

        const missing = this.persons.get(caseRecord.missingPersonId);
        if (missing) {
            notifiedContacts.push(missing.contactPhone);
            if (missing.contactEmail) notifiedContacts.push(missing.contactEmail);
        }

        this.logger.log(`Family notified for case ${caseId}: ${notifiedContacts.join(', ')}`);
        return { success: true, notifiedContacts };
    }
}
