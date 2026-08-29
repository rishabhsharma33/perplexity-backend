import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ConversationsService } from './conversations.service';
import { Conversation } from './schemas/conversation.schema';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let conversationModel: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };

  const userId = new Types.ObjectId().toString();
  const conversationId = new Types.ObjectId().toString();

  beforeEach(async () => {
    conversationModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getModelToken(Conversation.name),
          useValue: conversationModel,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('creates a conversation with the given title', async () => {
      conversationModel.create.mockResolvedValue({
        id: conversationId,
        title: 'My chat',
      });

      const result = await service.create(userId, { title: 'My chat' });

      expect(conversationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My chat' }),
      );
      expect(result).toEqual({ id: conversationId, title: 'My chat' });
    });

    it('defaults the title when none is provided', async () => {
      conversationModel.create.mockResolvedValue({ id: conversationId });

      await service.create(userId, {});

      expect(conversationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Conversation' }),
      );
    });
  });

  describe('findAllForUser', () => {
    it('queries conversations scoped to the user, sorted by updatedAt desc', async () => {
      const exec = jest.fn().mockResolvedValue([{ id: conversationId }]);
      const sort = jest.fn().mockReturnValue({ exec });
      conversationModel.find.mockReturnValue({ sort });

      const result = await service.findAllForUser(userId);

      expect(conversationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.any(Types.ObjectId) as Types.ObjectId,
        }),
      );
      expect(sort).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(result).toEqual([{ id: conversationId }]);
    });
  });

  describe('findOneForUser', () => {
    it('returns the conversation when it belongs to the user', async () => {
      const exec = jest.fn().mockResolvedValue({
        id: conversationId,
        user: { toString: () => userId },
      });
      conversationModel.findById.mockReturnValue({ exec });

      const result = await service.findOneForUser(conversationId, userId);

      expect(result).toEqual(expect.objectContaining({ id: conversationId }));
    });

    it('throws NotFoundException when the conversation does not exist', async () => {
      const exec = jest.fn().mockResolvedValue(null);
      conversationModel.findById.mockReturnValue({ exec });

      await expect(
        service.findOneForUser(conversationId, userId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the conversation belongs to another user', async () => {
      const exec = jest.fn().mockResolvedValue({
        id: conversationId,
        user: { toString: () => 'someone-else' },
      });
      conversationModel.findById.mockReturnValue({ exec });

      await expect(
        service.findOneForUser(conversationId, userId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('touch', () => {
    it('updates the conversation by id', async () => {
      const exec = jest.fn().mockResolvedValue(undefined);
      conversationModel.findByIdAndUpdate.mockReturnValue({ exec });

      await service.touch(conversationId);

      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        conversationId,
        {},
      );
    });
  });

  describe('remove', () => {
    it('deletes the conversation after verifying ownership', async () => {
      const deleteOne = jest.fn().mockResolvedValue(undefined);
      const exec = jest.fn().mockResolvedValue({
        id: conversationId,
        user: { toString: () => userId },
        deleteOne,
      });
      conversationModel.findById.mockReturnValue({ exec });

      await service.remove(conversationId, userId);

      expect(deleteOne).toHaveBeenCalled();
    });

    it('propagates ForbiddenException without deleting when not the owner', async () => {
      const deleteOne = jest.fn();
      const exec = jest.fn().mockResolvedValue({
        id: conversationId,
        user: { toString: () => 'someone-else' },
        deleteOne,
      });
      conversationModel.findById.mockReturnValue({ exec });

      await expect(
        service.remove(conversationId, userId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(deleteOne).not.toHaveBeenCalled();
    });
  });
});
