import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface TavilySearchResponseResult {
  title: string;
  url: string;
  content: string;
}

interface TavilySearchResponse {
  results: TavilySearchResponseResult[];
}

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const MAX_SNIPPET_LENGTH = 500;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly apiKey?: string;

  constructor(configService: ConfigService) {
    this.apiKey = configService.get<string>('TAVILY_API_KEY');
  }

  async search(
    query: string,
    maxResults = 5,
    signal?: AbortSignal,
  ): Promise<SearchResult[]> {
    if (!this.apiKey) {
      this.logger.warn('TAVILY_API_KEY not configured, skipping web search');
      return [];
    }

    try {
      const response = await fetch(TAVILY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: 'basic',
          max_results: maxResults,
        }),
        signal,
      });

      if (!response.ok) {
        this.logger.warn(`Tavily search failed with status ${response.status}`);
        return [];
      }

      const data = (await response.json()) as TavilySearchResponse;
      return data.results
        .filter((result) => isValidHttpUrl(result.url))
        .map((result) => ({
          title: result.title,
          url: result.url,
          snippet: result.content.slice(0, MAX_SNIPPET_LENGTH),
        }));
    } catch (error) {
      this.logger.warn(
        `Tavily search errored: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}
