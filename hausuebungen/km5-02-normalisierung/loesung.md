# Lösung — KM5-02 Normalisierung (1NF–3NF)

UE 2026-10-06 · Prisma 7 + `better-sqlite3` auf SQLite · Projekt: [`praxis/`](praxis/)

```bash
cd praxis
npm install
npm run db:migrate     # legt dev.db aus prisma/schema.prisma an
npm run db:seed        # Daten aus der Lesson
npm run demo           # die vier Konsolenzeilen (Nachweis)
npm test               # 16/16 grün
```

---

## 1. Vorhersage (vor dem Zerlegen notiert)

Ausgangstabelle `bestellung_denorm`:

| bestell_nr | kunde | plz | ort |
|---|---|---|---|
| 101 | Auer | 1020 | Wien |
| 102 | Beck | 1020 | Wien |
| 103 | Cevik | 4020 | Linz |

**Vorhersage:** `ort` verletzt die **3NF**, nicht 1NF oder 2NF. Die Spalten sind atomar (keine
Liste, keine Wiederholgruppe als Spalten), und es gibt keinen zusammengesetzten Schlüssel,
an dem ein Attribut hängen könnte — `bestell_nr` ist ein simpler Primary Key, damit kann keine
partielle Abhängigkeit entstehen. Der Fehler ist die **transitive** Abhängigkeit:

```
bestell_nr ──▶ kunde, plz, ort
                  │
                  └──▶ ort          (plz ──▶ ort)
```

`ort` hängt nicht am Primärschlüssel, sondern an `plz`, einem Nicht-Schlüssel-Attribut.
Beobachtbar ist das an der Redundanz: `"1020 = Wien"` steht zweimal in der Tabelle, weil
zwei Bestellungen dieselbe PLZ haben. Wird `plz`-Orthografie oder ein Ort korrigiert, muss
man alle betroffenen Zeilen anfassen — sonst entstehen Widersprüche wie
`101 = Wien` und `102 = Linz` bei gleicher PLZ.

Zusätzlich in der Tabelle sichtbar: **`8010 = Graz` existiert nirgends.** Eine PLZ ohne
Bestellung lässt sich in `bestellung_denorm` gar nicht speichern, weil es keine Zeile gibt,
in der sie stehen könnte — die Einfüge-Anomalie.

**Bestätigt** (`npm run demo`, Zeile 3): `'1020 = Wien'` gespeichert: denorm **2** | normalisiert **1**.

---

## 2. Zerlegung bis 3NF

### Stufe 1 — Ist-Zustand (3NF verletzt)

```sql
CREATE TABLE bestellung_denorm (
  bestell_nr INTEGER PRIMARY KEY,
  kunde      TEXT NOT NULL,
  plz        TEXT NOT NULL,
  ort        TEXT NOT NULL       -- redundant: plz ──▶ ort
);
```

### Stufe 2 — 3NF: transitiven Teil auslagern

```
bestell_nr ──▶ kunde, plz
plz ────────▶ ort          wird zur eigenen Faktentabelle
```

```sql
CREATE TABLE plz (
  plz TEXT PRIMARY KEY,
  ort TEXT NOT NULL
);

CREATE TABLE bestellung (
  bestell_nr INTEGER PRIMARY KEY,
  kunde      TEXT NOT NULL,
  plz        TEXT NOT NULL REFERENCES plz(plz)
);
```

Begründung: `bestell_nr` ist jetzt Determinationsmenge für **jedes** Attribut von `bestellung`
(`kunde`, `plz`), und `plz` bestimmt genau ein Attribut (`ort`) in `plz`. Kein Attribut hängt
an einem Nicht-Schlüssel-Attribut → 3NF hält.

Warum die Zerlegung nicht schon 1NF/2NF betrifft: `bestellung_denorm` hat einen **einfachen**
Schlüssel. 1NF ist per Definition erfüllt (jede Zelle atomar), und 2NF kann bei einfachem
Primärschlüssel nicht verletzt werden — eine partielle Abhängigkeit braucht einen
zusammengesetzten Schlüssel, von dem das Attribut nur teilweise abhängt. Deshalb beginnt die
Zerlegung hier direkt bei den NF3-Bedingungen.

**Modell:** [`praxis/prisma/schema.prisma`](praxis/prisma/schema.prisma) —
`BestellungDenorm` (Suffix = kaputt) und `Bestellung` + `Plz` (der Fix).

### Was die Zerlegung gewinnt — an Query-Ergebnissen, nicht behauptet

| Anomalie | denorm | 3NF | Query |
|---|---|---|---|
| Redundanz | 2 Zeilen mit `"1020 = Wien"` | 1 | `ortSpeicherorte("1020")` |
| Einfüge | `8010 = Graz` nicht speicherbar | 3 PLZ-Zeilen | `plzOhneBestellung()` |
| Lösch | „4020 = Linz" verschwindet mit der letzten Bestellung | bleibt sichtbar | `loeschAnomalie("4020")` |
| Update | Korrektur des Orts = n Zeilen | 1 Zeile | `ortSpeicherorte()` |

### Interleaving — die ursprüngliche Abfrage

```js
const bestellung = await prisma.bestellung.findUnique({
  where: { bestellNr: 101 },
  select: {
    bestellNr: true, kunde: true, plz: true,
    plzOrt:  { select: { ort: true } },
    tracks:  { select: { position: true, song: { select: { titel: true, dauerSek: true } } },
              orderBy: { position: "asc" } },
  },
});
```

```
{ bestellNr: 101, kunde: 'Auer', ort: '1020 Wien',
  tracks: [ '1. Silent Lines', '2. Night Ferry' ] }
```

Drei Tabellen, zwei JOINs — dasselbe Ergebnis wie vor der Zerlegung. Die Zerlegung kostet
also **keine** Leseleistung, sie kauft nur Konsistenz.

---

## 3. Zwei eigene Quiz-Tabellen zerlegt

### 3.1 `song_playlist_denorm` → 2NF (partielle Abhängigkeit)

```
(song_id, playlist_id) ──▶ song_titel
                  │
                  └──▶ song_titel     song_id ──▶ titel
```

`song_titel` hängt nur an `song_id`, einem **Teil** des zusammengesetzten Schlüssels →
partielle Abhängigkeit → 2NF verletzt.

```sql
CREATE TABLE song_playlist (       -- Zwischentabelle: nur noch die Beziehung
  song_id     INTEGER NOT NULL REFERENCES song(song_id),
  playlist_id INTEGER NOT NULL REFERENCES playlist(playlist_id),
  PRIMARY KEY(song_id, playlist_id)
);
```

Beispielzeilen (Seed): `(1,10) (1,20) (2,20) (5,30)`

**Messbar:** Song 1 liegt in zwei Playlists. Umbenennen des Titels kostet denorm
**2** Zeilen, nach der Zerlegung **1**:

```
2) 2NF  Titelumbenennen = Zeilen:    denorm 2 | normalisiert 1
```

Im Denorm-Fall steht `"Silent Lines"` zweimal wörtlich im Speicher — `titelRedundanz(1)`
liefert `['Silent Lines', 'Silent Lines']`.

### 3.2 `bestellposition_prod_denorm` → 2NF

```
(bestell_nr, produkt_nr) ──▶ menge
                       │
                       └──▶ produkt_name    produkt_nr ──▶ name
```

Gleiches Muster, diesmal bei der Produktbezeichnung:

```
Zeilen zum Umbenennen von 'Kabel':  denorm 2 | normalisiert 1
[{ bestellNr: 101, produktName: 'Kabel' },
 { bestellNr: 102, produktName: 'Kabel' }]
```

**Gegenprobe Quiz 9 (`pruefung`):** dort hängt `note` am **ganzen** Schlüssel
`(matr_nr, lv_nr)` — welche Note jemand in *welcher* LV hat, ist eine Tatsache über das Paar,
nicht über einen Teil. Nichts auszulagern, 2NF hält:

```
Pruefung-Zeilen: 3
groupBy lvNr → DBI: 2, SWP: 1
```

Dieselbe Oberfläche, andere Schlüsselform, andere Folge — deshalb lohnt der Test, statt
pauschal „2NF reparieren" zu sagen.

### 3.3 `konto_denorm` → 3NF (transitive Kette, Quiz 13)

```
iban ──▶ inhaber, blz
             │
             └──▶ bankname    blz ──▶ name
```

```sql
CREATE TABLE bank (blz TEXT PRIMARY KEY, name TEXT NOT NULL);

CREATE TABLE konto (
  iban    TEXT PRIMARY KEY,
  inhaber TEXT NOT NULL,
  blz     TEXT NOT NULL REFERENCES bank(blz)
);
```

Beispielzeilen (Seed): `('AT01','Auer','1000') ('AT02','Beck','1000') ('AT03','Cevik','20111')`

**Messbar:** BLZ `1000` hat zwei Konten. Ein Bankumbenennen trifft denorm **2** Kontozeilen,
nach der Zerlegung **1** Bankzeile (`bankUmbenennenAufwand("1000")` → `{denorm: 2, fix: 1}`).
Nach der Zerlegung liefert der JOIN den Namen:

```js
await prisma.konto.findMany({
  where: { blz: "1000" },
  select: { iban: true, inhaber: true, bank: { select: { name: true } } },
});
// [{ iban:'AT01', inhaber:'Auer', bank:{ name:'Erste Bank' } },
//  { iban:'AT02', inhaber:'Beck', bank:{ name:'Erste Bank' } }]
```

Strukturell dasselbe Muster wie `bestellung_denorm` (PLZ→Ort), nur über Bank-Domäne
statt Geografie — deshalb ist die Normalform allgemein und nicht pro Fall Sonderwissen.

---

## 4. Demo-Nachweis

```
> npm run demo

1) 1NF  Hobby 'Schwimmen' gefunden:  denorm 0 | normalisiert 1
2) 2NF  Titelumbenennen = Zeilen:    denorm 2 | normalisiert 1
3) 3NF  '1020 = Wien' gespeichert:  denorm 2 | normalisiert 1
4) JOIN Bestellung 101: {
  bestellNr: 101,
  kunde: 'Auer',
  ort: '1020 Wien',
  tracks: [ '1. Silent Lines', '2. Night Ferry' ]
}
```

Zeile 1 ist die 1NF-Verletzung aus der Lesson, in dieses Projekt mitgenommen: der
Gleichheitsvergleich `hobbys = 'Schwimmen'` auf der Sammelzelle `"Lesen, Schwimmen"` findet
**0** Treffer, weil die Zelle nie exakt `'Schwimmen'` heißt. Nach der Zerlegung in eine Zeile
pro Wert trifft derselbe Vergriff **1** Kunden. Das ist die 1NF praktisch, nicht per Definition.

```
> npm test
✔ 1NF: Gleichheitssuche auf der Sammelzelle findet nichts
✔ 1NF: nach dem Fix trifft derselbe Gleichheitsvergleich
✔ 1NF: 'Lesen' liegt vor dem Fix nur in der Sammelzelle vor
✔ 1NF: Wiederholgruppe wird zur Zeile pro Vorkommen
✔ 2NF: Titelumbenennen kostet im Denorm-Fall mehrere Zeilen
✔ 2NF: der Titel steht im Denorm-Fall doppelt im Speicher
✔ 2NF: Zwischentabelle trägt nur noch die Beziehung
✔ 2NF-Gegenprobe: die Note braucht beide Schlüsselteile
✔ 3NF: '1020 = Wien' steht vor dem Fix in zwei Zeilen
✔ 3NF: nach dem Fix existiert die PLZ genau einmal
✔ 3NF-Lösch-Anomalie: Linz bleibt im Fix auch ohne Bestellung sichtbar
✔ 3NF-Einfüge-Anomalie: PLZ 8010 existiert nur in der Faktentabelle
✔ 3NF: ort kommt in keiner anderen Tabelle mehr vor
✔ Quiz 13 konto: Bankumbenennen trifft im Denorm-Fall alle Konten der BLZ
✔ Quiz 13 konto: nach der Zerlegung liefert der JOIN den Banknamen
✔ Interleaving: Bestellung 101 kommt mit Ort und Track-Titeln zurück
ℹ tests 16   ℹ pass 16   ℹ fail 0
```

---

## 5. Aufbau des Projekts

Jede Stufe kommt **zweimal** vor: denormalisiert (Fehlerfall) und normalisiert (Fix). Das
Suffix `Denorm` markiert die kaputte Variante. So ist die Anomalie an einem
`{denorm: n, fix: m}`-Vergleich ablesbar statt nur behauptbar.

| Datei | Inhalt |
|---|---|
| `prisma/schema.prisma` | 18 Modelle — `…Denorm` + 3NF-Pendant je Stufe |
| `src/queries.js` | die vier Demo-Zeilen + 6 Mess-Funktionen |
| `src/seed.js` | Daten der Lesson, idempotent (Kinder vor Eltern) |
| `test/normalize.test.js` | 16 `node:test`-Tests |
| `prisma/migrations/` | `20261007212236_init` |

### Zwei Stolpersteine beim Nachbauen

1. **Seed-Reihenfolge:** `Bestellposition` und `BestellpositionProd` haben einen FK auf
   `Bestellung`, das im ursprünglichen Seed erst später angelegt wurde →
   `ForeignKeyConstraintViolation` (P2003). `Plz`, `Bestellung` und `Bank` müssen vor allen
   Positionen laufen; zum Leeren bleiben die Kinder zuerst.
2. **Migration fehlt im Repo:** `prisma/schema.prisma` allein legt keine Tabellen an —
   ohne `npm run db:migrate` schlägt die erste Query mit
   `TableDoesNotExist` (P2021) fehl.

---

## 6. Reflexion

Die Normalformen sind in dieser Übung vor allem eine **Begründungsdisziplin**, keine
Rechenaufgabe: `bestellung_denorm` verletzt genau eine Form, aber welche genau das ist,
lässt sich nur über die funktionalen Abhängigkeiten entscheiden — und die verrät erst der
Schlüssel. Bei einfachem Primärschlüssel sind 1NF und 2NF per Definition erfüllt, der ganze
Fehler steckt in der transitiven Kette. Wer das überspringt und direkt „die redundante Spalte
raus" sagt, baut am falschen Ende: `ort` muss nicht gelöscht, sondern **ausgelagert** werden,
weil es eine eigene Tatsache ist (`1020` hat einen Ort), die auch ohne Bestellung gilt.

Prisma hat hier einen unerwarteten Zusatznutzen: die Zerlegung ist im Schema nicht nur
beschrieben, sondern erzwungen. `Bestellung` hat kein `ort`-Feld — der Client könnte einen
Zugriff darauf gar nicht typisieren. Die Normalform wird damit vom Compiler geprüft statt vom
Reviewer. Umgekehrt kostet die Schema-Duplizierung (18 Modelle für 9 Sachverhalte), und genau
diese Doppelung ist der eigentliche Beweiswert: Weil Denorm und Fix dieselben Queries
ausführen und unterschiedliche Zahlen liefern, ist die Aussage „die Zerlegung behebt die
Anomalie" **belegt** und nicht behauptet — ein `denorm: 0` neben `fix: 1` beim Hobby-Suchtest
lässt sich nicht durch Formulierungsgeschick kaschieren.

Die Grenze von Prisma zeigt sich bei den Anomalie-Tests selbst: „Wie viele Zeilen müsste ich
anfassen" lässt sich nur als `count`-Vergleich ausdrücken, nicht als echtes `UPDATE … RETURNING`.
Man misst also den **Aufwand** der Anomalie, nicht führt ihn aus — für den Nachweis reicht
das, für einen echten Migrationslauf wäre rohes SQL die ehrlichere Wahl. Prisma ist hier also
das richtige Werkzeug fürs Beobachten und das falsche fürs Reparieren.

Und ein methodischer Punkt, der mir beim Schreiben auffiel: die interessanteste Zeile ist
`3NF-Einfüge-Anomalie: PLZ 8010 existiert nur in der Faktentabelle` —
`denormZeilen: 0` bei gleichzeitig drei PLZ-Zeilen. Ein Wert, der *nirgends* auftaucht, ist im
Denorm-Fall nicht nur unpraktisch, sondern prinzipiell **nicht darstellbar**. Diese eine Zahl
ist das stärkste Argument für die ganze Zerlegung, stärker als jede Redundanzzählung.

---

## Dateien in dieser Lösung

| Datei | Änderung |
|---|---|
| `loesung.md` | dieses Dokument |
| `praxis/prisma/migrations/20261007212236_init/migration.sql` | Migration für alle 18 Modelle |
| `praxis/src/seed.js` | Elterntabellen (`Plz`, `Bestellung`, `Bank`) nach vorn — FK-Reihenfolge |