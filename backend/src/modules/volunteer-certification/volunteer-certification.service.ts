import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Volunteer Certification Service
 * Online courses and certification for volunteers
 */
@Injectable()
export class VolunteerCertificationService {
    private readonly logger = new Logger(VolunteerCertificationService.name);

    private courses: Map<string, Course> = new Map();
    private enrollments: Map<string, Enrollment[]> = new Map();
    private certifications: Map<string, Certification[]> = new Map();

    constructor(private eventEmitter: EventEmitter2) {
        this.initializeDefaultCourses();
    }

    /**
     * Get available courses
     */
    getCourses(category?: string): Course[] {
        return Array.from(this.courses.values())
            .filter((c) => !category || c.category === category)
            .filter((c) => c.status === 'active');
    }

    /**
     * Enroll in course
     */
    enrollCourse(volunteerId: string, courseId: string): Enrollment {
        const course = this.courses.get(courseId);
        if (!course) throw new Error('Course not found');

        const enrollment: Enrollment = {
            id: `enroll-${Date.now()}`,
            volunteerId,
            courseId,
            courseName: course.name,
            status: 'enrolled',
            progress: 0,
            lessonProgress: {},
            enrolledAt: new Date(),
            completedAt: null,
        };

        const userEnrollments = this.enrollments.get(volunteerId) || [];
        userEnrollments.push(enrollment);
        this.enrollments.set(volunteerId, userEnrollments);

        return enrollment;
    }

    /**
     * Complete lesson
     */
    completeLesson(enrollmentId: string, lessonId: string, score?: number): Enrollment {
        const enrollment = this.findEnrollment(enrollmentId);
        if (!enrollment) throw new Error('Enrollment not found');

        const course = this.courses.get(enrollment.courseId);
        if (!course) throw new Error('Course not found');

        enrollment.lessonProgress[lessonId] = {
            completed: true,
            score: score || 100,
            completedAt: new Date(),
        };

        // Calculate overall progress
        const totalLessons = course.lessons.length;
        const completedLessons = Object.values(enrollment.lessonProgress).filter((p) => p.completed).length;
        enrollment.progress = Math.round((completedLessons / totalLessons) * 100);

        if (enrollment.progress === 100) {
            enrollment.status = 'completed';
            enrollment.completedAt = new Date();
        }

        return enrollment;
    }

    /**
     * Take certification exam
     */
    async takeCertificationExam(volunteerId: string, courseId: string, answers: ExamAnswers): Promise<ExamResult> {
        const course = this.courses.get(courseId);
        if (!course) throw new Error('Course not found');
        if (!course.exam) throw new Error('Course has no exam');

        const enrollment = this.findEnrollmentByUserAndCourse(volunteerId, courseId);
        if (!enrollment || enrollment.status !== 'completed') {
            throw new Error('Must complete course before taking exam');
        }

        // Grade exam
        let correctCount = 0;
        for (const question of course.exam.questions) {
            if (answers[question.id] === question.correctAnswer) {
                correctCount++;
            }
        }

        const score = Math.round((correctCount / course.exam.questions.length) * 100);
        const passed = score >= course.exam.passingScore;

        if (passed) {
            const certification = await this.issueCertification(volunteerId, course);
            return {
                passed: true,
                score,
                correctCount,
                totalQuestions: course.exam.questions.length,
                certification,
            };
        }

        return {
            passed: false,
            score,
            correctCount,
            totalQuestions: course.exam.questions.length,
            retryAfter: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        };
    }

    /**
     * Get volunteer certifications
     */
    getVolunteerCertifications(volunteerId: string): Certification[] {
        return this.certifications.get(volunteerId) || [];
    }

    /**
     * Verify certification
     */
    verifyCertification(certificationId: string): CertificationVerification {
        for (const certs of this.certifications.values()) {
            const cert = certs.find((c) => c.id === certificationId);
            if (cert) {
                return {
                    valid: cert.status === 'active' && new Date() < cert.expiresAt,
                    certification: cert,
                };
            }
        }
        return { valid: false };
    }

    /**
     * Get volunteer skill profile
     */
    getSkillProfile(volunteerId: string): SkillProfile {
        const certs = this.certifications.get(volunteerId) || [];
        const enrollments = this.enrollments.get(volunteerId) || [];

        const skills: SkillCategory[] = [];
        const categories = ['emergency_response', 'medical', 'communication', 'logistics', 'leadership'];

        for (const category of categories) {
            const categoryCerts = certs.filter((c) => c.category === category && c.status === 'active');
            const categoryEnrollments = enrollments.filter((e) => {
                const course = this.courses.get(e.courseId);
                return course?.category === category;
            });

            skills.push({
                category,
                level: this.calculateSkillLevel(categoryCerts.length),
                certifications: categoryCerts.length,
                coursesCompleted: categoryEnrollments.filter((e) => e.status === 'completed').length,
                coursesInProgress: categoryEnrollments.filter((e) => e.status === 'enrolled').length,
            });
        }

        return {
            volunteerId,
            totalCertifications: certs.filter((c) => c.status === 'active').length,
            skills,
            badges: this.calculateBadges(certs, enrollments),
        };
    }

    // Private methods
    private initializeDefaultCourses(): void {
        const defaultCourses: Course[] = [
            {
                id: 'basic-emergency',
                name: '基礎緊急應變',
                category: 'emergency_response',
                description: '了解災害類型、基本應變流程',
                duration: 120,
                lessons: [
                    { id: 'l1', title: '災害類型認識', duration: 20 },
                    { id: 'l2', title: '緊急通報流程', duration: 25 },
                    { id: 'l3', title: '疏散避難原則', duration: 25 },
                    { id: 'l4', title: '個人防護裝備', duration: 20 },
                    { id: 'l5', title: '團隊協作基礎', duration: 30 },
                ],
                exam: {
                    questions: [
                        { id: 'q1', question: '地震時應優先？', options: ['躲避', '跑', '開門'], correctAnswer: 0 },
                        { id: 'q2', question: '緊急通報電話？', options: ['110', '119', '112'], correctAnswer: 1 },
                    ],
                    passingScore: 70,
                    timeLimit: 30,
                },
                certification: { name: '緊急應變基礎認證', validityMonths: 24 },
                status: 'active',
            },
            {
                id: 'first-aid',
                name: '初級急救',
                category: 'medical',
                description: 'CPR、AED、創傷處理',
                duration: 240,
                lessons: [
                    { id: 'l1', title: 'CPR 心肺復甦術', duration: 45 },
                    { id: 'l2', title: 'AED 使用', duration: 30 },
                    { id: 'l3', title: '創傷止血', duration: 40 },
                    { id: 'l4', title: '骨折固定', duration: 35 },
                    { id: 'l5', title: '燒燙傷處理', duration: 30 },
                    { id: 'l6', title: '實作演練', duration: 60 },
                ],
                exam: {
                    questions: [
                        { id: 'q1', question: 'CPR 按壓深度？', options: ['3cm', '5cm', '7cm'], correctAnswer: 1 },
                    ],
                    passingScore: 80,
                    timeLimit: 45,
                },
                certification: { name: '初級急救員認證', validityMonths: 24 },
                status: 'active',
            },
            {
                id: 'radio-comm',
                name: '無線電通訊',
                category: 'communication',
                description: '對講機使用、通訊規範',
                duration: 90,
                lessons: [
                    { id: 'l1', title: '無線電基礎', duration: 20 },
                    { id: 'l2', title: '通訊代號規範', duration: 25 },
                    { id: 'l3', title: '設備操作', duration: 25 },
                    { id: 'l4', title: '緊急通訊協定', duration: 20 },
                ],
                exam: {
                    questions: [],
                    passingScore: 70,
                    timeLimit: 20,
                },
                certification: { name: '通訊操作員認證', validityMonths: 36 },
                status: 'active',
            },
        ];

        for (const course of defaultCourses) {
            this.courses.set(course.id, course);
        }
    }

    private findEnrollment(enrollmentId: string): Enrollment | null {
        for (const enrollments of this.enrollments.values()) {
            const found = enrollments.find((e) => e.id === enrollmentId);
            if (found) return found;
        }
        return null;
    }

    private findEnrollmentByUserAndCourse(volunteerId: string, courseId: string): Enrollment | null {
        const userEnrollments = this.enrollments.get(volunteerId) || [];
        return userEnrollments.find((e) => e.courseId === courseId) || null;
    }

    private async issueCertification(volunteerId: string, course: Course): Promise<Certification> {
        const certification: Certification = {
            id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            volunteerId,
            courseId: course.id,
            name: course.certification!.name,
            category: course.category,
            issuedAt: new Date(),
            expiresAt: new Date(Date.now() + course.certification!.validityMonths * 30 * 24 * 60 * 60 * 1000),
            status: 'active',
        };

        const userCerts = this.certifications.get(volunteerId) || [];
        userCerts.push(certification);
        this.certifications.set(volunteerId, userCerts);

        this.eventEmitter.emit('certification.issued', certification);

        return certification;
    }

    private calculateSkillLevel(certCount: number): string {
        if (certCount >= 5) return 'expert';
        if (certCount >= 3) return 'advanced';
        if (certCount >= 1) return 'intermediate';
        return 'beginner';
    }

    private calculateBadges(certs: Certification[], enrollments: Enrollment[]): string[] {
        const badges: string[] = [];

        if (certs.length >= 1) badges.push('first_certification');
        if (certs.length >= 5) badges.push('certified_pro');
        if (enrollments.filter((e) => e.status === 'completed').length >= 10) badges.push('lifelong_learner');

        return badges;
    }
}

// Types
interface Lesson {
    id: string;
    title: string;
    duration: number;
}

interface ExamQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
}

interface Course {
    id: string;
    name: string;
    category: string;
    description: string;
    duration: number;
    lessons: Lesson[];
    exam?: { questions: ExamQuestion[]; passingScore: number; timeLimit: number };
    certification?: { name: string; validityMonths: number };
    status: 'active' | 'draft' | 'archived';
}

interface Enrollment {
    id: string;
    volunteerId: string;
    courseId: string;
    courseName: string;
    status: 'enrolled' | 'completed' | 'dropped';
    progress: number;
    lessonProgress: Record<string, { completed: boolean; score: number; completedAt: Date }>;
    enrolledAt: Date;
    completedAt: Date | null;
}

type ExamAnswers = Record<string, number>;

interface ExamResult {
    passed: boolean;
    score: number;
    correctCount: number;
    totalQuestions: number;
    certification?: Certification;
    retryAfter?: Date;
}

interface Certification {
    id: string;
    volunteerId: string;
    courseId: string;
    name: string;
    category: string;
    issuedAt: Date;
    expiresAt: Date;
    status: 'active' | 'expired' | 'revoked';
}

interface CertificationVerification {
    valid: boolean;
    certification?: Certification;
}

interface SkillCategory {
    category: string;
    level: string;
    certifications: number;
    coursesCompleted: number;
    coursesInProgress: number;
}

interface SkillProfile {
    volunteerId: string;
    totalCertifications: number;
    skills: SkillCategory[];
    badges: string[];
}
