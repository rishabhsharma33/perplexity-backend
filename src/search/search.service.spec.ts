import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let configService: { get: jest.Mock };
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    configService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);

    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns an empty array when TAVILY_API_KEY is not configured', async () => {
    configService.get.mockReturnValue(undefined);
    const unconfigured = new SearchService(
      configService as unknown as ConfigService,
    );

    const result = await unconfigured.search('hello');

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('filters out results with malformed/non-http urls', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            { title: 'Valid', url: 'https://example.com', content: 'ok' },
            {
              title: 'Opaque token (observed for trivial queries like "Hi")',
              url: 'CAESXAHrOzAVvGMox9CTRoULSXNTgZip0tW7sWImalP2cjrR0W9m',
              content: 'bad',
            },
          ],
        }),
    });

    const result = await service.search('Hi');

    expect(result).toEqual([
      { title: 'Valid', url: 'https://example.com', snippet: 'ok' },
    ]);
  });

  it('returns an empty array when the Tavily response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    const result = await service.search('hello');

    expect(result).toEqual([]);
  });

  it('returns an empty array when fetch throws', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));

    const result = await service.search('hello');

    expect(result).toEqual([]);
  });
});
