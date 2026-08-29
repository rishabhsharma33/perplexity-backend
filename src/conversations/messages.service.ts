import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { ConversationsService } from './conversations.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    private readonly conversationsService: ConversationsService,
  ) {}

  async create(
    conversationId: string,
    dto: CreateMessageDto,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.create({
      conversation: new Types.ObjectId(conversationId),
      role: dto.role,
      content: dto.content,
      sources: dto.sources ?? [],
    });
    await this.conversationsService.touch(conversationId);
    return message;
  }

  findAllForConversation(conversationId: string): Promise<MessageDocument[]> {
    return this.messageModel
      .find({ conversation: new Types.ObjectId(conversationId) })
      .sort({ createdAt: 1 })
      .exec();
  }

  async deleteAllForConversation(conversationId: string): Promise<void> {
    await this.messageModel
      .deleteMany({ conversation: new Types.ObjectId(conversationId) })
      .exec();
  }
}
