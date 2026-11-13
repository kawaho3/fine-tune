# Project Charter

## Vision

Build an independently controlled **AI full-stack web application development platform** that can compete in capability, reliability, and usability with leading AI builders such as Lovable, Replit Agent, and Bolt.new. Market leadership is a goal, not an established fact or a near-term guarantee.

## Problem

Users can generate attractive web mockups quickly, but producing a dependable production-ready system requires connected frontend/backend/database code, testing, secure hosting, change management, and troubleshooting. We want an end-to-end workflow with trustworthy source-code ownership.

## Who we serve

1. Founders and non-specialists wanting a working website/app from plain-language requirements.
2. Developers who want a complete codebase they can inspect, edit, test, export and own.
3. Teams needing collaboration, reproducible deployments, access control, observability and predictable costs.
4. Organizations preferring self-hosted inference or customizable coding models, where technically feasible.

## Outcomes

- Convert a prompt into a complete source project that runs.
- Support follow-up changes without silently breaking previous functionality.
- Provide live previews, code editing, visual editing, logs, tests, and export.
- Add backend APIs, database migrations, authentication, deployments and domains in later releases.
- Make the system modular: app UI, agent, sandbox, model provider, persistence and deployment should be independently replaceable.
- Collect verified coding trajectories for future model improvement only with adequate rights, privacy protections and explicit consent.

## Differentiation hypothesis

Full source ownership; no required paid model API; high-quality full-stack workflows; reproducible debugging; clear usage and deployment costs; strong separation of user code from the platform. This must be validated against customer demand.

## Not goals for v1

Training a base model from scratch; supporting every programming language; building a general-purpose browser OS; reinventing Git, Monaco, Docker, database engines, or auth; automatic deployment to production without approval; promising 100% successful generation.

## Constraints

- Development will primarily use Codex Astra for coding tasks, with human review.
- Avoid wasting Codex credits building functionality already available in suitable public repositories.
- Use one product monorepo with carefully chosen modular dependencies, not multiple app forks smashed together.
- Prefer open-weight/local model capability; paid providers can be optional, not mandatory.
- This repository is public as of the first documentation commit. No confidential materials should be uploaded.

## Decision ownership

Major changes require an architecture decision record, a license/security review, reproducible test criteria, and an updated implementation status. See [docs/decisions](decisions/).