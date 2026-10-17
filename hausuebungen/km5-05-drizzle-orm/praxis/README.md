# km5-05-drizzle-orm — Drizzle ORM Einstieg (Deno + SQLite)

Beispielprojekt zur Lesson [`unterricht/KM5-05-drizzle-orm/`](../../unterricht/KM5-05-drizzle-orm/lesson.html):
die Musik-DB (Artist/Album/Track) als **TypeScript-Schema mit Drizzle ORM** —
Typsicherheit statt SQL-Strings, mit Einblick in das erzeugte SQL.

## Stack

- **Deno** (Runtime) + **`node:sqlite`** (eingebauter SQLite-Treiber)
- **`drizzle-orm` 1.0.0-rc.4, gepinnt** — der Doku-Standard-Pfad für den
  `node:sqlite`-Treiber (in der stabilen 0.45.x existiert `drizzle-orm/node-sqlite`
  noch nicht). Reines TypeScript, kein Node-Zwang, kein `node_modules`.
- **kein drizzle-kit:** die Kit-CLI (Migrationen) läuft nicht unter Deno —
  Schema-Evolution ist KM6-Stoff. Die Tabellen legt `db.ts` mit DDL an
  (`CREATE TABLE IF NOT EXISTS`), synchron gehalten mit `schema.ts`.

## Aufgaben

- **Demo:** `deno task demo` — seedet den Katalog und zeigt Lesen/Schreiben/
  Auswerten samt erzeugtem SQL (14 Konsolenausgaben).
- **Tests:** `deno task test` — 15 Tests (insert/returning, where, FK-Verstoß,
  update nur im Ziel, delete, orderBy/limit, join, Parametrisierung + die drei
  Hausübungs-Queries).

### Hausübung (UE 2026-10-17)

Ergänzt in `demo.ts`, jeweils mit `toSQL()`-Einblick:

| Query | Bausteine | Ergebnis |
|---|---|---|
| ältestes Album | `orderBy(asc(album.jahr))` + `limit(1)` | `Night Ferry` (2012) |
| Echo-Tracks eines Albums | `and(eq(albumId), like(titel, "Echo%"))` | 2 von 3 Titeln |
| Tracks je Album | `count()` + `groupBy(album.id, album.titel)` + `innerJoin` | Silent Lines 2, Echoes 3 |

Dazu ein drittes Album (`Echoes Over Harbour`, 2020) mit drei Tracks, damit die
Echo-Query etwas zu filtern hat und „Tracks je Album" zwei Gruppen liefert.

## Struktur

| Datei | Inhalt |
|---|---|
| `schema.ts` | Tabellen als Drizzle-Schema (`sqliteTable`) — **erzeugt keine Tabellen** |
| `db.ts` | Verbindung (`drizzle({ client })` über `node:sqlite`) + DDL-Anlage + Shim (siehe unten) |
| `demo.ts` | Seeded Demo-Ablauf mit `toSQL()`-Einblicken |
| `demo_test.ts` | Tests zu allen Lesson-Konzepten |

## Merksätze (aus der Arbeit mit dem Projekt)

- `drizzle(client)` **falsch** — der Positional-Overload erwartet einen Pfad-String
  und baut intern eine eigene Verbindung. Immer **`drizzle({ client })`**, sonst
  findet Drizzle die mit DDL angelegten Tabellen nicht („no such table").
- Query-Builder-Objekte sind **lazy**: erst `await` führt das SQL aus.
- Werte landen nie im SQL-Text (`toSQL().params`) — Parametrisierung by default.
- Aggregations-Helfer wie `avg()`/`sum()` liefern bei SQLite **Strings** zurück
  (`"200"`) — Ergebnis prüfen statt dem TypeScript-Typ blind vertrauen.
- **`stmt.setReturnArrays()` fehlt in Denos `node:sqlite`** — Drizzles
  `node-sqlite`-Treiber ruft die Methode (eine *better-sqlite3*-API) auf jedem
  Statement auf und crasht sonst schon bei der ersten Query mit
  `stmt.setReturnArrays is not a function`. `db.ts` überbrückt das, indem
  `all()`/`get()` im Array-Modus `Object.values(row)` zurückgeben; Drizzle liest
  die Rückgabe in diesem Modus **positional**. Ohne diesen Shim liefert
  `insert().returning()` außerdem `{ id: undefined }` statt `{ id: 1 }`.
