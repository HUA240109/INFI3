// test/normalize.test.js — node:test (eingebaut, keine Zusatz-Abhängigkeit).
//
// Jeder Test prüft eine Normalform an einem messbaren Query-Ergebnis:
// die Anomalie muss im Denorm-Fall sichtbar und im Fix-Fall weg sein.
// Voraussetzung: `npm run db:seed`.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/prisma.js";
import {
  bankUmbenennenAufwand,
  bestellungMitTracks,
  hobbySpeicherorte,
  hobbySucheMitFix,
  hobbySucheOhneFix,
  loeschAnomalie,
  ortSpeicherorte,
  plzOhneBestellung,
  titelRedundanz,
  titelUmbenennenAufwand,
} from "../src/queries.js";

before(async () => {
  assert.ok(
    (await prisma.plz.count()) > 0,
    "Bitte zuerst `npm run db:seed` ausführen.",
  );
});

after(async () => {
  await prisma.$disconnect();
});

// ------------------------------------------------------------------ 1NF

test("1NF: Gleichheitssuche auf der Sammelzelle findet nichts", async () => {
  assert.equal(await hobbySucheOhneFix("Schwimmen"), 0);
});

test("1NF: nach dem Fix trifft derselbe Gleichheitsvergleich", async () => {
  assert.equal(await hobbySucheMitFix("Schwimmen"), 1);
});

test("1NF: 'Lesen' liegt vor dem Fix nur in der Sammelzelle vor", async () => {
  assert.deepEqual(await hobbySpeicherorte("Lesen"), { denorm: 1, fix: 1 });
});

test("1NF: Wiederholgruppe wird zur Zeile pro Vorkommen", async () => {
  const denorm = await prisma.bestellungRepeat.findUnique({ where: { bestellNr: 101 } });
  const fix = await prisma.bestellposition.count({ where: { bestellNr: 101 } });
  // 3 Spalten, 2 belegt -> 2 Zeilen in der Kindtabelle
  assert.equal(denorm.track1, 1);
  assert.equal(denorm.track2, 2);
  assert.equal(denorm.track3, null);
  assert.equal(fix, 2);
});

// ------------------------------------------------------------------ 2NF

test("2NF: Titelumbenennen kostet im Denorm-Fall mehrere Zeilen", async () => {
  assert.deepEqual(await titelUmbenennenAufwand(1), { denorm: 2, fix: 1 });
});

test("2NF: der Titel steht im Denorm-Fall doppelt im Speicher", async () => {
  const r = await titelRedundanz(1);
  assert.deepEqual(r.gespeichert, ["Silent Lines", "Silent Lines"]);
  assert.deepEqual(r.playlists, [10, 20]);
  assert.equal(r.einmal, "Silent Lines");
});

test("2NF: Zwischentabelle trägt nur noch die Beziehung", async () => {
  const zeile = await prisma.songPlaylist.findUnique({
    where: { songId_playlistId: { songId: 1, playlistId: 10 } },
    select: { songId: true, playlistId: true },
  });
  assert.deepEqual(zeile, { songId: 1, playlistId: 10 });
});

test("2NF-Gegenprobe: die Note braucht beide Schlüsselteile", async () => {
  // Prüfung 9: note hängt am ganzen PK -> nichts auszulagern, bleibt 3NF.
  const zeilen = await prisma.pruefung.count();
  assert.equal(zeilen, 3);
  const proMatr = await prisma.pruefung.groupBy({ by: ["matrNr"], _count: { _all: true } });
  assert.equal(proMatr.find((p) => p.matrNr === 1)._count._all, 2);
});

// ------------------------------------------------------------------ 3NF

test("3NF: '1020 = Wien' steht vor dem Fix in zwei Zeilen", async () => {
  assert.deepEqual(await ortSpeicherorte("1020"), { denorm: 2, fix: 1 });
});

test("3NF: nach dem Fix existiert die PLZ genau einmal", async () => {
  const plz = await prisma.plz.findUnique({ where: { plz: "1020" } });
  assert.equal(plz.ort, "Wien");
});

test("3NF-Lösch-Anomalie: Linz bleibt im Fix auch ohne Bestellung sichtbar", async () => {
  const r = await loeschAnomalie("4020");
  assert.ok(r.imDenormSichtbar.has("Linz"));
  assert.ok(r.imFixSichtbar.has("Linz"));
});

test("3NF-Einfüge-Anomalie: PLZ 8010 existiert nur in der Faktentabelle", async () => {
  const r = await plzOhneBestellung();
  assert.equal(r.plzTabellenZeilen, 3);
  assert.equal(r.denormZeilen, 0);
});

test("3NF: ort kommt in keiner anderen Tabelle mehr vor", async () => {
  // Ein SELECT * über bestellung_denorm liefert die Spalte `ort`;
  // über die normalisierte Bestellung nicht mehr.
  const denorm = await prisma.bestellungDenorm.findMany({ select: { ort: true } });
  const fix = await prisma.bestellung.findMany({ select: { plz: true } });
  assert.ok(denorm[0].ort);
  assert.equal(Object.hasOwn(fix[0], "ort"), false);
});

// ------------------------------------------------------------ Quiz-Tabelle

test("Quiz 13 konto: Bankumbenennen trifft im Denorm-Fall alle Konten der BLZ", async () => {
  assert.deepEqual(await bankUmbenennenAufwand("1000"), { denorm: 2, fix: 1 });
});

test("Quiz 13 konto: nach der Zerlegung liefert der JOIN den Banknamen", async () => {
  const konten = await prisma.konto.findMany({
    where: { blz: "1000" },
    select: { iban: true, inhaber: true, bank: { select: { name: true } } },
    orderBy: { iban: "asc" },
  });
  assert.deepEqual(konten, [
    { iban: "AT01", inhaber: "Auer", bank: { name: "Erste Bank" } },
    { iban: "AT02", inhaber: "Beck", bank: { name: "Erste Bank" } },
  ]);
});

// ------------------------------------------------------------ Interleaving

test("Interleaving: Bestellung 101 kommt mit Ort und Track-Titeln zurück", async () => {
  const b = await bestellungMitTracks(101);
  assert.deepEqual(b, {
    bestellNr: 101,
    kunde: "Auer",
    ort: "1020 Wien",
    tracks: ["1. Silent Lines", "2. Night Ferry"],
  });
});