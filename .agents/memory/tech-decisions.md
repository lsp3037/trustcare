---
type: project
created: 2026-07-18
updated: 2026-07-18
---

# Technical Decisions

- Component metadata uses SemVer while the toolkit release keeps CalVer.
- `manifest.json` and `manifest.lock.json` must remain synchronized with component frontmatter.
- `client_equipments` supports optional hardware specifications (`processor`, `ram`, `storage`, `gpu_type`, `gpu_model`) with resilient fallback when remote DB migration is pending.
- Service items added in work orders automatically append formatted service descriptions into `technicalReport`.
