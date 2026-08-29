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
```

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
test/                       # e2e tests
docker-compose.yml          # local MongoDB
```
