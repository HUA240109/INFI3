-- HÜ INFI 3AHWII X — KM5-04: Fünf Auffrischungs-Queries (Lesson 0001 §4)
-- Voraussetzung: Mini-Musik-DB aus dem Unterricht (seed-musik-mini.sql).
-- Ausführen: sqlite3 musik-mini.db < auffrischung.sql
-- Tabellen: label(id, name), kuenstler(id, name, label_id), song(id, titel, dauer_sek, kuenstler_id)

-- 1. Top 5: Künstler mit den meisten Songs.
--    JOIN verbindet Künstler und Songs, GROUP BY fasst je Künstler zusammen,
--    ORDER BY ... DESC + LIMIT schneidet die fünf größten Gruppen ab.
--    Der zweite Sortierschlüssel (k.name) macht Gleichstände reproduzierbar.
SELECT k.name, COUNT(*) AS tracks
FROM kuenstler k
JOIN song s ON s.kuenstler_id = k.id
GROUP BY k.id, k.name
ORDER BY tracks DESC, k.name ASC
LIMIT 5;

-- 2. Self-JOIN: alle Künstlerpaare desselben Labels.
--    Dieselbe Tabelle wird zweimal mit den Aliasen x und y verbunden;
--    x.id < y.id verhindert Doppelpaare (A,B)/(B,A) und Selbstpaare (A,A).
SELECT x.name AS a, y.name AS b, l.name AS label
FROM kuenstler x
JOIN kuenstler y ON x.label_id = y.label_id AND x.id < y.id
JOIN label l ON l.id = x.label_id
ORDER BY l.name, a, b;

-- 3. HAVING: Labels mit mehr als einem Künstler.
--    WHERE filtert Zeilen vor der Gruppierung, HAVING filtert fertige
--    Gruppen nach einem Aggregat (hier COUNT(*)).
SELECT l.name, COUNT(*) AS kuenstler_anzahl
FROM kuenstler k
JOIN label l ON l.id = k.label_id
GROUP BY l.id, l.name
HAVING COUNT(*) > 1
ORDER BY l.name;

-- 4. COUNT(*) vs. COUNT(label_id): Zeilen vs. Zeilen mit Wert.
--    COUNT(*) zählt jede Künstlerzeile, COUNT(label_id) überspringt NULL.
--    "Frei" hat kein Label, daher erwartet der Mini-Seed 6 gesamt / 5 mit Label.
SELECT COUNT(*) AS alle, COUNT(label_id) AS mit_label
FROM kuenstler;

-- 5. WHERE + HAVING: Künstler mit mindestens zwei Songs über 200 Sekunden.
--    WHERE reduziert die Songs vor der Gruppierung auf die langen (> 200 s),
--    HAVING filtert danach die Gruppen auf mindestens zwei Treffer.
SELECT k.name, COUNT(*) AS lange_songs
FROM kuenstler k
JOIN song s ON s.kuenstler_id = k.id
WHERE s.dauer_sek > 200
GROUP BY k.id, k.name
HAVING COUNT(*) >= 2
ORDER BY k.name;
