# Confluence Bootstrap Migration Report

- Requirements: 91
- Requirements with automated anchors: 53
- Requirements awaiting an automated anchor: 38
- Decisions: 10
- Pending decisions: 1
- Architecture contracts: 10
- Pending architecture contracts: 3
- Obsolete intents: 3
- PRD SHA-256: `a00a123284a13c23806aa6a9c391d4981b9e91a3d04a00065f776ea26c36441b`
- Engineering SHA-256: `0d73e2a9778228b80b8c1366574d6aa2fe72def3504275b9a7ec585d7f14f7fa`
- Requirements SHA-256: `dfaa67c82a8789276313c6899ef31b98c0c47f78052de5dc8eef4b1a391da4f7`
- Decisions SHA-256: `0fa2dfc9a5dd64dac87f3fec79f7095da5fadd5dbc9787a88aed8b5fdcf2ce0c`
- Architecture SHA-256: `3d19157eeb4ec1cefb2635742eb3465a17b073c8220f361f0e34e0f62b69e4d6`
- Obsolete SHA-256: `3733de65efd1c7f65977fad715e0237d7bf9a49bbcac00f37610dd864ac0b492`

## Explicit migration gaps

- Requirements without a trustworthy automated anchor remain `TODO: GWT`; no coverage was fabricated.
- DEC-008 stays Pending because the repository has no top-level code license file.
- ARCH-007, ARCH-008, and ARCH-009 stay Pending until their documented auth/moderation, security/observability, and recovery contracts are fully verified.
- The production build succeeds but swagger-jsdoc reports invalid Module #0 route annotations; ARCH-003 remains approved for the layered contract, while the annotation drift must be corrected separately.
- Confluence page IDs are published and persisted in `docs/confluence-spec/config.json`.

No Confluence page has been created by this command.
