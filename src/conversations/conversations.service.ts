import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
  ) {}

  create(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationDocument> {
    return this.conversationModel.create({
      user: new Types.ObjectId(userId),
      title: dto.title ?? 'New Conversation',
    });
  }

  findAllForUser(userId: string): Promise<ConversationDocument[]> {
    return this.conversationModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findOneForUser(
    id: string,
    userId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(id).exec();
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.user.toString() !== userId) {
      throw new ForbiddenException();
    }
    return conversation;
  }

  async touch(id: string): Promise<void> {
    await this.conversationModel.findByIdAndUpdate(id, {}).exec();
  }

  async remove(id: string, userId: string): Promise<void> {
    const conversation = await this.findOneForUser(id, userId);
    await conversation.deleteOne();
  }
}
