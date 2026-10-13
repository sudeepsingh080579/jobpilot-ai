# JobPilot AI — Master Build Specification (source of truth)

> Provided by Sudeep Singh on 2026-10-13 (chat message t31u).
>
> **Transcription gap:** the copy of the prompt available to the build agent was
> truncated in transit; about 24,100 characters in the middle (from the end of
> section 3 "Paid subscription" through the start of section 25 "Phase 5") were
> not received. The text below is verbatim for every part that was received.
> The missing part (sections 4–24, including section 4 onboarding, section 15
> subscription states and section 20 data model) must be pasted in by the
> owner at the marker below. Until then, docs/ARCHITECTURE.md records how each
> of those sections was interpreted from the summary given to the build agent.

---

MASTER BUILD PROMPT: Build an AI-Powered Job Search SaaS Platform for India

1. Your role

Act as a principal software architect, senior full-stack engineer, AI product engineer, UX/UI designer, SaaS product manager, security engineer, and DevOps engineer.

Your mission is to design, build, test, and prepare for production a complete, subscription-based AI career platform for job seekers in India.

Use the publicly accessible website https://trial.nxtjob.ai/ as a product-reference target. Also review relevant publicly available pages on https://nxtjob.ai/ to understand its advertised capabilities.

Explore the reference website directly before implementing the product. If a login, trial account, or access restriction prevents inspection, clearly document that limitation. Use only information legitimately available to you.

Build an original product inspired by the reference platform's functionality and quality. Do not copy its branding, proprietary content, private APIs, or exact visual design.

Important: This is a software-building assignment, not a request for a product plan. Create the working application, execute it, test it, and fix the issues you discover.

2. Product vision

Build an intuitive AI job-search assistant that helps Indian professionals manage their entire job search from one place.

The platform should help users:

- Upload and analyze their existing resume.
- Define their preferred job locations and work arrangements.
- Discover relevant, current job opportunities.
- Rank jobs by how well they match the candidate.
- Tailor resumes and cover letters to specific jobs.
- Find relevant recruiters and networking opportunities.
- Generate personalized outreach and referral-request messages.
- Improve their LinkedIn profiles.
- Prepare for interviews using AI.
- Evaluate salary expectations and prepare for negotiations.
- Track job applications and follow-up activities.
- Understand their job-search progress through analytics.

The product must feel like a personal AI career assistant, not a complicated enterprise dashboard.

Target users include fresh graduates, experienced professionals, mid-career managers, technology professionals, and senior executives in India.

3. Business model and pricing

Implement the following commercial model.

Free trial

- Seven calendar days of free access, beginning when the user activates their account.
- Clearly display the remaining trial days.
- Explain the included features and any usage limits before the user starts.
- Do not charge users automatically without the required payment authorization and transparent disclosure.
- Decide and implement a clear trial policy: the preferred default is to allow exploration without payment details, then require an explicit subscription purchase when the trial ends.
- If a payment mandate is collected for a future recurring charge, clearly disclose the amount, timing, authorization terms, and cancellation process.

Paid subscription

- Price: ₹2,000 INR per month.
- Display prices in Indian rupees.
- Show applicable GST and the final payable amount clearly before checkout.
- Provide invoices and payment history.
- Support subscription renewal, cancellation, failed payments, and payment-status notifications.
- Provide a subscription management page.
- If a user cancels, retain paid access until the end of the applicable paid period, unless the terms or payment rules require otherwise.
- Never charge users twice for the same billing period.
- Keep subscription access enforcement on the server, not only in the frontend.

Use Razorpay as the preferred Indian payment integration, subject to account eligibility and support for the chosen subscription flow. Keep the payment integration modular so another provider can be substituted later.

Use official payment APIs, verified webhooks, signature verification, idempotency, and server-side payment reconciliation.

Never put payment s

<!-- ===== MISSING TEXT (~24,100 characters, sections 3 tail through 25 Phase 4) — owner to paste here ===== -->

and alerts.

Phase 5: Implement monetization

- Seven-day trial.
- ₹2,000 monthly plan.
- Checkout and payment integration.
- Webhooks and reconciliation.
- Subscription enforcement.
- Billing and cancellation management.

Phase 6: Production readiness

- Admin portal.
- Security checks.
- Automated tests.
- Accessibility and responsive design.
- Deployment configuration.
- Documentation.

You may reorder tasks when dependencies require it, but preserve the stated product requirements.

26. How you must work

Do not stop after creating a landing page or a static prototype.

Do not create a collection of nonfunctional buttons.

Do not substitute mock responses for production integrations without clearly identifying them.

For every feature, identify whether it is:

- Fully implemented and tested.
- Implemented but awaiting credentials or external configuration.
- Partially implemented.
- Not implemented.

When an API key or external account is unavailable, create the integration interface, configuration instructions, appropriate error handling, and tests using safe mocks. Do not pretend the integration works with real data.

If the environment supports file creation and terminal commands:

- Create the actual project files.
- Install dependencies.
- Run database migrations where possible.
- Start the application.
- Run tests and a production build.
- Fix errors before reporting completion.

If you cannot execute commands or access the necessary environment, provide the exact files, commands, and steps needed, and explicitly identify what you could not verify.

Make sensible technical decisions independently. Ask me questions only when a missing decision genuinely blocks progress.

27. Acceptance criteria

The product is not ready to declare complete until:

1. A user can register, log in, and securely log out.
2. A user can upload and review a real resume.
3. A user can select up to 10 preferred locations.
4. Remote, hybrid, and on-site selections support multiple choices.
5. Full-time, part-time, and contract selections support multiple choices.
6. Preferences are saved and editable.
7. The seven-day trial starts and expires correctly.
8. The ₹2,000 monthly subscription is correctly represented in the billing system.
9. Payment events are verified and processed idempotently.
10. Access is enforced on the server.
11. Real job-source integrations return verifiable listings when configured.
12. Job matches explain their reasoning.
13. Resume tailoring preserves candidate facts.
14. Users can save jobs and track applications.
15. AI features handle failures gracefully.
16. Users cannot access other users' private records.
17. Users can manage their subscription and privacy settings.
18. The main workflows work on mobile and desktop.
19. Automated tests pass.
20. Production build and deployment instructions are complete.

28. Final deliverables

At completion, provide:

1. The working source code.
2. A clear project folder structure.
3. Database schema and migrations.
4. .env.example.
5. Setup and local-development instructions.
6. Automated tests and their results.
7. A list of implemented features.
8. A list of incomplete features and external dependencies.
9. Payment setup instructions.
10. AI-provider configuration instructions.
11. Job-data provider configuration instructions.
12. Deployment instructions.
13. Security and privacy checklist.
14. Estimated monthly operating costs with assumptions.
15. A prioritized roadmap for future improvements.

Begin by inspecting the reference product, assessing the development environment, and then building the application. Deliver working code in small, testable increments rather than generating an enormous unverified code dump.

Final instruction: Prioritize a genuinely useful, trustworthy, polished product that Indian job seekers can understand and use without technical knowledge. Build the simplest excellent experience first, then expand it without sacrificing reliability or usability.
