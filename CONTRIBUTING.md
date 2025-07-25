# Contributing to Demo Time

Thank you for your interest in contributing! Please follow these guidelines to help us maintain a
high-quality project.

## Clean Code & Coding Conventions

- Use meaningful variable and function names.
- Keep functions small and focused.
- Remove unused code and comments.
- Follow the existing code style. Run `npm run lint` before submitting.
- Use Prettier for formatting (see `.prettierrc.json`).

## Design Choices

- Document significant architectural or design decisions in `docs/architecture.md`.
- Discuss large changes in an issue before starting work.

## Static Analysis

- All code must pass ESLint checks (`npm run lint`).
- Use TypeScript for type safety.

## Requirements & Documentation

- Reference related issues or requirements in your PR.
- Update documentation (`README.md`, `docs/`, [demotime.show](https://demotime.show)) as needed.

## Git Branching

- Use feature branches: `feature/your-feature`, `issue/your-bug`.
- Do not commit directly to `main`, please create one to the `dev` branch.

## Bug and Issue Tracking

- Report bugs and request features via
  [GitHub Issues](https://github.com/estruyf/vscode-demo-time/issues).
- Reference issue numbers in your commits and PRs.

## Code Reviews

- All PRs require at least one approval before merging.
- Address all review comments.

## Continuous Integration

- CI runs linting and tests on every PR.
- Fix any CI errors before requesting review.

## Releases & Semantic Versioning

- We use [semantic versioning](https://semver.org/).
- Releases are managed by maintainers.

## Licensing

- By contributing, you agree your code will be released under the [MIT License](LICENSE).

---

Thank you for helping make Demo Time better!
