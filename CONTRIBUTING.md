# Contributing Guidelines

`backstage-plugin-ai-assistant` is [Apache 2.0 Licensed](LICENSE) and accepts contributions via
GitHub pull requests. This document outlines some of the conventions on
development workflow, commit message formatting, contact points, and other
resources to make it easier to get your contribution accepted.

Contributions are welcome, and they are greatly appreciated! Every little bit helps, and credit will always be given. ❤️

## Support Channels

The official support channels, for both users and contributors, are:

- GitHub [issues](https://github.com/sweetoburrito/backstage-plugin-ai-assistant/issues)

## How to Contribute

Pull Requests (PRs) are the main and exclusive way to contribute to the project.

## Local setup

### Create a fork

[Fork][fork], then clone the repository:

```sh
git clone git@github.com:your_github_username/backstage-plugin-ai-assistant.git
cd dark
git remote add upstream https://github.com/sweetoburrito/backstage-plugin-ai-assistant.git
git fetch upstream
```

### Install dependencies

```sh
yarn install
```

### Run the plugins locally

A standalone development version of both the frontend and backend plugins are included in this repository.
They can be started as follows:

```sh
yarn podman:up # starts postgresql with pgvector
yarn start # starts both the frontend and the backend in parallel
```

## Making Changes

Start by creating a new branch for your changes:

```sh
git checkout main
git fetch upstream
git rebase upstream/main
git checkout -b new-feature
```

Make your changes, then ensure that `yarn lint`, `yarn tsc` and `yarn test` still pass. If you're satisfied with your changes, push them to your fork.

```sh
git push origin new-feature
```

Then use the GitHub UI to open a pull request.

Your changes are much more likely to be approved if you:

- add tests for new functionality
- commit messages should follow [conventional commit message](https://www.conventionalcommits.org/en/v1.0.0/) format
- maintain backward compatibility
- more information available at [docs](docs)
