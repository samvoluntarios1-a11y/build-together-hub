# Guía de Agente

Este proyecto utiliza un sistema de gestión de voluntarios para construcción.

## Pautas de Desarrollo

- Mantener la identidad visual de "Voluntarios LDC".
- Asegurar que el formulario público no requiera autenticación.
- Respetar las políticas de seguridad RLS en la base de datos.
- Las funciones de servidor deben manejar la lógica sensible.

- Classify authentication failures in `src/lib/auth-errors.ts`; keep provider details out of the UI and distinguish credential, confirmation, connection, and rate-limit failures.
- Public account signup never grants staff roles; staff access continues to use protected role rows.
- The existing protected layout is client-only and verifies users with Auth before reading roles, because SSR cannot access browser-persisted sessions.
- Read accommodation and flexible rules independently by volunteer ID for admin lists; normalize relation cardinality rather than assuming every embedded relation is an array.
- Recommendation classification lives in a pure helper; quota usage counts distinct non-cancelled volunteer days in its calendar period, and exact dates take precedence to avoid duplicate candidates.
