import { Test, TestingModule } from '@nestjs/testing';
import { RagKnowledgeController } from './rag-knowledge.controller';
import { RagKnowledgeService } from './rag-knowledge.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('RagKnowledgeController', () => {
    let controller: RagKnowledgeController;

    beforeEach(async () => {
        const service = {
            query: jest.fn().mockResolvedValue({ answer: 'test' }),
            search: jest.fn().mockReturnValue([]),
            getCategories: jest.fn().mockReturnValue([]),
            addDocument: jest.fn().mockReturnValue({ id: 'd1' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [RagKnowledgeController],
            providers: [{ provide: RagKnowledgeService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<RagKnowledgeController>(RagKnowledgeController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('query returns answer', async () => expect(await controller.query({ question: 'test' })).toBeDefined());
    it('search returns results', () => expect(controller.search('earthquake')).toBeDefined());
    it('getCategories returns categories', () => expect(controller.getCategories()).toBeDefined());
    it('addDocument adds doc', () => expect(controller.addDocument({ title: 'T', category: 'C', content: 'D' })).toBeDefined());
});
