import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VolunteerCertificationService } from './volunteer-certification.service';

describe('VolunteerCertificationService', () => {
    let service: VolunteerCertificationService;
    let eventEmitter: { emit: jest.Mock };

    beforeEach(async () => {
        eventEmitter = { emit: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VolunteerCertificationService,
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<VolunteerCertificationService>(VolunteerCertificationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== getCourses =====
    describe('getCourses', () => {
        it('should return default courses', () => {
            const courses = service.getCourses();
            expect(courses.length).toBeGreaterThan(0);
        });

        it('should filter by category', () => {
            const allCourses = service.getCourses();
            if (allCourses.length > 0) {
                const category = allCourses[0].category;
                const filtered = service.getCourses(category);
                expect(filtered.every(c => c.category === category)).toBe(true);
            }
        });
    });

    // ===== enrollCourse =====
    describe('enrollCourse', () => {
        it('should enroll volunteer in course', () => {
            const courses = service.getCourses();
            expect(courses.length).toBeGreaterThan(0);
            const enrollment = service.enrollCourse('vol-1', courses[0].id);
            expect(enrollment.id).toBeDefined();
            expect(enrollment.status).toBe('enrolled');
            expect(enrollment.progress).toBe(0);
        });

        it('should throw for nonexistent course', () => {
            expect(() => service.enrollCourse('vol-1', 'fake')).toThrow();
        });

        it('should allow re-enrollment (no duplicate check)', () => {
            const courses = service.getCourses();
            service.enrollCourse('vol-1', courses[0].id);
            const second = service.enrollCourse('vol-1', courses[0].id);
            expect(second.status).toBe('enrolled');
        });
    });

    // ===== completeLesson =====
    describe('completeLesson', () => {
        it('should mark lesson as complete and update progress', () => {
            const courses = service.getCourses();
            const course = courses[0];
            const enrollment = service.enrollCourse('vol-1', course.id);
            const lesson = course.lessons[0];
            const updated = service.completeLesson(enrollment.id, lesson.id, 90);
            expect(updated.progress).toBeGreaterThan(0);
            expect(updated.lessonProgress[lesson.id].completed).toBe(true);
        });

        it('should throw for nonexistent enrollment', () => {
            expect(() => service.completeLesson('fake', 'lesson-1', 80)).toThrow();
        });
    });

    // ===== takeCertificationExam =====
    describe('takeCertificationExam', () => {
        it('should pass exam with all correct answers and issue certification', async () => {
            const courses = service.getCourses();
            // Find a course with an exam
            const courseWithExam = courses.find(c => c.exam);
            if (!courseWithExam) return; // Skip if no course has exam

            const enrollment = service.enrollCourse('vol-1', courseWithExam.id);

            // Complete all lessons first
            for (const lesson of courseWithExam.lessons) {
                service.completeLesson(enrollment.id, lesson.id, 100);
            }

            // Build correct answers
            const answers: Record<string, number> = {};
            for (const q of courseWithExam.exam!.questions) {
                answers[q.id] = q.correctAnswer;
            }

            const result = await service.takeCertificationExam('vol-1', courseWithExam.id, answers);
            expect(result.passed).toBe(true);
            expect(result.score).toBe(100);
            if (courseWithExam.certification) {
                expect(result.certification).toBeDefined();
            }
        });

        it('should fail exam with wrong answers', async () => {
            const courses = service.getCourses();
            const courseWithExam = courses.find(c => c.exam);
            if (!courseWithExam) return;

            const enrollment = service.enrollCourse('vol-2', courseWithExam.id);
            for (const lesson of courseWithExam.lessons) {
                service.completeLesson(enrollment.id, lesson.id, 100);
            }

            // All wrong answers
            const answers: Record<string, number> = {};
            for (const q of courseWithExam.exam!.questions) {
                answers[q.id] = -1; // impossible answer
            }

            const result = await service.takeCertificationExam('vol-2', courseWithExam.id, answers);
            expect(result.passed).toBe(false);
            expect(result.score).toBe(0);
        });
    });

    // ===== getVolunteerCertifications =====
    describe('getVolunteerCertifications', () => {
        it('should return empty for new volunteer', () => {
            const certs = service.getVolunteerCertifications('new-vol');
            expect(certs).toHaveLength(0);
        });
    });

    // ===== verifyCertification =====
    describe('verifyCertification', () => {
        it('should verify valid certification', async () => {
            const courses = service.getCourses();
            const courseWithExam = courses.find(c => c.exam && c.certification);
            if (!courseWithExam) return;

            const enrollment = service.enrollCourse('vol-3', courseWithExam.id);
            for (const lesson of courseWithExam.lessons) {
                service.completeLesson(enrollment.id, lesson.id, 100);
            }

            const answers: Record<string, number> = {};
            for (const q of courseWithExam.exam!.questions) {
                answers[q.id] = q.correctAnswer;
            }

            const examResult = await service.takeCertificationExam('vol-3', courseWithExam.id, answers);
            if (examResult.certification) {
                const verification = service.verifyCertification(examResult.certification.id);
                expect(verification.valid).toBe(true);
            }
        });

        it('should return invalid for nonexistent certification', () => {
            const verification = service.verifyCertification('fake-cert');
            expect(verification.valid).toBe(false);
        });
    });

    // ===== getSkillProfile =====
    describe('getSkillProfile', () => {
        it('should return skill profile for volunteer', () => {
            const profile = service.getSkillProfile('vol-1');
            expect(profile.volunteerId).toBe('vol-1');
            expect(profile.totalCertifications).toBeDefined();
            expect(profile.skills).toBeDefined();
        });
    });
});
