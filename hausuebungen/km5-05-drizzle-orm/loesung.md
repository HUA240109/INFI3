# Lösung — KM5-05 Drizzle ORM (Einstieg)

UE 2026-10-17 · Deno 2.5.4 + `node:sqlite` + `drizzle-orm` 1.0.0-rc.4 ·
Projekt: [`praxis/`](praxis/)

```bash
cd praxis
deno task demo     # 14 Konsolenausgaben (Nachweis)
deno task test     # 15/15 grün
```

---

## 1. Vorhersage (vor dem Ausführen notiert)

### a) `db.select().from(artist).where(eq(artist.gruendungsjahr, 1999))`

```sql
select "id", "name", "gruendungsjahr" from "artist" where "artist"."gruendungsjahr" = ?
-- params: [ 1999 ]
```

Begründung der drei Teile:

- **Spaltenliste:** `select()` **ohne** Argument ist kein `SELECT *`. Drizzle
  kennt das Schema aus `schema.ts` und listet die Spalten **explizit** auf — in
  **Schemareihenfolge**, also `id, name, gruendungsjahr` (genau die Frage aus
  Abschnitt 12.1 der Lesson). Der Stern taucht im erzeugten SQL nicht auf.
- **WHERE:** `eq()` wird zu `=` und wird **tabellenqualifiziert**
  (`"artist"."gruendungsjahr"`), weil derselbe Spaltenname in einem JOIN auch
  in der anderen Tabelle stehen könnte.
- **Parameter:** `1999` steht **nicht** im Text, sondern kommt als `?` plus
  Wert in `params`. Das ist die Parametrisierung aus KM4, hier by default.

### b) `db.select({ n: count() }).from(album).where(eq(album.artistId, 1))`

```sql
select count(*) from "album" where "album"."artist_id" = ?
-- params: [ 1 ]
```

- **`count()` ohne Spaltenargument** läuft auf `count(*)` hinaus (Quiz 10 der
  Lesson). Mit einem Argument, z. B. `count(track.id)`, wäre es `count("track"."id")`.
- **Der Alias `n` erscheint nicht im SQL.** `n` ist ein TypeScript-Name für das
  Ergebnisobjekt (`{ n: 3 }`); SQL-Text und Spaltennamen bleiben unberührt.
- **Namenverwechslung:** im WHERE steht `artist_id` — der **DB-Spaltenname**
  aus `sqliteTable("album", { artistId: integer("artist_id") … })`, nicht der
  TS-Feldname `artistId`. Wer im SQL-Text `artistId` sucht, sucht vergebens
  (Merksatz in der Lesson, Abschnitt 11).

### Bestätigt

Beide Vorhersagen treffen **exakt** zu, ohne ein einziges abweichendes
Zeichen — auch das Fehlen von `asc`/`ASC` istbemerkenswert: Drizzle schreibt
Sortierrichtungen nur, wenn sie von `desc()` kommen; ein reines
`orderBy(album.jahr)` erzeugt ein nacktes `order by "album"."jahr"`.

---

## 2. Die drei ergänzten Queries in `demo.ts`

Damit die Queries überhaupt etwas zu zeigen haben, ist ein drittes Album
dazugekommen (`Echoes Over Harbour`, 2020, Aera) mit **drei** Tracks:

| Track | Dauer | Album |
|---|---|---|
| Echoes Over Harbour | 245 | Echoes Over Harbour |
| Echo Chamber | 198 | Echoes Over Harbour |
| Harbour Lights | 160 | Echoes Over Harbour |

Ohne dieses Album hätte die Echo-Query genau **einen** Treffer geliefert und
`groupBy` nur eine Gruppe erzeugt — mit einer Zeile kann man keinen Unterschied
zwischen „passt" und „passt nicht" zeigen.

### 2.1 Ältestes Album — `orderBy` + `limit`

```ts
const aelteste = db.select({ titel: album.titel, jahr: album.jahr })
  .from(album)
  .orderBy(asc(album.jahr))
  .limit(1);
```

```sql
select "titel", "jahr" from "album" order by "album"."jahr" asc limit ?
-- params: [ 1 ]
```

Ergebnis: `{ titel: "Night Ferry", jahr: 2012 }`.

Das Scaffold holt darüber das **neueste** Album (`desc(...)`). Der älteste Fall
ist dieselbe Mechanik in die andere Richtung — der eigentliche Unterschied ist
nur das `asc`/`desc`. Bemerkenswert ist das `limit ?`: **auch die Zeilenzahl
parametrisiert Drizzle**, sie steht also nicht als `limit 1` im Text. Das ist
im Scaffold nirgends erwähnt und in Quiz/Beispielen nicht zu sehen.

### 2.2 Echo-Tracks — `and` + `eq` + `like`

```ts
const echoTracks = db
  .select({ titel: track.titel, dauerSek: track.dauerSek })
  .from(track)
  .where(and(eq(track.albumId, echo[0].id), like(track.titel, "Echo%")))
  .orderBy(track.id);
```

```sql
select "titel", "dauer_sek" from "track"
 where (("track"."album_id" = ?) and ("track"."titel" like ?))
 order by "track"."id"
-- params: [ 3, "Echo%" ]
```

Ergebnis:

```
[ { titel: "Echoes Over Harbour", dauerSek: 245 },
  { titel: "Echo Chamber", dauerSek: 198 } ]
```

Zwei Bedingungen, zwei Ausschlussgründe — und beide sind im Ergebnis sichtbar:
`Harbour Lights` fällt raus, weil `like("Echo%")` nicht greift; `Silent Lines`
und `Echo Room` liegen im *anderen* Album, weil `eq(track.albumId, …)` nicht
greift. `and()` erzeugt **genau eine** Klammer um beide Bedingungen — ohne sie
wäre die Bindung von `and`/`or` mehrdeutig. Und: das **Muster** `"Echo%"` ist
selbst ein Parameter, kein im Text eingeklebtes SQL.

### 2.3 Tracks je Album — `count` + `groupBy`

```ts
const tracksProAlbum = db
  .select({ albumId: album.id, titel: album.titel, tracks: count() })
  .from(track)
  .innerJoin(album, eq(track.albumId, album.id))
  .groupBy(album.id, album.titel)
  .orderBy(album.id);
```

```sql
select "album"."id", "album"."titel", count(*) from "track"
  inner join "album" on "track"."album_id" = "album"."id"
 group by "album"."id", "album"."titel"
 order by "album"."id"
-- params: []
```

Ergebnis:

```
[ { albumId: 1, titel: "Silent Lines", tracks: 2 },
  { albumId: 3, titel: "Echoes Over Harbour", tracks: 3 } ]
```

**Zwei Änderungen gegenüber der Scaffold-Version** (`select({ titel, tracks })`
+ `groupBy(album.id)`):

1. `groupBy` nennt jetzt **auch** `album.titel`. Das Scaffold projiziert
   `album.titel`, gruppiert aber nur nach `album.id` — SQLite toleriert das und
   nimmt den Titel aus der Gruppe, was hier harmlos aussieht (pro Album gibt es
   genau einen Titel) und bei jeder anderen Query still falsche Zeilen liefern
   könnte. Steht eine projizierte Spalte nicht im `groupBy`, ist das Ergebnis
   vom DB-Plan abhängig, nicht von der Frage.
2. `album.id` ist in der Projektion dazugekommen, damit die Zeile sich über
   ihre Album-ID identifizieren lässt statt nur über den Titel.

Und das wichtigste Ergebnis steht **nicht** im Output, sondern in dem, was
**fehlt**: `Night Ferry` (Album 2) hat null Tracks und kommt **überhaupt nicht
vor**. Der `innerJoin` startet bei `track` — ein Album ohne Track hat keine
`track`-Zeile und fällt damit aus der Gruppierung. Wer „Anzahl Tracks je Album"
liest, erwartet drei Zeilen und bekommt zwei. Der Test
`innerJoin laesst das Album ohne Tracks weg — leftJoin nicht` hält genau das
fest und prüft die Gegenprobe:

```ts
db.select({ titel: album.titel, tracks: count(track.id) })
  .from(album)                                              // ← ab album
  .leftJoin(track, eq(track.albumId, album.id))            // ← LEFT JOIN
  .groupBy(album.id, album.titel)
```

```
[ { titel: "Silent Lines", tracks: 2 },
  { titel: "Echoes Over Harbour", tracks: 3 },
  { titel: "Night Ferry", tracks: 0 } ]                     // ← jetzt da
```

Zwei Änderungen reichen, und die Differenz ist **beide Male nötig**: von der
Album-Seite starten (`from(album)`), damit leere Albums überhaupt entstehen
können, und `count(track.id)` statt `count()` verwenden — mit `COUNT(*)` wäre
`Night Ferry` fälschlich **1**, weil die `LEFT JOIN`-Zeile existiert, auch wenn
alle ihre `track`-Spalten `NULL` sind. Das ist exakt der Fall, an dem ein
Query-Builder bequem ist und ein Mensch beim `count()`-Tippen eine falsche Zahl
bekommt.

---

## 3. Interleaving — dieselbe Query als reines SQL

```sql
-- Variante A: ab track (Drizzle-Äquivalent, 1:1 übersetzbar)
SELECT album.id AS albumId, album.titel AS titel, COUNT(*) AS tracks
FROM track
INNER JOIN album ON track.album_id = album.id
GROUP BY album.id, album.titel
ORDER BY album.id;

-- Variante B: ab album, damit auch leere Alben zählen
SELECT album.titel AS titel, COUNT(track.id) AS tracks
FROM album
LEFT JOIN track ON track.album_id = album.id
GROUP BY album.id, album.titel
ORDER BY album.id;
```

### Zuordnung Baustein → Drizzle

| SQL | Drizzle | wo im erzeugten SQL |
|---|---|---|
| `SELECT` + Spaltenliste | `select({ … })` | `select "album"."id", "album"."titel", count(*)` |
| `COUNT(*)` | `count()` | `count(*)` — ohne Spaltenargument |
| `COUNT(track.id)` | `count(track.id)` | `count("track"."id")` |
| `FROM track` | `.from(track)` | `from "track"` |
| `INNER JOIN … ON` | `.innerJoin(album, eq(track.albumId, album.id))` | `inner join "album" on "track"."album_id" = "album"."id"` |
| `LEFT JOIN … ON` | `.leftJoin(track, eq(track.albumId, album.id))` | `left join "track" on "track"."album_id" = "album"."id"` |
| `GROUP BY` | `.groupBy(album.id, album.titel)` | `group by "album"."id", "album"."titel"` |
| `ORDER BY` | `.orderBy(album.id)` | `order by "album"."id"` |
| `AS` (Alias) | Schlüssel im `select({ … })` | **erscheint nicht** — nur TS-seitig |

**Jeder** SQL-Baustein dieser Query hat also genau eine Drizzle-Entsprechung,
und die Reihenfolge im erzeugten SQL ist dieselbe wie im geschriebenen. Kein
`JOIN`, kein `GROUP BY` wird erfunden, umschrieben oder wegsortiert.

### Nachgewiesen, nicht behauptet

Variante A habe ich zusätzlich von Hand über `client.prepare(…)` auf derselben
Datenbank laufen lassen und das Ergebnis mit dem Drizzle-Ergebnis verglichen:

```
Drizzle: [{"albumId":1,"titel":"Silent Lines","tracks":2},{"albumId":2,"titel":"Echoes Over Harbour","tracks":3}]
Hand   : [{"albumId":1,"titel":"Silent Lines","tracks":2},{"albumId":2,"titel":"Echoes Over Harbour","tracks":3}]
gleich : true
LEFT   : [{"titel":"Silent Lines","tracks":2},{"titel":"Echoes Over Harbour","tracks":3},{"titel":"Night Ferry","tracks":0}]
```

Byteidentisch. Der einzige Unterschied zwischen Drizzle und der Handfassung
ist das `AS`-Kürzel — und das ist genau der Punkt: **Drizzle ersetzt SQL nicht,
es erzeugt es.** `.toSQL()` zeigt es, ohne dass die Query ausgeführt wird.

Was Drizzle *nicht* übersetzt: `HAVING` (muss als `having`-Klausel bzw.
Filter auf die Aggregation gebaut werden), CTEs und Unterabfragen aus KM5-03
und Fensterfunktionen. Genau da endet die Interleaving-Grenze, und genau dort
wird im nächsten KM rohes SQL wieder die richtige Wahl.

---

## 4. Demo-Nachweis

```
> deno task demo

Lesen, erzeugtes SQL: select "id", "titel", "jahr", "artist_id" from "album" where "album"."artist_id" = ?
Lesen, Parameter: [ 1 ]
Lesen, Ergebnis: [
  { id: 1, titel: "Silent Lines", jahr: 2015, artistId: 1 },
  { id: 3, titel: "Echoes Over Harbour", jahr: 2020, artistId: 1 }
]
Neuestes Album: Echoes Over Harbour ( 2020 )
Aeltestes Album, SQL: select "titel", "jahr" from "album" order by "album"."jahr" asc limit ?
Aeltestes Album, Parameter: [ 1 ]
Aeltestes Album: [ { titel: "Night Ferry", jahr: 2012 } ]
Echo-Tracks, SQL: select "titel", "dauer_sek" from "track" where (("track"."album_id" = ?) and ("track"."titel" like ?)) order by "track"."id"
Echo-Tracks, Parameter: [ 3, "Echo%" ]
Echo-Tracks: [
  { titel: "Echoes Over Harbour", dauerSek: 245 },
  { titel: "Echo Chamber", dauerSek: 198 }
]
Tracks pro Album, SQL: select "album"."id", "album"."titel", count(*) from "track" inner join "album" on "track"."album_id" = "album"."id" group by "album"."id", "album"."titel" order by "album"."id"
Tracks pro Album: [
  { albumId: 1, titel: "Silent Lines", tracks: 2 },
  { albumId: 3, titel: "Echoes Over Harbour", tracks: 3 }
]
Nach update: 220 Sekunden
Tracks nach delete: 4
```

Zwei Dinge, die nur aus dem echten Lauf lernen kann:

1. Die Zeile **„Neuestes Album"** hat sich durch das dritte Album geändert (vorher
   `Silent Lines`) — die Scaffold-Ausgabe ist also nicht mehr gültig, die
   beiden `Tracks nach delete` auch nicht (`1` → `4`).
2. `Tracks pro Album` listet **zwei** Alben, obwohl drei in der DB sind. Das ist
   der `innerJoin`, kein Fehler — in Abschnitt 2.3 erklärt und im Test festgehalten.

```
> deno task test
running 15 tests from ./demo_test.ts

insert mit returning liefert die neue Zeile mit id ... ok (5ms)
select mit where filtert typsicher ... ok (1ms)
Fremdschlüssel verhindert Album ohne Artist ... ok (1ms)
update aendert nur die gewaehlten Zeilen ... ok (2ms)
delete entfernt nur die gewaehlte Zeile ... ok (2ms)
orderBy + limit liefern das juengste Album ... ok (2ms)
innerJoin verbindet Album und Artist ... ok (1ms)
Drizzle parametrisiert: Werte stecken in params, nicht im SQL ... ok (0ms)
assertThrows ist importiert und steht bereit ... ok (0ms)
orderBy(asc) + limit liefern das aelteste Album ... ok (1ms)
limit parametrisiert mit — die Zahl steht nicht im SQL-Text ... ok (0ms)
and + eq + like: Echo-Titel nur im passenden Album ... ok (1ms)
and erzeugt genau eine geklammerte WHERE-Bedingung ... ok (0ms)
count + groupBy zaehlt die Tracks je Album ... ok (1ms)
innerJoin laesst das Album ohne Tracks weg — leftJoin nicht ... ok (2ms)

ok | 15 passed | 0 failed (35ms)
```

Die 9 Scaffold-Tests bleiben unverändert grün, die 6 neuen decken die drei
Aufgaben-Queries ab. Zwei davon prüfen **nicht das Ergebnis, sondern das SQL**
(`limit ?` inkl. Param, die geklammerte `WHERE`-Klausel) — das ist der Kern der
Lesson: nicht „die Zahl stimmt", sondern „steht der Wert im SQL oder in den
Parametern".

`deno lint` ist sauber. `deno fmt --check` meldet für die Dateien nur
`Text differed by line endings` — die CRLF-Zeilenenden stammen aus dem
Scaffold und sind nicht von mir eingeschleppt; die inhaltlichen
Format-Abweichungen in `demo_test.ts` habe ich behoben.

---

## 5. Zwei Stolpersteine beim Nachbauen

### 5.1 Der Scaffold läuft auf Deno 2.5.4 nicht — `stmt.setReturnArrays`

Der erste `deno task demo` bricht **vor** der ersten Ausgabe ab:

```
DrizzleQueryError: Failed query: insert into "artist" …
Caused by: TypeError: stmt.setReturnArrays is not a function
    at Object.all (…/drizzle-orm/1.0.0-rc.4/node-sqlite/session.js:27:10)
```

Ursache: Drizzles Treiber `drizzle-orm/node-sqlite` ruft auf **jedem** Statement
`stmt.setReturnArrays(...)` auf — das ist eine **better-sqlite3**-API. Denos
`node:sqlite`-Shim kennt sie nicht, dort gibt es nur `setAllowBareNamedParameters`,
`setReadBigInts`, `expandedSQL`, `sourceSQL` (per Probe über
`Object.getOwnPropertyNames(Object.getPrototypeOf(stmt))` verifiziert).

Der naive Fix — `setReturnArrays = () => {}` — bringt das Projekt zum Laufen,
liefert aber **falsch leere Ergebnisse**:

```
aera = [ { id: undefined, name: undefined, gruendungsjahr: undefined } ]
```

Denn Drizzle liest die Rückgabe in **zwei Modi**: `objects` (`{ id: 1 }`) und
`arrays` (`[1]`). Im `arrays`-Modus — den `insert().returning()` benutzt — mappt
es **positional**. Deno liefert aber *immer* Objekte, also steht an Position 0
schon `undefined`.

Der Shim in [`praxis/db.ts`](praxis/db.ts) überbrückt das, indem `all()`/`get()`
im Array-Modus `Object.values(row)` zurückgeben:

```ts
stmt.setReturnArrays = (arrays: boolean) => { alsArrays = arrays; };
stmt.all = (...params: unknown[]) => {
  const zeilen = originalAll(...params);
  return alsArrays ? zeilen.map((zeile) => Object.values(zeile as Zeile)) : zeilen;
};
```

Das funktioniert, weil die **Schlüsselreihenfolge** eines Zeilenobjekts die
Einfügereihenfolge und damit die Spaltenreihenfolge von `SELECT`/`RETURNING`
ist — genau die Reihenfolge, die Drizzle positional liest. Deshalb ist es
auch kein Zufall, dass der Fehler erst an der Album-Zeile aufkam (`artist_id`
bekam `null`) und nicht schon bei den Artists: der Insert selbst war ja
erfolgreich, nur seine `.returning()`-Zeile war leer.

Zwei Nebenwirkungen, die man wissen muss: der Shim gilt auch für relationale
`db.query`-Aufrufe im `values`-Modus, die ihre Spaltennamen aus der
Trefferliste ableiten — davon benutzt dieses Projekt nichts. Und
`node:sqlite` bietet keine `columns()`-API, mit der sich die Spaltenreihenfolge
echt abfragen ließe; hier wird sie aus der Objektreihenfolge *abgeleitet*.

### 5.2 Test-Reihenfolge ist nicht alphabetisch

Mein erster `assertEquals` für die `leftJoin`-Gegenprobe erwartete die Zeilen
alphabetisch (`Silent Lines`, `Night Ferry`, `Echoes`) — `orderBy(album.id)`
sortiert aber nach **Anlage-Reihenfolge**, und im Test-Fixture wird
`Echoes Over Harbour` vor `Night Ferry` angelegt. Der Test war falsch, nicht
der Code. Wer `groupBy`-Ergebnisse vergleicht, sollte die Sortierung
ausdrücklich mitdenken.

---

## 6. Aufbau des Projekts

| Datei | Inhalt |
|---|---|
| `praxis/schema.ts` | Tabellen als Drizzle-Schema — **unverändert** |
| `praxis/db.ts` | Verbindung + DDL + `setReturnArrays`-Shim |
| `praxis/demo.ts` | Seed + 14 Konsolenausgaben, davon 3 neue Queries |
| `praxis/demo_test.ts` | 15 Tests (9 Scaffold + 6 Hausübung) |
| `praxis/README.md` | Stack, Zählwerte und Merksätze aktualisiert |

---

## 7. Reflexion

Der stärkste Moment dieser Übung war nicht das Schreiben der drei Queries,
sondern das **Fehlen** von `Night Ferry` in der Ausgabe. Ich hatte „Anzahl Tracks
je Album" gelesen und drei Zeilen erwartet, bekommen habe ich zwei — und der
Unterschied ist eine einzige Klausel (`innerJoin` vs. `leftJoin`, plus
`COUNT(track.id)` statt `COUNT(*)`). In reinem SQL hätte ich diese Klausel
selbst schreiben müssen und wäre mit hoher Wahrscheinlichkeit nie auf die Idee
gekommen, sie zu prüfen. Das ORM hat mich hier nicht nur vor Tippfehlern
bewahrt, sondern eine **stille Fehlinterpretation** sichtbar gemacht — und zwar
indem es beim Nachzählen des Ergebnisses *auffiel*, nicht beim Ausführen. Das
ist ein Argument für das ORM, das in der Aufgabe nicht vorkam: es senkt nicht
nur die Kosten des Schreibens, es verändert, welche Fehler man überhaupt bemerkt.

Gleichzeitig zeigt dieselbe Zeile die Grenze, und zwar eine, die kein Typsystem
fängt: `select({ titel: album.titel, tracks: count() })` mit `groupBy(album.id)`
**kompiliert einwandfrei**. `album.titel` ist ein `string`, `count()` ein
`number`, die Rückgabe passt zu `Album & { tracks: number }`. Dass SQLite dabei
einen Wert aus der Gruppe „beliebig" zieht, steht in keiner Signatur. Der
Fehler sitzt in der SQL-Semantik, und die kann ein Query-Builder nicht
validieren, solange er nicht jede projizierte Spalte gegen das `groupBy` prüft
— was Drizzle nicht tut und was kein gängiges ORM tut. Typensicherheit und
semantische Sicherheit sind zwei verschiedene Dinge; die Lesson nennt die erste
„Typsicherheits-Layer", und dieser Fall zeigt, warum der Zusatz „obendrauf"
keine Höflichkeit ist.

Ein zweiter Punkt, der für mich überraschend war: `limit 1` wird zu `limit ?`.
Ich hatte Parameter für **Werte** erwartet, die aus der DB gelesen werden — ein
`LIMIT` ist aber eine Strukturentscheidung, keine Datenangabe. Drizzle
parametrisiert es trotzdem. Das ist konsistent und in Ordnung, aber es kostet
Prepare-Statements: Wer dieselbe Query in einer Schleife mit wechselndem
`limit` fährt, baut bei festem SQL-Text einen Plan, bei wechselndem Text einen
neuen. Für Lesezahlen aus Benutzereingaben ist Parametrisierung richtig und
Pflicht — dort ist der Wert ein *Filter*. Für ein `limit` aus eigenem Code ist
es Nützlichkeit um den Preis des Caches, und das ist eine Abwägung, die man im
SQL still vornimmt und im ORM still geschenkt bekommt.

Und zuletzt der Treiber. Der Scaffold des Beispielprojekts ist darauf
geschrieben, `node:sqlite` unter Deno ohne `node_modules` zu fahren — ein
gutes Versprechen. Auf Deno 2.5.4 hält es nicht: Der Drizzle-Treiber für
`node-sqlite` ist gegen eine `better-sqlite3`-API geschrieben und zerfällt an
genau einer fehlenden Methode. Das ist kein Windows-Problem und kein
Versionsdetail, sondern die Lücke zwischen zwei APIs mit demselben Namen. Was
mich daran am meisten stört, ist nicht der Bug, sondern seine Gestalt: Er
tritt als `TypeError` **mitten in der Ausführung** auf, drei Zeilen unter dem,
was man eigentlich lernen wollte. Ein Scaffold, der seinen eigenen
Stack-Vertrag nicht hält, kostet mehr Zeit als ein fehlendes Feature — und die
Vertrauensfrage „ist das jetzt mein Fehler oder der Code?" ist die teuerste
Störung, die ein Lernprojekt produzieren kann.

---

## Dateien in dieser Lösung

| Datei | Änderung |
|---|---|
| `loesung.md` | dieses Dokument |
| `hausaufgabe.md` | Kurzfassung der Aufgabe |
| `KM5-05-drizzle-orm.md` | Lesson-Übersicht und Housekeeping |
| `praxis/db.ts` | Shim `mitZeilenForm()` — `setReturnArrays` für Denos `node:sqlite` |
| `praxis/demo.ts` | Import `asc`; drittes Album `Echoes Over Harbour` + 3 Tracks; drei neue Queries mit `toSQL()`-Ausgabe; `Tracks pro Album` um `groupBy(album.titel)` + `album.id` erweitert |
| `praxis/demo_test.ts` | Import `asc`; Fixture `demoDb()` + 6 Tests für die neuen Queries |
| `praxis/README.md` | Zählwerte 7→14 / 9→15, Hausübungs-Abschnitt, Merksatz zum Shim |