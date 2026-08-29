import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
import type { ChatMessageInput } from '../ai/ai.service';
import { AiService } from '../ai/ai.service';
import type { SearchResult } from '../search/search.service';
import { SearchService } from '../search/search.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageRole } from './schemas/message.schema';
import type { MessageDocument } from './schemas/message.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import type { UserDocument } from '../users/schemas/user.schema';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly aiService: AiService,
    private readonly searchService: SearchService,
  ) {}

  @ApiOperation({ summary: 'Create a new conversation' })
  @Post()
  create(
    @CurrentUser() user: UserDocument,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.create(user.id, dto);
  }

  @ApiOperation({ summary: "List the current user's conversations" })
  @Get()
  findAll(@CurrentUser() user: UserDocument) {
    return this.conversationsService.findAllForUser(user.id);
  }

  @ApiOperation({ summary: 'Get a single conversation' })
  @Get(':id')
  findOne(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.conversationsService.findOneForUser(id, user.id);
  }

  @ApiOperation({ summary: 'Delete a conversation' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    await this.conversationsService.findOneForUser(id, user.id);
    await this.messagesService.deleteAllForConversation(id);
    await this.conversationsService.remove(id, user.id);
  }

  @ApiOperation({ summary: 'List messages in a conversation' })
  @Get(':id/messages')
  async findMessages(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    await this.conversationsService.findOneForUser(id, user.id);
    return this.messagesService.findAllForConversation(id);
  }

  @ApiOperation({ summary: 'Add a message to a conversation' })
  @Post(':id/messages')
  async createMessage(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreateMessageDto,
  ) {
    await this.conversationsService.findOneForUser(id, user.id);
    return this.messagesService.create(id, dto);
  }

  @ApiOperation({
    summary:
      'Send a message and stream the AI reply back as Server-Sent Events',
  })
  @Post(':id/chat')
  async chat(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    await this.conversationsService.findOneForUser(id, user.id);
    await this.messagesService.create(id, {
      role: MessageRole.USER,
      content: dto.content,
    });

    const abortController = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullContent = '';
    let sources: SearchResult[] = [];
    try {
      sources = await this.searchService.search(
        dto.content,
        5,
        abortController.signal,
      );
      res.write(`data: ${JSON.stringify({ sources })}\n\n`);

      const history = await this.messagesService.findAllForConversation(id);
      const chatMessages = buildChatMessages(history, sources);

      for await (const delta of this.aiService.streamChatCompletion(
        chatMessages,
        abortController.signal,
      )) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }

      const assistantMessage = await this.messagesService.create(id, {
        role: MessageRole.ASSISTANT,
        content: fullContent,
        sources,
      });
      res.write(
        `data: ${JSON.stringify({ done: true, messageId: assistantMessage.id })}\n\n`,
      );
    } catch {
      if (fullContent) {
        await this.messagesService.create(id, {
          role: MessageRole.ASSISTANT,
          content: fullContent,
          sources,
        });
      }
      res.write(`data: ${JSON.stringify({ error: 'stream_failed' })}\n\n`);
    } finally {
      res.end();
    }
  }
}

function buildChatMessages(
  history: Pick<MessageDocument, 'role' | 'content'>[],
  sources: SearchResult[],
): ChatMessageInput[] {
  const chatMessages: ChatMessageInput[] = history.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  if (sources.length === 0) {
    return chatMessages;
  }

  const searchContext = sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title}\n${source.url}\n${source.snippet}`,
    )
    .join('\n\n');

  return [
    {
      role: 'system',
      content:
        "Use the following web search results to answer the user's latest question. " +
        'Cite sources inline using [1], [2], etc. matching the numbers below. ' +
        'If the results are not relevant, answer from your own knowledge and do not cite them.\n\n' +
        searchContext,
    },
    ...chatMessages,
  ];
}
