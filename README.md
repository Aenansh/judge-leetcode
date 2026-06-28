# Judge LeetCode

A Node.js backend for a LeetCode-style online judge. The service exposes APIs for users, questions, test cases, code stubs, code runs, and official submissions. Submissions are queued with BullMQ, stored with Prisma/Postgres, and executed inside temporary Kubernetes pods.

## Features

- User registration and login with JWT cookies
- Question creation, listing, filtering, and detail APIs
- Public and hidden test case management
- Per-language code stubs and driver code
- Authenticated code runs against public or custom input
- Authenticated official submissions against all test cases
- Redis-backed queues for asynchronous judge work
- Kubernetes sandbox pods for C, C++, Java, Python, JavaScript, and TypeScript execution

## Tech Stack

- Node.js, Express 5
- Prisma 7
- PostgreSQL / Neon
- Redis and BullMQ
- Kubernetes client for sandboxed execution
- Docker Compose for Redis and worker orchestration

## Project Structure

```text
.
`-- server
    |-- prisma
    |   `-- schema.prisma
    |-- src
    |   |-- bullmq
    |   |   |-- producer.js
    |   |   `-- worker.js
    |   |-- config
    |   |-- controllers
    |   |-- middlewares
    |   |-- routes
    |   |-- utils
    |   |-- app.js
    |   `-- index.js
    |-- docker-compose.yml
    |-- Dockerfile
    |-- package.json
    `-- prisma.config.ts
```

## Prerequisites

- Node.js 22 or newer
- npm
- PostgreSQL database, or a Neon database
- Redis
- Kubernetes cluster available from your local kubeconfig for judge execution
- Docker, if you want to run Redis and the worker with Docker Compose

## Environment Variables

Create `server/.env`:

```env
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT=6379
ACCESS_TOKEN_SECRET="replace-with-a-long-random-secret"
```

Notes:

- `DATABASE_URL` is used by the running API and worker.
- `DIRECT_URL` is used by Prisma CLI through `server/prisma.config.ts`.
- Use `REDIS_URL` for the simplest Redis setup. `REDIS_HOST` and `REDIS_PORT` are fallback values used by the BullMQ producer.

## Setup

From the `server` directory:

```bash
npm install
npx prisma generate
npx prisma db push
```

Start Redis locally, then run the API:

```bash
npm run dev
```

The API starts on `http://localhost:5000` by default.

Start the worker in a second terminal:

```bash
npm run start:worker
```

## Docker Compose

The compose file starts Redis and the judge worker:

```bash
cd server
docker compose up --build
```

The worker expects a kubeconfig mounted from `${USERPROFILE}/.kube/config` and sets `REDIS_URL=redis://redis:6379` inside the container.

## Available Scripts

Run these from `server`:

```bash
npm run dev           # Start API with nodemon
npm start             # Start API with node
npm run start:api     # Start API with node
npm run start:worker  # Start BullMQ workers
```

## API Overview

Base URL:

```text
http://localhost:5000/api/v1
```

### Users

```http
POST /users/register
POST /users/login
```

Register body:

```json
{
  "name": "Jane Doe",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "password123"
}
```

Login body:

```json
{
  "email": "jane@example.com",
  "password": "password123"
}
```

### Questions

```http
POST /questions
GET /questions
GET /questions/:questionId
```

Create question body:

```json
{
  "title": "Two Sum",
  "description": "Return indices of two numbers that add up to target.",
  "difficulty": "EASY",
  "category": ["ARRAY", "HASH_TABLE"]
}
```

List query parameters:

```text
difficulty=EASY
category=ARRAY
limit=10
page=1
```

### Test Cases

```http
POST /questions/:questionId/testcases
GET /questions/:questionId/testcases
GET /questions/:questionId/testcases?internal=true
```

Create test cases body:

```json
{
  "testcases": [
    {
      "input": "4\n2 7 11 15\n9",
      "expectedOutput": "0 1",
      "isHidden": false
    }
  ]
}
```

By default, hidden test cases are not returned. Add `internal=true` to include them.

### Code Stubs

```http
POST /questions/:questionId/codestubs
GET /questions/:questionId/codestubs?language=PYTHON
```

Create or update a code stub body:

```json
{
  "language": "PYTHON",
  "userSnippet": "def solve():\n    pass",
  "driverCode": "{{USER_CODE}}\n\nsolve()"
}
```

The worker replaces `{{USER_CODE}}` in `driverCode` with the submitted code before execution.

### Runs and Submissions

These routes require the `access_token` cookie set by login or registration.

```http
POST /questions/:questionId/run
POST /questions/:questionId/submissions
GET /submissions
GET /submissions/:questionId
GET /submissions/:submissionId
```

Run code body:

```json
{
  "language": "PYTHON",
  "code": "def solve():\n    print('hello')",
  "customInput": ""
}
```

Official submission body:

```json
{
  "language": "PYTHON",
  "code": "def solve():\n    print('hello')"
}
```

## Supported Languages

- `C`
- `CPP`
- `JAVA`
- `PYTHON`
- `JAVASCRIPT`
- `TYPESCRIPT`

## Judge Flow

1. The API validates the request and creates either a Redis run record or a pending Prisma submission.
2. A BullMQ job is added to `run_queue` or `submission_queue`.
3. The worker creates a Kubernetes pod using the language-specific runtime image.
4. Driver code is generated by replacing `{{USER_CODE}}` with the user code.
5. The code is compiled when needed and executed against custom, public, or hidden test cases.
6. Results are written back to Redis for runs or Postgres for official submissions.
7. The sandbox pod is deleted during cleanup.

## Data Model

The Prisma schema defines:

- `User`
- `Question`
- `Submission`
- `Testcase`
- `Codestub`

Important enums:

- `DifficultyType`: `EASY`, `MEDIUM`, `HARD`
- `LanguageType`: `CPP`, `C`, `JAVA`, `PYTHON`, `JAVASCRIPT`, `TYPESCRIPT`
- `ResultType`: `PENDING`, `RUNNING`, `SUCCESS`, `WRONG`, `RUNTIME_ERROR`, `COMPILE_ERROR`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `SYSTEM_ERROR`

## Development Notes

- Authenticated routes read the JWT from the `access_token` cookie.
- Submission rate limiting is applied to run and submit routes.
- Public runs expire from Redis after 5 minutes.
- The sandbox currently uses the Kubernetes `default` namespace.
- Language runtimes are pulled from public Docker images such as `gcc`, `openjdk`, `python`, and `node`.
