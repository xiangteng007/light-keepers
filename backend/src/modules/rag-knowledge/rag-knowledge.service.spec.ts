import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RagKnowledgeService } from './rag-knowledge.service';

describe('RagKnowledgeService', () => {
    let service: RagKnowledgeService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RagKnowledgeService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
            ],
        }).compile();
        service = module.get(RagKnowledgeService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('query returns fallback answer without API key', async () => {
        const result = await service.query('地震應變');
        expect(result.answer).toBeDefined();
        expect(result.confidence).toBeDefined();
        expect(result.sources.length).toBeGreaterThan(0);
    });

    it('retrieveRelevant returns matching docs', () => {
        const docs = service.retrieveRelevant('地震');
        expect(docs.length).toBeGreaterThan(0);
        expect(docs[0].title).toContain('地震');
    });

    it('addDocument adds and returns doc', () => {
        const doc = service.addDocument({ title: 'New SOP', category: 'sop', content: 'Content here' });
        expect(doc.id).toBeDefined();
        expect(doc.title).toBe('New SOP');
    });

    it('getCategories returns category counts', () => {
        const cats = service.getCategories();
        expect(cats.length).toBeGreaterThan(0);
        expect(cats.find(c => c.category === 'sop')).toBeDefined();
    });

    it('search returns filtered docs', () => {
        const docs = service.search('志工', 'guide');
        expect(docs.length).toBeGreaterThan(0);
    });
});
