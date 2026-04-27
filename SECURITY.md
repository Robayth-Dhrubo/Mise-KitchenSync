# Security Policy

## Supported Versions

Only the latest version of Mise KitchenSync is currently supported for security updates. 

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of our system seriously. If you find a vulnerability, please report it via the following process:

1. **Do not disclose publicly**: Please avoid opening public issues for security vulnerabilities.
2. **Email Disclosure**: Send an email to `security@mise-kitchensync.example.com` (placeholder) with a detailed description of the vulnerability, steps to reproduce, and any potential impact.
3. **Acknowledgment**: We will acknowledge your report within 48 hours and provide a timeline for a fix.

## Security Practices

- **Secret Management**: Never commit secrets to the repository. Use environment variables defined in `.env.local` or your CI/CD platform.
- **Dependency Audits**: We run `npm audit` regularly to catch known vulnerabilities in downstream packages.
- **Mock Data**: When `OPENAI_API_KEY` or `GOOGLE_PLACES_API_KEY` are missing, the system may fall back to mock data for demonstration purposes. This is indicated in the UI and should not be used for production financial decisions.
