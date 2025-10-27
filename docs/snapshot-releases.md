# Snapshot Releases

Snapshot releases allow you to publish pre-release versions of packages to npm without merging a changeset PR. These are useful for testing changes before an official release.

## What are Snapshot Releases?

Snapshots are temporary, timestamped versions published to npm under a custom tag (not `latest`). They:

- Don't require a changeset PR to be merged
- Generate unique versions like `1.2.3-snapshot-20251027120000`
- Are published under a custom npm tag (e.g., `snapshot`, `beta`)
- Won't affect users installing the `latest` version
- Are perfect for testing unreleased changes

## Publishing Snapshots via GitHub Actions

### Prerequisites

Ensure the `NPM_TOKEN` secret is configured in your repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add `NPM_TOKEN` with an npm access token that has publish permissions

### Manual Trigger

1. Navigate to the **Actions** tab in your repository
2. Select the **"Publish Snapshot Release"** workflow
3. Click **"Run workflow"**
4. Click the **"Run workflow"** button

The workflow will:

- Build all packages
- Create snapshot versions with timestamps (format: `1.2.3-snapshot-timestamp`)
- Publish to npm under the `snapshot` tag

## Installing Snapshot Releases

Users can install snapshot releases using:

```bash
# Install the latest snapshot
npm install @sweetoburrito/package-name@snapshot

# Install a specific snapshot version
npm install @sweetoburrito/package-name@1.2.3-snapshot-20251027120000

# Using yarn
yarn add @sweetoburrito/package-name@snapshot
```

## Snapshot Workflow for Contributors

### For Maintainers

1. Review a PR that needs testing
2. Trigger the snapshot workflow from the Actions tab
3. Share the snapshot version with testers
4. Once validated, proceed with normal changeset → merge → release flow

### For Fork Contributors

Fork contributors **cannot** trigger snapshot releases in the main repository due to security restrictions (secrets are not shared with forks).

If you need to test changes from a fork:

1. Ask a maintainer to trigger a snapshot release
2. Or set up your own npm account and publish from your fork:
   - Add your own `NPM_TOKEN` to your fork's secrets
   - Modify package names/scope in your fork
   - Run the snapshot workflow in your fork

## Snapshot vs. Regular Release

| Feature | Snapshot Release | Regular Release |
|---------|-----------------|-----------------|
| **Requires changeset PR** | ❌ No | ✅ Yes |
| **Version format** | `1.2.3-snapshot-timestamp` | `1.2.3` |
| **npm tag** | Custom (e.g., `snapshot`) | `latest` |
| **Affects default installs** | ❌ No | ✅ Yes |
| **Permanent** | ⚠️ Can be deprecated | ✅ Yes |
| **Use case** | Testing/validation | Official releases |

## Best Practices

1. **Clean up old snapshots**: Periodically deprecate/unpublish old snapshot versions to avoid clutter
2. **Document in PRs**: When sharing snapshots, document the version in PR comments
3. **Don't rely on snapshots long-term**: They're meant for temporary testing, not production use
4. **Test before official release**: Use snapshots to validate changes before merging changesets

## Troubleshooting

### Workflow fails with authentication error

- Verify `NPM_TOKEN` secret is set correctly
- Ensure the token has publish permissions for the packages
- Check that the token hasn't expired

### Packages not published

- Check the workflow logs for errors
- Ensure all packages build successfully
- Verify package access settings in npm (public vs. restricted)

### Cannot install snapshot version

- Ensure you're using the correct tag: `@snapshot`, not `@latest`
- Verify the package was actually published (check npm registry)
- Check npm registry URL if using a private registry

## Related Documentation

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Contributing Guide](../CONTRIBUTING.md)
