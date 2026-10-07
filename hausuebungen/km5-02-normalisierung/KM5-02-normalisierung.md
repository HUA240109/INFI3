# Normalisierung 1NF–3NF (UE 2026-10-06)

Lesson: `lesson.html` im selben Ordner — Normalformen am Beispiel Bestellung/Musik-DB,
mit vollem Fokus auf **1NF** und **2NF** (3NF als Anschluss).
- Erklärung · Fehlersuche · 15 Quizze · Aufgabe am Lesson-Ende
- Lösung: [`loesung.md`](loesung.md)
- Lauffähiges Prisma-Projekt: [`praxis/`](praxis/) (`npm run demo`, `npm test`)

## Aufgabe

1. Vorhersage der Verletzungen → `bestellung_denorm` bis 3NF zerlegen (jede Stufe
   begründen) → zwei eigene Quiz-Tabellen zerlegen → `npm run demo` im Prisma-Projekt
   laufen lassen (Nachweis). Details: Abschnitt „Aufgabe" am Lesson-Ende.

Abgabe: `loesung.md` (Markdown) + `praxis/` (Prisma-Projekt) im Klassen-Repo.

## Hausübungs-Variante (Prisma statt Deno/SQLite-CLI)

Die Lesson demonstriert die Zerlegung mit `deno task demo` auf einer SQLite-Datei.
Für die Hausübung ist dieselbe Zerlegung **mit Prisma 7** umgesetzt: die
denormalisierten Ausgangstabellen und ihre 3NF-Pendants liegen als Modelle in
`praxis/prisma/schema.prisma`, die Anomalien sind über die Prisma-Query-API
beobachtbar (`praxis/src/queries.js`), abgesichert durch `praxis/test/`.

Vorteil: 1NF/2NF/3NF werden nicht behauptet, sondern an echten Query-Ergebnissen
geprüft (`COUNT` über dieselbe Tatsache vor/nach dem Fix).

## Housekeeping

- Lehrplan: KM5 (Normalformen als Lückenschluss aus KM3); Anschluss: KM5-03 (Unterabfragen I)
- Runtime: **Node.js LTS + npm** (Prisma 7 + Driver Adapter `better-sqlite3`), SQLite
- Vorlage: Prepared Lesson `unterricht/KM5-02-normalisierung/` aus dem GRG-INFI-2-Repo