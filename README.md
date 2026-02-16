# Stall Extensions Repository

Official Stall Flex Extensions repository.

## Required Repositories
You need two separate repositories when contributing an extension:

1. Your fork of this repository (`stall-extensions`) for opening pull requests.
2. Your own extension code repository (created from the template).

## Contribution Workflow
Use the extension template in `templates/` as your starter architecture.

1. Fork this repository and clone your fork.
```
git clone https://github.com/<your-username>/stall-extensions.git
cd stall-extensions
git submodule update --init --recursive
```

2. Create your own extension repository using the template.

3. In your fork of this repository, add or update the submodule so it points to your extension repository.

Add a new extension submodule:
```
git submodule add https://github.com/<your-username>/my-extension.git extensions/my-extension
git add extensions/my-extension
```

Update an existing extension submodule to the latest commit from its default branch:
```
git submodule update --remote --merge extensions/my-extension
git add extensions/my-extension
```

4. Commit and push changes in your fork, then open a pull request to this repository.

5. In the pull request, include:
- The link to your extension code repository.
- A short summary of what changed.
- Version change details (if this is an update).

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
- Use approved Stall libraries for extension UI, icons, and share external modules. You can check the list at stall.build.ts.
- Follow the required extension interfaces and structure from the template.
- Keep extension code safe and compliant with review requirements.
