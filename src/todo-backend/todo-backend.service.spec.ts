import { Test, TestingModule } from '@nestjs/testing';
import { TodoBackendService } from './todo-backend.service';

describe('TodoBackendService', () => {
  let service: TodoBackendService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TodoBackendService],
    }).compile();

    service = module.get<TodoBackendService>(TodoBackendService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
