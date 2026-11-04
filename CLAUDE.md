@AGENTS.md

## Calidad de código antes de cada PR

Con el plugin `code-quality` instalado:

1. Al escribir código, aplicar `ponytail` (nivel full).
2. Antes de abrir el PR, pasar sobre el diff `thermo-nuclear-code-quality-review`, `ponytail-review` y `vercel-react-best-practices` (este repo es Next.js). Aplicar lo que encuentren y repetir una vez si hubo cambios, máximo 2 pasadas.
3. Las reglas de Vercel no reemplazan la documentación de esta versión de Next.js: ante un conflicto, manda `node_modules/next/dist/docs/`.
