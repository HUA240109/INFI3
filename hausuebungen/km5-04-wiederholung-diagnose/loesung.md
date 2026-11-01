# HÜ — KM5-04: Wiederholung & Diagnose (UE 2026-09-29)

Abgabe der beiden HÜ-Teile aus der Stunde „Rep ohne Node“:

1. Fünf Auffrischungs-Queries aus Lesson 0001 §4 → [`auffrischung.sql`](auffrischung.sql)
2. Leseauftrag Frage 6, schriftlich (5–6 Sätze) → Abschnitt 2 unten

---

## 1. Die fünf Auffrischungs-Queries

Datei: [`auffrischung.sql`](auffrischung.sql). Jede Query trägt einen Kommentar,
was sie beantwortet.

```bash
sqlite3 musik-mini.db < seed-musik-mini.sql
sqlite3 musik-mini.db < auffrischung.sql
```

Gegen den Mini-Seed (`label`/`kuenstler`/`song`, 6 Künstler, 10 Songs,
davon „Frei“ ohne Label) liefert das folgende Ergebnisse:

| # | Query | Ergebnis (Mini-Seed) |
|---|-------|----------------------|
| 1 | Top 5 nach Track-Anzahl | Auer 3, Demir 2, Frei 2, Beck 1, Cevik 1 |
| 2 | Self-JOIN: Künstlerpaare je Label | Nordklang: Auer–Beck; Suedton: Cevik–Demir, Cevik–Egger, Demir–Egger |
| 3 | HAVING: Labels mit > 1 Künstler | Nordklang 2, Suedton 3 |
| 4 | `COUNT(*)` vs. `COUNT(label_id)` | 6 gesamt, 5 mit Label |
| 5 | WHERE + HAVING: ≥ 2 Songs über 200 s | Auer 2 |

Was die Queries jeweils zeigen:

- **Top 5 (Query 1):** `JOIN` bringt Künstler und Songs zusammen, `GROUP BY`
  bildet je Künstler eine Gruppe, `COUNT(*)` zählt die Songs darin. `LIMIT 5`
  schneidet erst nach der Sortierung ab.
- **Self-JOIN (Query 2):** `kuenstler` wird zweimal gelesen (`x`, `y`). Die
  Bedingung `x.label_id = y.label_id` findet Paare desselben Labels,
  `x.id < y.id` hält jedes Paar nur einmal und schließt Selbstpaare aus.
- **HAVING (Query 3):** Der Filter `COUNT(*) > 1` gilt für ganze Gruppen und
  gehört deshalb in `HAVING`, nicht in `WHERE`. Westbeat hat 0 Künstler und
  taucht über den `JOIN` gar nicht erst als Gruppe auf.
- **COUNT-Vergleich (Query 4):** `COUNT(*)` zählt alle 6 Zeilen;
  `COUNT(label_id)` überspringt die eine `NULL`-Zeile von „Frei“ und ergibt 5.
- **WHERE + HAVING (Query 5):** `WHERE s.dauer_sek > 200` filtert einzelne
  Songs vor der Gruppierung, `HAVING COUNT(*) >= 2` filtert danach die
  Künstlergruppen. Nur Auer hat zwei Songs über 200 s.

---

## 2. Leseauftrag Frage 6 (HÜ, schriftlich)

**Frage:** Setze den Artikel zu unserer Lage in Beziehung: Deno mit
eingebautem `node:sqlite`, Prisma-7-Adapter-Pflicht (`better-sqlite3` nativ)
und npm-`latest`, das auf einen 8.0.0-RC zeigt. Begründe, warum wir im
Unterricht zuerst reines SQL fahren und ein ORM erst später — und wenn, eher
Drizzle — evaluieren.

**Antwort:**

Der Artikel stellt Prisma als „abstraction-first“ und Drizzle als „SQL-first“
gegenüber, und für unsere Lage ist entscheidend, dass beide ORMs eine
funktionierende Werkzeugkette voraussetzen, die am 22.09. bereits am Setup
gescheitert ist. Prisma 7 verlangt einen eigenen Adapter (bei SQLite nativ
`better-sqlite3`), zusätzlich `prisma generate` und npm-Pakete, deren
`latest`-Tag aktuell auf einen 8.0.0-RC zeigt — das ist für eine Lehrstunde zu
viel bewegliche Infrastruktur. Deno mit eingebautem `node:sqlite` liefert
dagegen ohne `npm:`, ohne `node_modules` und ohne Adapter sofort eine
lauffähige Datenbank, sodass wir uns auf SQL konzentrieren können. Genau
dieses SQL-Handwerk (Self-JOIN, `COUNT(*)` vs. `COUNT(spalte)`, `WHERE` vs.
`HAVING`) brauchen wir, um später überhaupt beurteilen zu können, was ein ORM
uns abnimmt. Deshalb vertagen wir die ORM-Entscheidung und evaluieren erst
nach UE 3, wenn die Abfragen sitzen. Wenn wir dann ein ORM wählen, spricht der
Artikel mit seinem SQL-first-Ansatz, der kleineren Runtime (~12 KB gegenüber
~1,6 MB) und der TypeScript-Definition ohne eigene DSL eher für Drizzle als
für Prisma.
