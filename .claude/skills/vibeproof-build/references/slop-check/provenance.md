# Bundled slop-check

Version: upstream local skill 2.0.0, Vibeproof integration 1, snapshotted 2026-10-27.
Source: the owner's supplied slop-check skill, declared MIT in its original frontmatter.
This bundle is copied with Vibeproof's existing skill directories for both supported adapters;
installation never reads a personal home directory or fetches an upstream update.

The shared workflow and all five referenced resources are retained. Original third-party MIT notices
are in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt), with source lineage in
[references/sources.md](references/sources.md). Russian language material is retained in its source
language; surrounding Vibeproof integration instructions are English.

Adaptations: the entry file is named `workflow.md` to load as a conditional resource of
`vibeproof-build`, preserving five discoverable core workflow skills; Russian catalogue references
point to that entry. A named personal-project English-dialect example was removed so another project
does not inherit it. Files use LF. The shared workflow's fact/voice protections override categorical
catalogue wording; marker frequencies and model attributions are editorial heuristics, not measured
authorship evidence. No scripts or third-party design code are added by this integration.
