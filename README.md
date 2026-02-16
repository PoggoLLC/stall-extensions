# Stall Extensions Repository

Official Stall Flex Extensions repository.

## Contribution Workflow
Use the extension template in `templates/` as your starter architecture.

1. Fork this repository.
2. Create your own extension repository using the template.
3. In your fork of this repository, add or update the submodule so it points to your extension repository and target commit.
5. Open a pull request from your fork to this repository.

## Submission and Approval Flow
1. Start from the official template architecture.
2. Follow the extension rules and documentation.
3. Submit a PR with your extension repository link and updated submodule pointer.
4. After review and approval, the extension will be published.

## Versioning Requirements
- For every update PR, bump the version in `package.json`.
- The version in `extension.json` must match `package.json`.
- Use clear, incremental version updates so reviews can track releases correctly.

## Pull Request Scope
- Only include changes related to your extension integration.
- Avoid unrelated repository-wide changes.
- Keep PRs focused to your extension code updates, submodule pointer updates, and required version changes.

## Documentation
Read and follow the docs before submitting:

[developer.usestall.com/extensions](https://developer.usestall.com/extensions)

## Important Rules
- Use approved Stall libraries for extension UI, icons, and types.
- Follow the required extension interfaces and structure from the template.
- Keep extension code safe and compliant with review requirements.
