import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { MessagesService } from './messages.service';
import { ConversationsService } from './conversations.service';
import { Message, MessageRole } from './schemas/message.schema';

describe('MessagesService', () => {
  let service: MessagesService;
  let messageModel: {
    create: jest.Mock;
    find: jest.Mock;
    deleteMany: jest.Mock;
  };
  let conversationsService: { touch: jest.Mock };

  const conversationId = new Types.ObjectId().toString();

  beforeEach(async () => {
    messageModel = {
      create: jest.fn(),
      find: jest.fn(),
      deleteMany: jest.fn(),
    };
    conversationsService = {
      touch: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useValue: messageModel,
        },
        {
          provide: ConversationsService,
          useValue: conversationsService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('creates a message scoped to the conversation and touches it', async () => {
      messageModel.create.mockResolvedValue({
        id: 'msg-1',
        role: MessageRole.USER,
        content: 'hello',
      });

      const result = await service.create(conversationId, {
        role: MessageRole.USER,
        content: 'hello',
      });

      expect(messageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation: expect.any(Types.ObjectId) as Types.ObjectId,
          role: MessageRole.USER,
          content: 'hello',
          sources: [],
        }),
      );
      expect(conversationsService.touch).toHaveBeenCalledWith(conversationId);
      expect(result).toEqual(
        expect.objectContaining({ id: 'msg-1', role: MessageRole.USER }),
      );
    });

    it('passes through sources when provided', async () => {
      messageModel.create.mockResolvedValue({ id: 'msg-2' });
      const sources = [
        { title: 'Example', url: 'https://example.com', snippet: 'text' },
      ];

      await service.create(conversationId, {
        role: MessageRole.ASSISTANT,
        content: 'answer',
        sources,
      });

      expect(messageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ sources }),
      );
    });

    it('still touches the conversation even if sources are omitted', async () => {
      messageModel.create.mockResolvedValue({ id: 'msg-3' });

      await service.create(conversationId, {
        role: MessageRole.ASSISTANT,
        content: 'answer',
      });

      expect(conversationsService.touch).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllForConversation', () => {
    it('queries messages scoped to the conversation, sorted chronologically', async () => {
      const exec = jest.fn().mockResolvedValue([{ id: 'msg-1' }]);
      const sort = jest.fn().mockReturnValue({ exec });
      messageModel.find.mockReturnValue({ sort });

      const result = await service.findAllForConversation(conversationId);

      expect(messageModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation: expect.any(Types.ObjectId) as Types.ObjectId,
        }),
      );
      expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
      expect(result).toEqual([{ id: 'msg-1' }]);
    });
  });

  describe('deleteAllForConversation', () => {
    it('deletes all messages scoped to the conversation', async () => {
      const exec = jest.fn().mockResolvedValue({ deletedCount: 2 });
      messageModel.deleteMany.mockReturnValue({ exec });

      await service.deleteAllForConversation(conversationId);

      expect(messageModel.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation: expect.any(Types.ObjectId) as Types.ObjectId,
        }),
      );
      expect(exec).toHaveBeenCalled();
    });
  });
});
