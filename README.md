# Perplexity Backend

NestJS API server for the Perplexity project.

## Stack

- [NestJS](https://nestjs.com/) (Express platform)
- TypeScript
- MongoDB via `@nestjs/mongoose` / `mongoose`
- JWT auth via `@nestjs/jwt` + `@nestjs/passport` (`passport-jwt`)
- `@nestjs/config` + `dotenv` for environment configuration
- `cookie-parser` for cookie handling
- `bcrypt` for password hashing
- `class-validator` / `class-transformer` for DTO validation
- `@nestjs/swagger` for API documentation
- `openai` for AI chat completions (streamed via Server-Sent Events)
- [Tavily](https://tavily.com) for web search grounding / citations

## Prerequisites

- Node.js (v20+ recommended)
- npm
- Docker (for running MongoDB locally)

## Setup

```bash
npm install
```

Create a `.env` file in the project root (see `.env` for the current defaults):

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27018/perplexity
JWT_SECRET=<a-random-secret>
JWT_EXPIRES_IN_SECONDS=86400
OPENAI_SECRET_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4o-mini
TAVILY_API_KEY=<your-tavily-api-key>
```

`OPENAI_MODEL` is optional and defaults to `gpt-4o-mini` if omitted. `TAVILY_API_KEY` is optional too — without it, chat still works but skips web search (no citations, answers come from the model's own knowledge only). Get a free key at [tavily.com](https://tavily.com).

### Start MongoDB

```bash
docker compose up -d
```

This starts a `mongo:7` container (`perplexity-mongo`) on `localhost:27018`, matching `MONGODB_URI` above. Port 27018 (rather than the default 27017) is used to avoid clashing with other local MongoDB instances. Data persists in a named Docker volume across restarts.

To stop it: `docker compose down` (add `-v` to also wipe the data volume).

## Running the app

```bash
# development (watch mode)
npm run start:dev

# development (no watch)
npm run start

# production
npm run build
npm run start:prod
```

The server listens on `http://localhost:3000` by default (configurable via `PORT`).

## API documentation

Interactive Swagger UI is available at `http://localhost:3000/api/docs` while the app is running (raw OpenAPI JSON at `/api/docs-json`). Use the "Authorize" button to attach a Bearer token for protected routes.

## API

### Auth (`/auth`)

| Method | Path            | Auth required | Description                          |
|--------|-----------------|----------------|--------------------------------------|
| POST   | `/auth/register`| No             | Create a user, returns token + user  |
| POST   | `/auth/login`   | No             | Validate credentials, returns token + user |
| GET    | `/auth/me`      | Yes (Bearer)   | Returns the current authenticated user |

Send the JWT from `register`/`login` as `Authorization: Bearer <token>` on subsequent requests.

### Conversations (`/conversations`, all require Bearer auth)

| Method | Path                          | Description                                              |
|--------|-------------------------------|------------------------------------------------------------|
| POST   | `/conversations`              | Create a conversation                                     |
| GET    | `/conversations`              | List the current user's conversations                     |
| GET    | `/conversations/:id`          | Get one conversation                                       |
| DELETE | `/conversations/:id`          | Delete a conversation (and its messages)                   |
| GET    | `/conversations/:id/messages` | List messages in a conversation, chronological order       |
| POST   | `/conversations/:id/messages` | Append a raw message (no AI call — useful for seeding/testing) |
| POST   | `/conversations/:id/chat`     | Send a user message and stream the AI reply back           |

`POST /conversations/:id/chat` takes `{ "content": "..." }`, saves it as a `user` message, runs a Tavily web search on that content, then streams the assistant's reply as Server-Sent Events:

```
data: {"sources":[{"title":"...","url":"...","snippet":"..."}, ...]}

data: {"delta":"Some"}

data: {"delta":" text"}

data: {"done":true,"messageId":"..."}
```

The search results are injected into the model's context (numbered, so it can cite them inline as `[1]`, `[2]`, etc.) and are also emitted as a `sources` event up front, before any text streams in, so a UI can render citations immediately. The full assistant reply — including the sources actually used — is persisted once streaming completes. If the client disconnects mid-stream, both the OpenAI request and any in-flight search are aborted so no wasted tokens/API calls happen.

## Deployment

Deployed on [Railway](https://railway.app), connected to a [MongoDB Atlas](https://mongodb.com/cloud/atlas) free-tier cluster.

- **Live URL**: https://perplexity-backend-production-4793.up.railway.app
- **Build**: Railway's Railpack builder auto-detects the `build` script (`nest build`).
- **Start command**: `npm run start:prod` — set directly on the service instance (Dashboard → Service → Settings → Deploy → Custom Start Command), *not* via a `railway.json`/`.railway/railway.ts` config file. In testing, Railway's current builder silently ignored `deploy.startCommand` from both config file formats for this project, so the service instance setting is the one that's actually authoritative.
- **Env vars** (set via Railway dashboard or `railway variable set KEY=VALUE`): `MONGODB_URI` (Atlas connection string), `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`, `OPENAI_SECRET_KEY`, `OPENAI_MODEL`, `TAVILY_API_KEY`, `CORS_ORIGIN` (comma-separated list — must include the deployed frontend's origin).
- **Redeploy**: `railway up` from this directory (requires `railway login` once), or push to `main` if GitHub auto-deploy is connected in the dashboard.

## Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# coverage
npm run test:cov
```

## Linting & formatting

```bash
npm run lint
npm run format
```

## Project structure

```
src/
  app.module.ts             # root module (Config, Mongoose connection)
  main.ts                   # app bootstrap (cookie-parser, ValidationPipe)
  users/
    schemas/user.schema.ts  # User Mongoose schema (hashes password on save)
    dto/create-user.dto.ts
    users.service.ts        # create / findById / findByEmail
    users.module.ts
  auth/
    strategies/jwt.strategy.ts
    guards/jwt-auth.guard.ts
    decorators/current-user.decorator.ts
    dto/register.dto.ts
    dto/login.dto.ts
    auth.service.ts
    auth.controller.ts
    auth.module.ts
  conversations/
    schemas/conversation.schema.ts
    schemas/message.schema.ts     # includes embedded Source subdocument
    dto/
    conversations.service.ts      # CRUD + ownership checks
    messages.service.ts           # create / list / cascade delete
    conversations.controller.ts   # REST + SSE chat endpoint
    conversations.module.ts
  ai/
    ai.service.ts                 # OpenAI streaming wrapper
    ai.module.ts
  search/
    search.service.ts             # Tavily web search wrapper
    search.module.ts
test/                       # e2e tests
docker-compose.yml          # local MongoDB
```
