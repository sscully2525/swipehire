# Security Policy

## Reporting a Vulnerability

If you believe you have found a security vulnerability in SwipeHire,
please report it privately rather than opening a public issue.

**Contact:** `security@<your-domain>` *(placeholder — replace with a real
monitored address before publishing this repository)*

When reporting, please include:

- A clear description of the issue and its impact
- Steps to reproduce (proof-of-concept where possible)
- Affected versions / commit hashes
- Any suggested mitigation

## Disclosure Process

1. We will acknowledge your report within **5 business days**.
2. We will investigate and confirm the issue, and keep you updated on progress.
3. We aim to ship a fix and coordinated disclosure within **90 days** of the
   initial report. Critical issues are prioritized for faster turnaround.
4. With your permission, we will credit you in release notes.

## Scope

In scope:

- The `server/`, `client/`, and `mobile/` source trees
- Deployment configuration in `docker-compose*.yml`, `nginx*.conf`,
  `railway.json`, and `deploy.sh`
- Authentication, authorization, payments (Stripe), and data-access paths

Out of scope:

- Vulnerabilities in third-party services we depend on (report to them)
- Self-XSS or attacks requiring an already-compromised account
- Reports from automated scanners with no demonstrated impact

## Supported Versions

Only the `main` branch is actively patched. Older tags receive fixes only
for critical issues.
