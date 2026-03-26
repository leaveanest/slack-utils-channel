# Contributing to slack-utils-channel

> **Japanese version / 日本語版: [CONTRIBUTING.md](CONTRIBUTING.md)**

Thank you for your interest in contributing to the slack-utils project! This
guide explains the contribution workflow and development rules.

## Types of Contributions

Please choose the appropriate method based on the type of contribution.

| What you want to do                           | How                                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Ask a question, share an idea                 | Create an Issue with the `question` label                                                       |
| Report a bug                                  | Create an Issue using the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)           |
| Propose a new feature                         | Create an Issue using the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) |
| Fix a typo or minor documentation improvement | You can create a Pull Request directly                                                          |
| Code changes or improvements                  | Discuss in an Issue first, then create a Pull Request                                           |

### First-Time Contributors

If this is your first time contributing, look for Issues with these labels:

- **`good first issue`** — Suitable for beginners. The scope is clear and can be
  completed with changes to 1-2 files
- **`help wanted`** — External contributions are welcome. May be more
  challenging than `good first issue`

When you find an Issue you want to work on, **leave a comment to claim it**
before starting.

## Review Process

- Reviews will begin within **one week** of PR submission
- Please respond to change requests within **two weeks**
- PRs with no activity for 30 days may be closed (can be reopened)
- All CI checks must pass before review begins
- For work-in-progress PRs, use GitHub's Draft PR feature

## Label Rules

| Label                   | Description                                               | Assigned by |
| ----------------------- | --------------------------------------------------------- | ----------- |
| `good first issue`      | For beginners. Clear scope, includes implementation hints | Maintainers |
| `help wanted`           | External contributions welcome. May be more advanced      | Maintainers |
| `ready-for-development` | Requirements finalized, ready for implementation          | Maintainers |
| `bug`                   | Bug report (auto-assigned via Issue template)             | Automatic   |
| `enhancement`           | Feature request (auto-assigned via Issue template)        | Automatic   |
| `question`              | Questions and discussions                                 | Reporter    |

## Development Flow

1. Check the Issue you want to work on and leave a comment to declare your
   intent.
2. Create a working branch and develop locally.
3. Run tests and static analysis frequently during development.
4. Create a Pull Request and share it with reviewers.

## Coding Conventions

- Follow the Deno standard style guide.
- TypeScript always assumes `strict` mode; avoid implicit `any`.
- Use `import_map.json` for imports to avoid excessive relative paths.

### Important Guidelines

When developing new features, please follow these guidelines:

- **Testing**: [`docs/testing-guide.md`](docs/testing-guide.md) - JSDoc comments
  required, test both normal and error cases
- **Internationalization**: [`docs/i18n-guide.md`](docs/i18n-guide.md) - Use the
  `t()` function for error messages
- **Exception Handling**:
  [`docs/exception-handling-guide.md`](docs/exception-handling-guide.md)
  - Check `response.ok` for API calls
  - Validation is required
  - Type-safe error handling

## Writing Issues

- Follow the template and clearly document the background, purpose, and
  acceptance criteria.
- Use the `ready-for-development` label to indicate that the Issue is ready for
  implementation.
- Clearly describe reproduction steps, expected values, and impact scope.

## Creating Pull Requests

- Keep titles concise and use Conventional Commits format.
- Complete all items in the template checklist and check them off.
- Link related Issues using the `Closes #<issue-number>` format.

## Development Environment Setup

```bash
# Install Deno
curl -fsSL https://deno.land/install.sh | sh

# Install Slack CLI
curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash
slack login

# Set up Git hooks (recommended)
bash scripts/setup-git-hooks.sh
```

- Store sensitive information like Slack CLI tokens in `.env`.
- Use `deno task dev` for local execution as needed.
- Setting up Git hooks will automatically run quality checks on commit/push.

### Slack Developer Sandbox

The approval workflows (Admin API) in this repository require an Enterprise Grid
environment. If you don't have a production workspace, you can join the
[Slack Developer Program](https://api.slack.com/developer-program) (free) to get
access to a sandbox workspace equivalent to Enterprise Grid. We recommend using
it for development and testing.

### About slack.json

`slack.json` is configured with minimal settings for local development:

- **`environments.local`**: Auto-loads `.env` file (convenient for local
  development)
- **`deployments`**: Removed (each team adds this for production deployment)

If you need production deployment, add the `deployments` section. See the
"slack.json Configuration" section in [README.md](README.md) for details.

**About the `.slack/` folder:**

- Automatically generated and managed by Slack CLI (excluded via `.gitignore`)
- No manual editing required
- Auto-updated by `slack run` and `slack auth`

## Rules for Creating New Functions

**Important: When creating new functions or modules, you must follow these
steps.**

### Required Steps

#### 1. Add JSDoc Comments

All public functions must have JSDoc comments:

````typescript
/**
 * Retrieves Slack channel information
 *
 * @param client - Slack API client
 * @param channelId - Target channel ID
 * @returns Channel summary information
 * @throws {Error} When channel information retrieval fails
 *
 * @example
 * ```typescript
 * const summary = await retrieveChannelSummary(client, "C12345678");
 * console.log(`Channel: ${summary.name}, Members: ${summary.member_count}`);
 * ```
 */
export async function retrieveChannelSummary(
  client: SlackAPIClient,
  channelId: string,
): Promise<ChannelSummary> {
  // implementation
}
````

**Information to include:**

- Description of the function's purpose and behavior
- `@param` - Description of each parameter
- `@returns` - Description of the return value
- `@throws` - Conditions under which errors occur
- `@example` - Usage examples (optional, recommended)

#### 2. Create Test Files

Place `test.ts` in the same directory as the function and test both normal and
error cases:

```typescript
import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { retrieveChannelSummary } from "./mod.ts";

Deno.test("Successfully retrieves channel information", async () => {
  // Arrange
  const mockClient = createMockClient();

  // Act
  const result = await retrieveChannelSummary(mockClient, "C12345");

  // Assert
  assertEquals(result.id, "C12345");
  assertEquals(result.name, "general");
});

Deno.test("Returns error when channel ID is invalid", async () => {
  const mockClient = createErrorClient();

  await assertRejects(
    () => retrieveChannelSummary(mockClient, "invalid"),
    Error,
    "Expected error message",
  );
});
```

**Test requirements:**

- Use clear, descriptive test names
- Use mocks to eliminate external dependencies
- Follow the Arrange-Act-Assert pattern
- Cover both normal and error cases

#### 3. Test Coverage

You must cover the following:

- Main processing paths
- Error handling
- Edge cases (empty strings, null, undefined, etc.)
- At minimum, include one normal case and one error case

### File Structure

```
functions/get_channel_info/
├── mod.ts          # Function implementation (with JSDoc)
└── test.ts         # Tests (normal and error cases)
```

### Reference Example

See `functions/get_channel_info/` for an implementation example. Use this
directory as a reference when creating new functions.

### Detailed Documentation

- Testing details: [`docs/testing-guide.md`](docs/testing-guide.md)
- Internationalization: [`docs/i18n-guide.md`](docs/i18n-guide.md)
- Exception handling:
  [`docs/exception-handling-guide.md`](docs/exception-handling-guide.md)

## Validation (Zod)

This project uses **Zod** for type-safe validation.

### What is Zod?

- A TypeScript-first schema declaration and validation library
- Reduces runtime errors through static type inference
- Simple and readable API

### Basic Usage

#### 1. Using Common Schemas

Use the common schemas defined in `lib/validation/schemas.ts`:

```typescript
import { channelIdSchema } from "../../lib/validation/schemas.ts";

// Validation
const channelId = channelIdSchema.parse(inputs.channel_id);
// Or use safeParse for error handling
const result = channelIdSchema.safeParse(inputs.channel_id);
if (!result.success) {
  throw new Error(result.error.message);
}
```

#### 2. Available Schemas

- **`channelIdSchema`**: Slack channel ID (`C` + uppercase alphanumeric)
- **`userIdSchema`**: Slack user ID (`U/W` + uppercase alphanumeric)
- **`nonEmptyStringSchema`**: Non-empty string

#### 3. Creating Custom Schemas

If you need new validation, add it to `lib/validation/schemas.ts`:

```typescript
export const emailSchema = z.string()
  .email("Invalid email format")
  .toLowerCase();
```

### Type Inference

You can automatically infer types from Zod schemas:

```typescript
import {
  type ChannelId,
  channelIdSchema,
} from "../../lib/validation/schemas.ts";

const channelId: ChannelId = channelIdSchema.parse("C12345678");
```

### i18n Error Messages

Zod error messages are **dynamically internationalized**. Through the
`.superRefine()` implementation, error messages are displayed in the current
locale at validation time:

```typescript
import { channelIdSchema, userIdSchema } from "../../lib/validation/schemas.ts";
import { setLocale } from "../../lib/i18n/mod.ts";

// Validate in English
setLocale("en");
const result1 = channelIdSchema.safeParse("invalid");
// Error: "Channel ID must start with 'C' followed by uppercase alphanumeric characters"

// Switch to Japanese with the same schema instance
setLocale("ja");
const result2 = channelIdSchema.safeParse("invalid");
// Error: "Channel ID must start with 'C' followed by uppercase alphanumeric characters" (in Japanese)

// Switch back to English
setLocale("en");
const result3 = channelIdSchema.safeParse("invalid");
// Error: "Channel ID must start with 'C' followed by uppercase alphanumeric characters"
```

**Implementation features:**

- **Dynamic evaluation**: `.superRefine()` evaluates error messages at each
  validation
- **Default schema support**: `channelIdSchema` etc. automatically respond to
  locale changes
- **No schema recreation needed**: Switch locales on the same instance
- **Environment variable support**: Set default locale via `LOCALE` or `LANG`

**Factory functions (optional):**

Factory functions (`createChannelIdSchema()`, etc.) are provided for backward
compatibility, but since default schemas also respond dynamically, their use is
optional.

### Best Practices

1. **Always validate inputs**: Especially user inputs and API inputs
2. **Reuse common schemas**: Avoid duplication
3. **Use factory functions**: When switching locales at runtime
4. **Use safeParse()**: Simpler error handling without try-catch
5. **i18n error messages**: Always internationalize user-facing messages

### Reference Implementation

See `functions/get_channel_info/mod.ts` for a validation example using Zod.

## Tests and Quality Checks

### Automated Checks (Recommended)

Setting up Git hooks will automatically run checks on commit/push:

```bash
# Run only once
bash scripts/setup-git-hooks.sh
```

**Checks performed:**

- **pre-commit**: Format + Lint (on commit)
- **pre-push**: Format + Lint + Tests (on push)

### Manual Checks

If you don't use Git hooks, **make sure to run the following before pushing:**

```bash
# 1. Format check
deno fmt --check

# 2. Lint check
deno lint

# 3. Run all tests
deno test --allow-all
```

### Notes

- Run all checks before `git commit` and `git push`.
- Local pre-checks are essential to prevent format errors and test failures in
  CI.
- If checks fail, review the logs, fix the issues, and re-run.
- Use mocks for Slack API-dependent parts to maintain stable tests.
- Use `git push --no-verify` to skip hooks only in emergencies (not recommended)

## Commit Message Conventions

- We follow Conventional Commits.
  - Example: `feat: add {category} workflow`
- Please clean up commit history with `git rebase -i` before merging PRs.
