# Drizzle ORM — Einstieg (UE 2026-10-17)

Lesson: `lesson.html` im selben Ordner — Drizzle ORM als **Typsicherheits-Layer
über** dem SQL-Kern aus KM5-02 bis KM5-04, am Musik-Katalog (Artist/Album/Track).
- Erklärung · SQL↔Drizzle-Vergleichstabelle · 12 Quizze · Aufgabe am Lesson-Ende
- Lösung: [`loesung.md`](loesung.md)
- Lauffähiges Projekt: [`praxis/`](praxis/) (`deno task demo`, `deno task test`)

## Aufgabe

1. Vorhersage des erzeugten SQL für die zwei Queries der Aufgabe (Spaltenliste,
   WHERE, Parameter) — vor dem Ausführen notieren.
2. `demo.ts` um drei Queries erweitern: ältestes Album (`orderBy` + `limit`),
   Echo-Tracks eines Albums (`and` + `eq` + `like`), Tracks je Album
   (`count` + `groupBy`).
3. Interleaving: „Tracks pro Album" als reines SQL hinschreiben und mit dem
   Drizzle-SQL vergleichen.
4. Nachweis: `deno task demo` + `deno task test`. Details: Abschnitt „Aufgabe"
   am Lesson-Ende.

Abgabe: `loesung.md` (Markdown) + `praxis/demo.ts` (geändert).

## Housekeeping

- Lehrplan: KM5 (komplexe Abfragen, SQL-Kern) · Anschluss: KM6 (Prisma-Werkzeuge,
  Query-API, Migrationen) — dort wird `drizzle-kit` zum Thema, was hier bewusst
  außen vor bleibt
- Runtime: **Deno 2.5.4 + `node:sqlite`** (eingebaut), `drizzle-orm` 1.0.0-rc.4
  via `npm:`-Specifier, kein `node_modules`
- Vorlage: Prepared Lesson `unterricht/KM5-05-drizzle-orm/` + Beispielprojekt
  `Beispielprojekte/km5-05-drizzle-orm/` aus dem GRG-INFI-2-Repo, unverändert
  nach `praxis/` kopiert; das GRG-Repo selbst blieb unangetastet
- Abweichung vom Scaffold: `db.ts` braucht einen Shim (drizzle-`node-sqlite`
  gegen Denos `node:sqlite`), sonst crasht schon die erste Query — Details in
  [`loesung.md`](loesung.md#5-zwei-stolpersteine-beim-nachbauen)