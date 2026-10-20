---
description: Crea un git worktree en .worktrees/ uniendo los textos del argumento con guiones.
agent: build
---

Argumento recibido (puede contener varios textos separados por espacios):

$ARGUMENTS

Instrucciones:

1. Ejecuta con la herramienta bash, en el directorio actual (sin usar workdir
   ni cambiar de directorio), exactamente este bloque, sustituyendo
   <argumento> por el argumento recibido tal cual, entre comillas simples:

   $slug = '<argumento>'.Normalize('FormD') -replace '\p{M}',''
   $slug = ($slug.ToLower() -replace '[^a-z0-9]+','-').Trim('-')
   git worktree add ".worktrees/$slug"

   El bloque construye el nombre de forma determinista (minúsculas, sin
   acentos ni caracteres especiales, palabras unidas con guiones) y crea el
   worktree. Ejemplos: "Skins Globales Juego" -> "skins-globales-juego";
   "prueba de fuego" -> "prueba-de-fuego". No construyas el nombre a mano
   ni alteres el bloque: si el argumento llega con espacios sin procesar,
   git falla con "fatal: invalid reference".
2. Si el argumento está vacío, no ejecutes nada y pide al usuario un nombre.

No hagas nada más: no te cambies de directorio, no hagas commit, no crees ni
edites archivos, no ejecutes ningún otro comando. Solo ejecuta ese bloque y
reporta su salida.
