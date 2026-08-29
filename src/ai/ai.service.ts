import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ChatMessageInput {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT =
  'You are a helpful, concise AI assistant similar to Perplexity. Answer clearly and directly.';

@Injectable()
export class AiService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: configService.get<string>('OPENAI_SECRET_KEY'),
    });
    this.model = configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
  }

  async *streamChatCompletion(
    messages: ChatMessageInput[],
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      },
      { signal },
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }
}
