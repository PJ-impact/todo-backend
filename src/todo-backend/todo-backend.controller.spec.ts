import { Test, TestingModule } from '@nestjs/testing';
import { TodoBackendController } from './todo-backend.controller';

describe('TodoBackendController', () => {
  let controller: TodoBackendController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TodoBackendController],
    }).compile();

    controller = module.get<TodoBackendController>(TodoBackendController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
