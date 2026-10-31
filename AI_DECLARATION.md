# AI Usage Declaration

**Project:** Smart Transit & Crowdsourcing Engine  
**Project Type:** Hackathon MVP  
**Repository:** https://github.com/OrkhanAsgarli/smart-transit  
**Date:** October 31, 2026

## 1. Declaration of AI Assistance

We declare that artificial intelligence tools were used during the planning, development, debugging, documentation, and testing preparation of the Smart Transit & Crowdsourcing Engine project.

AI was utilized as a development assistant to accelerate implementation, support technical decision-making, identify potential errors, and improve software development efficiency within the hackathon's time constraints.

AI-assisted development did not replace the need for human decision-making, implementation oversight, or functional verification.

## 2. AI Tools Used

**ChatGPT (OpenAI)**

Used for:

- System architecture planning and MVP feature prioritization.
- Generating and refining Next.js, React, and TypeScript code.
- Assisting with Prisma and PostgreSQL database integration.
- Developing GPS simulation and ETA calculation logic.
- Supporting passenger crowd-reporting functionality.
- Designing operator analytics and anomaly-detection logic.
- Diagnosing TypeScript errors and API integration issues.
- Preparing Docker configuration guidance and technical documentation.

**Other AI development tools**

Any additional AI tools used to modify the repository, including Claude or Claude Code, should be listed here with their actual contributions before final submission.

## 3. Human Contribution and Responsibility

The development team was responsible for defining the project objectives, selecting the technologies, configuring the local development environment, executing commands, integrating code into the repository, examining results, and making implementation decisions.

The team also performed manual verification of the database, REST APIs, GPS simulation, and selected functional scenarios.

All AI-generated or AI-assisted code remains subject to developer review and validation. The team retains responsibility for the final submitted project.

## 4. AI-Assisted Development Workflow

The project followed an iterative development workflow:

1. **Requirement analysis:** Hackathon requirements were translated into four core functional modules.
2. **Architecture design:** A modular application architecture was selected using Next.js, TypeScript, Prisma, PostgreSQL, and Docker.
3. **Implementation support:** AI assisted in generating code for passenger tracking, crowd reporting, operator analytics, and anomaly detection.
4. **Debugging:** Compiler errors, database integration problems, and API inconsistencies were reviewed and addressed.
5. **Verification:** Developers executed commands and examined actual responses from the running application.
6. **Documentation:** AI assisted in preparing setup instructions, architecture documentation, and this declaration.

This process supported rapid development while maintaining human oversight.

## 5. Verification and Evidence

The following activities were manually performed during development:

| Component | Verification evidence |
|---|---|
| Database | PostgreSQL container health and database table inspection |
| Transit data | Import of 3,456 named stop records and 103 route-stop associations |
| GPS simulation | Successful simulation API response containing vehicle coordinates |
| ETA | Successful response for a selected vehicle and bus stop |
| Crowd Reporting | Successful POST request and corresponding PostgreSQL record |
| Operator Analytics | Successful API response containing route-level occupancy statistics |
| Anomaly Detection | Synthetic sustained-high scenario detected; insufficient-evidence scenario rejected |
| Docker | Successful application image build and container startup |

These results demonstrate the tested functionality listed above. They should not be interpreted as proof that every possible scenario or deployment environment has been validated.

## 6. AI and Anomaly Detection

The Smart Transit application includes a rule-based anomaly detection component designed to identify sustained high passenger density and recommend the dispatch of a reserve bus.

AI-assisted development tools contributed to the design and implementation of this component.

However, the runtime detector itself is **not a machine-learning model**. It uses transparent, deterministic rules based on passenger-submitted observations, time intervals, report proportions, and minimum evidence requirements.

This distinction is important: the use of AI during software development does not imply that every application feature uses AI during execution.

## 7. Data Transparency

The application combines different data sources:

- **Transit reference data:** A third-party snapshot derived from Azerbaijan public transportation information.
- **Vehicle positions:** Simulated GPS coordinates used for demonstration and testing.
- **Passenger reports:** User-submitted occupancy observations, initially treated as unverified.
- **Anomaly demonstrations:** Explicitly labeled synthetic scenarios used to validate detection logic.

Simulated GPS coordinates and synthetic test observations are not presented as verified real-world measurements.

## 8. Limitations

AI-generated suggestions and code may contain mistakes and require review.

The project is a hackathon MVP rather than a fully production-certified transportation system. Its limitations include approximate ETA calculations, simulated vehicle movement, demo authentication, limited reporting verification, and the need for further reliability and security testing.

No claim is made that AI-generated code is automatically correct, secure, or production-ready.

## 9. Final Statement

Artificial intelligence was used as a purposeful software engineering assistant throughout the development of Smart Transit & Crowdsourcing Engine.

Its main value was accelerating development, helping solve technical problems, supporting modular implementation, and improving the documentation and verification process.

The final project represents a combination of **human-defined objectives, developer oversight, AI-assisted implementation, and manually observed test results**.

We affirm that the AI assistance described in this declaration is disclosed transparently and that the project is presented according to its actual implementation and verified capabilities.