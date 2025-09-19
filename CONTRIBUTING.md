# Contributing to Twilio SMS Tracker

First off, thank you for considering contributing to Twilio SMS Tracker! It's people like you that make this tool better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [support@example.com](mailto:support@example.com).

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a branch for your feature or fix
5. Make your changes
6. Submit a pull request

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and expected**
- **Include screenshots if relevant**
- **Include your environment details**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Provide specific examples to demonstrate the enhancement**
- **Describe the current behavior and expected behavior**
- **Explain why this enhancement would be useful**

### Your First Code Contribution

Unsure where to begin? Look for these labels in our issues:

- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `documentation` - Improvements or additions to documentation

## Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Git

### Local Development

```bash
# Fork and clone the repository
git clone https://github.com/your-username/twilio-sms-tracker.git
cd twilio-sms-tracker

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your local configuration

# Set up database
createdb sms_tracker_dev
psql -d sms_tracker_dev -f database/migrations/001_initial_schema.sql

# Run development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint
```

### Testing

Before submitting a pull request:

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "Dashboard"

# Run with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck
```

## Style Guidelines

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- Consider using [Conventional Commits](https://www.conventionalcommits.org/)

Examples:
```
feat: Add webhook retry mechanism
fix: Resolve dashboard loading issue
docs: Update API documentation
test: Add tests for SMS service
refactor: Simplify database queries
```

### JavaScript/TypeScript Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Add JSDoc comments for functions

Example:
```typescript
/**
 * Sends an SMS message to the specified phone number
 * @param phoneNumber - The recipient's phone number
 * @param message - The message content
 * @returns Promise with the message status
 */
async function sendSMS(phoneNumber: string, message: string): Promise<MessageStatus> {
  // Implementation
}
```

### CSS Style

- Use CSS variables for colors and common values
- Follow BEM naming convention for classes
- Mobile-first responsive design
- Avoid !important unless absolutely necessary

## Pull Request Process

1. **Fork and Create Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clear, readable code
   - Add tests for new features
   - Update documentation as needed

3. **Commit Changes**
   ```bash
   git commit -m "feat: Add amazing feature"
   ```

4. **Run Tests**
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```

5. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template
   - Link related issues

7. **Code Review**
   - Address reviewer feedback
   - Make requested changes
   - Push updates to the same branch

### Pull Request Requirements

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)
- [ ] No merge conflicts
- [ ] Follows code style guidelines

## Project Structure

```
twilio-sms-tracker/
├── api/                 # API endpoints
│   └── index.ts        # Main API file
├── public/             # Frontend files
│   ├── index.html      # Dashboard
│   ├── analytics.html  # Analytics page
│   ├── messages.html   # Message config
│   └── settings.html   # Settings page
├── src/                # Source code
│   ├── services/       # Business logic
│   ├── utils/          # Utilities
│   └── types/          # TypeScript types
├── database/           # Database files
│   └── migrations/     # SQL migrations
├── tests/              # Test files
│   ├── unit/          # Unit tests
│   └── integration/   # Integration tests
└── docs/              # Documentation
```

## Documentation

- Update README.md for user-facing changes
- Update inline code comments
- Update API documentation for endpoint changes
- Add JSDoc comments for new functions
- Update environment variables in .env.example

## Release Process

We use [Semantic Versioning](https://semver.org/):

- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible functionality
- PATCH version for backwards-compatible bug fixes

## Getting Help

- **Discord**: [Join our server](https://discord.gg/example)
- **GitHub Discussions**: Ask questions and share ideas
- **Stack Overflow**: Tag questions with `twilio-sms-tracker`
- **Email**: support@example.com

## Recognition

Contributors are recognized in:
- README.md contributors section
- CHANGELOG.md for significant contributions
- GitHub contributors page
- Release notes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to contact the maintainers if you have any questions. We're here to help!

Thank you for contributing! 🎉