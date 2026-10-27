# Personal Dashboard — Command Centre

## About the project

Command Centre is a personal dashboard I am developing to organise my work in one place. The aim is to manage tasks, projects, notes, ideas, meetings, calendar events and reminders without needing several separate tools.

I am building this project both as a useful personal application and as a way to practise what I am learning in cloud computing and cybersecurity. I want to understand how the application works, how it communicates with its database, how it can be deployed, and how personal information can be protected.

I have also worked on an earlier project called **Splash**, where I gained some experience with Supabase. I am building on that experience while learning more about the architecture, security and deployment of a larger application.

## Features

The project is intended to support:

- Tasks and projects
- Notes and ideas
- Calendar events and meetings
- Reviews and reminders
- Search across information
- Data export
- Account and personal settings

This project is still under development. A feature being listed here does not automatically mean it has been fully tested or verified in a deployed environment.

## Technologies

- **Next.js and React:** Application pages and server-side functionality.
- **TypeScript:** Types that help identify certain coding mistakes.
- **Supabase:** Authentication and managed database services.
- **PostgreSQL:** Storing and relating application data.
- **Vitest:** Unit testing.
- **Playwright:** Browser-based testing.
- **Vercel:** Intended hosting platform.

## Cloud computing

I am using this project to learn how a web application connects to a managed database, how environment variables are configured, and how an application can be built and deployed.

The reminder functionality also gives me an opportunity to learn about scheduled jobs and background processing.

I still need to verify and document the behaviour of the deployed application and its background services rather than assume that a successful build proves everything works.

## Cybersecurity

Security is important because the application stores personal information.

The application is designed to use authentication, server-side validation, database access policies and server-side environment variables to restrict access and protect data.

I am learning how these controls work together and how to test them. I do not consider a security control verified until I have examined its implementation and, where possible, tested its behaviour.

## Learning and AI assistance

I am using this project to improve my programming and technical problem-solving skills. My goal is to understand the code rather than rely on code that I cannot explain.

Some parts of the application use concepts that are more advanced than my current level. For those parts, I have used AI assistance to help me understand the purpose of the implementation, how it works and why certain approaches are used.

I understand the intended function of these parts, but I may not yet be able to recreate every implementation independently. My plan is to revisit the more complicated sections and rebuild them step by step, using explanations, documentation and testing to develop the skills to implement them without relying on AI to write the code for me.

AI assistance is a learning aid, not a substitute for understanding or testing the application. I will follow my course requirements and disclose assistance as required by my institution.

## Testing

The repository includes commands for type checking, linting, unit tests, building the application and running browser tests.

These checks have different purposes. A successful build does not prove that every feature works correctly or that the application is secure.

I will record which checks have passed, failed or could not be run, along with any limitations that remain. Browser tests that require owner credentials need the relevant test environment to be configured.

## Running locally

You will need Node.js, npm and the required Supabase configuration.

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Configure the required environment variables using the setup documentation.
4. Start the development server with `npm run dev`.

See [docs/SETUP.md](docs/SETUP.md) for configuration details.

Never commit real credentials, API keys or other secrets to the repository.

## Available commands

```bash
npm run dev       # Start the local development server
npm run typecheck # Check TypeScript types
npm run lint      # Run ESLint
npm test          # Run unit tests
npm run build     # Build the application
npm run e2e       # Run Playwright browser tests
```

## Current status

Command Centre is a work in progress. I am continuing to verify its features, improve the tests and deepen my understanding of its cloud and security design.

## What I want to learn

Through this project, I want to improve at:

- Building and debugging web applications.
- Working with databases and authentication.
- Deploying and configuring cloud services.
- Applying and testing access controls.
- Writing useful automated tests.
- Investigating technical problems and explaining my design decisions.
