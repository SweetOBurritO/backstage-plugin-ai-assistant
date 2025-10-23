# Contributing to Backstage AI Assistant Plugin

Thank you for your interest in contributing to the Backstage AI Assistant plugin! We welcome contributions from the community and appreciate your efforts to improve the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Issue Guidelines](#issue-guidelines)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Ways to Contribute

- **Report bugs**: Submit detailed bug reports with reproduction steps
- **Suggest features**: Propose new features or enhancements
- **Improve documentation**: Fix typos, clarify instructions, add examples
- **Write code**: Fix bugs, implement features, optimize performance
- **Review pull requests**: Help review and test changes from other contributors
- **Answer questions**: Help other users in discussions and issues

### Before You Start

1. **Check existing issues**: Search for similar issues or feature requests
2. **Read the documentation**: Familiarize yourself with the [architecture](./docs/architecture.md)
3. **Discuss major changes**: Open an issue to discuss significant changes before implementing
4. **Review open PRs**: Avoid duplicating work already in progress

## Development Setup

### Prerequisites

- **Node.js**: Version 20 or 22 (LTS recommended)
- **Yarn**: Version 1.22+ (package manager)
- **PostgreSQL**: Version 12+ with pgvector extension
- **Git**: For version control

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/backstage-plugin-ai-assistant.git
   cd backstage-plugin-ai-assistant
   ```

3. **Add upstream remote**:

   ```bash
   git remote add upstream https://github.com/SweetOBurritO/backstage-plugin-ai-assistant.git
   ```

4. **Install dependencies**:

   ```bash
   yarn install
   ```

5. **Set up PostgreSQL**:

   ```bash
   # Create database
   createdb backstage

   # Enable pgvector extension
   psql backstage -c "CREATE EXTENSION vector;"
   ```

6. **Configure the environment**:

   - Copy `app-config.yaml` to `app-config.local.yaml`
   - Add your API keys and configuration
   - See [Configuration Guide](./docs/configuration.md) for details

7. **Start the development environment**:
   ```bash
   yarn start
   ```

### Project Structure

```
backstage-plugin-ai-assistant/
├── plugins/
│   ├── ai-assistant/                    # Frontend plugin
│   ├── ai-assistant-backend/            # Backend core
│   ├── ai-assistant-common/             # Shared types
│   ├── ai-assistant-node/               # Backend interfaces
│   └── ai-assistant-backend-module-*/   # Backend modules
├── docs/                                # Documentation
├── app-config.yaml                      # Default configuration
└── package.json                         # Root package config
```

## How to Contribute

### 1. Create a Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### Branch Naming Convention

- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clean, readable code
- Follow the [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 3. Test Your Changes

```bash
# Run all tests
yarn test

# Run tests for specific plugin
yarn workspace @sweetoburrito/backstage-plugin-ai-assistant-backend test

# Run linting
yarn lint:all

# Run type checking
yarn tsc

# Format code
yarn prettier:write
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "type: brief description"
```

See [Commit Message Guidelines](#commit-message-guidelines) for details.

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Coding Standards

### TypeScript Style

- **Use TypeScript**: All code should be written in TypeScript
- **Strict mode**: Enable strict type checking
- **Interfaces over types**: Prefer interfaces for object shapes
- **Explicit types**: Avoid implicit `any`
- **Naming conventions**:
  - `PascalCase` for types, interfaces, classes
  - `camelCase` for variables, functions, methods
  - `UPPER_CASE` for constants
  - Prefix interfaces with `I` only when necessary for clarity

### Code Style

We use Prettier and ESLint for code formatting and linting:

```bash
# Format all files
yarn prettier:write

# Check linting
yarn lint:all

# Fix linting issues
yarn lint:all --fix
```

**Key principles**:

- Write self-documenting code with clear variable names
- Keep functions small and focused (single responsibility)
- Avoid deep nesting (max 3-4 levels)
- Use async/await over promises
- Handle errors explicitly
- Add JSDoc comments for public APIs

### Example Code Style

```typescript
/**
 * Retrieves similar documents from the vector store.
 *
 * @param query - The search query text
 * @param options - Search options including limit and filters
 * @returns Array of similar documents with scores
 */
async function searchSimilarDocuments(
  query: string,
  options: SearchOptions,
): Promise<DocumentResult[]> {
  try {
    const embeddings = await generateEmbeddings(query);
    const results = await vectorStore.similaritySearch(embeddings, options);
    return results;
  } catch (error) {
    throw new Error(`Failed to search documents: ${error.message}`);
  }
}
```

## Testing Guidelines

### Test Requirements

- **New features**: Must include unit tests
- **Bug fixes**: Should include regression tests
- **API changes**: Require integration tests
- **Coverage**: Aim for >80% code coverage

### Test Structure

```typescript
import { mockServices } from '@backstage/backend-test-utils';

describe('ChatService', () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService({
      logger: mockServices.logger.mock(),
      database: mockServices.database.mock(),
    });
  });

  describe('sendMessage', () => {
    it('should send a message and return response', async () => {
      // Arrange
      const message = 'Hello, AI!';

      // Act
      const response = await chatService.sendMessage(message);

      // Assert
      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
    });

    it('should handle errors gracefully', async () => {
      // Test error scenarios
    });
  });
});
```

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test --watch

# Run tests with coverage
yarn test --coverage

# Run specific test file
yarn test ChatService.test.ts
```

## Pull Request Process

### Before Submitting

1. ✅ **Tests pass**: All tests should pass locally
2. ✅ **Linting passes**: No linting errors or warnings
3. ✅ **Documentation updated**: Update relevant docs
4. ✅ **Changelog updated**: Add entry to CHANGELOG.md (if applicable)
5. ✅ **Types are correct**: TypeScript compiles without errors
6. ✅ **Branch is up-to-date**: Rebase on latest main

### Pull Request Template

When creating a PR, provide:

- **Clear title**: Brief description of the change
- **Description**: What and why you changed
- **Related issues**: Link to related issues (Fixes #123)
- **Screenshots**: For UI changes, include before/after screenshots
- **Testing**: Describe how you tested the changes
- **Breaking changes**: Note any breaking changes

### Review Process

1. **Automated checks**: CI/CD must pass
2. **Code review**: At least one maintainer approval required
3. **Testing**: Reviewers may test changes locally
4. **Feedback**: Address review comments promptly
5. **Merge**: Maintainers will merge approved PRs

### After PR is Merged

- Delete your feature branch
- Update your fork's main branch
- Close related issues (if not auto-closed)

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```
feat(chat): add streaming response support

Implement server-sent events for real-time streaming of AI responses.
This improves user experience by showing partial responses as they're generated.

Fixes #123
```

```
fix(vector-store): correct similarity search scoring

The similarity search was returning incorrect scores due to inverted distance calculation.
Changed to use cosine similarity for more accurate results.
```

```
docs(deployment): add Kubernetes deployment guide

Added comprehensive Kubernetes deployment instructions including:
- Deployment manifests
- Service configuration
- Ingress setup
```

### Commit Best Practices

- Use imperative mood ("add" not "added")
- Keep subject line under 72 characters
- Capitalize first letter
- No period at the end of subject
- Separate subject from body with blank line
- Wrap body at 72 characters
- Use body to explain what and why, not how

## Issue Guidelines

### Bug Reports

When reporting a bug, include:

- **Description**: Clear description of the issue
- **Steps to reproduce**: Detailed steps to recreate the bug
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: Versions, OS, configuration
- **Logs**: Relevant error messages or logs
- **Screenshots**: If applicable

### Feature Requests

When requesting a feature, include:

- **Use case**: Why is this feature needed?
- **Proposed solution**: How should it work?
- **Alternatives**: Other solutions you've considered
- **Additional context**: Any other relevant information

### Questions

For questions:

- Check existing documentation first
- Search closed issues
- Provide context about what you're trying to achieve
- Include relevant configuration or code snippets

## Community

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, general discussion
- **Pull Requests**: Code review and contributions

### Getting Help

- Review the [documentation](./docs/README.md)
- Check the [troubleshooting guide](./docs/troubleshooting.md)
- Search existing [issues](https://github.com/SweetOBurritO/backstage-plugin-ai-assistant/issues)
- Open a new issue with details

### Recognition

We value all contributions! Contributors will be:

- Listed in the repository contributors
- Mentioned in release notes (for significant contributions)
- Recognized in the community

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](./LICENSE)).

---

## Questions?

If you have questions about contributing, please:

1. Check this guide and the documentation
2. Search existing issues and discussions
3. Open a new discussion or issue

Thank you for contributing to the Backstage AI Assistant plugin! 🚀
