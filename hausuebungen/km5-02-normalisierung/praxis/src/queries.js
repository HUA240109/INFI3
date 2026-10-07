// src/queries.js — die Normalisierungs-Demo als Prisma-Query-API.
//
// `npm run demo` gibt die vier Konsolenzeilen der Hausaufgabe aus. Jede Zeile
// vergleicht denselben Sachverhalt in der denormalisierten und der normalisierten
// Variante — die Anomalie wird also gemessen, nicht behauptet.
import { pathToFileURL } from "node:url";
import { prisma } from "./prisma.js";

// ---------------------------------------------------------------- 1NF

/// Verletzung A: `hobbys = 'Lesen, Schwimmen'` ist eine Liste in einer Zelle.
/// Der Gleichheitsvergleich findet "Schwimmen" nicht — die Anomalie in Zahlen.
export async function hobbySucheOhneFix(hobby = "Schwimmen") {
  const treffer = await prisma.kundeDenorm.findMany({
    where: { hobbys: hobby },
    select: { kundeId: true, name: true, hobbys: true },
  });
  return treffer.length;
}

/// 1NF-Fix: eine Zeile pro Wert → derselbe Gleichheitsvergriff trifft.
export async function hobbySucheMitFix(hobby = "Schwimmen") {
  const treffer = await prisma.hobby.findMany({
    where: { hobby },
    select: { kundeId: true, hobby: true },
  });
  return treffer.length;
}

/// Wie oft liegt derselbe Wert in einer Zelle? Vor dem Fix einmal,
/// nach dem Fix einmal pro Kunde.
export async function hobbySpeicherorte(hobby = "Schwimmen") {
  const denorm = await prisma.kundeDenorm.count({
    where: { hobbys: { contains: hobby } },
  });
  const fix = await prisma.hobby.count({ where: { hobby } });
  return { denorm, fix };
}

// ---------------------------------------------------------------- 2NF

/// Wie viele Zeilen müssten angefasst werden, wenn der Titel von `songId`
/// umbenannt würde? Das ist die Änderungs-Anomalie der 2NF.
export async function titelUmbenennenAufwand(songId = 1) {
  const denorm = await prisma.songPlaylistDenorm.count({ where: { songId } });
  const fix = await prisma.song.count({ where: { songId } });
  return { denorm, fix };
}

/// Verletzung: derselbe Titel steht mehrfach im Speicher.
export async function titelRedundanz(songId = 1) {
  const zeilen = await prisma.songPlaylistDenorm.findMany({
    where: { songId },
    select: { songTitel: true, playlistId: true },
    orderBy: { playlistId: "asc" },
  });
  const titel = await prisma.song.findUnique({
    where: { songId },
    select: { titel: true },
  });
  return {
    gespeichert: zeilen.map((z) => z.songTitel),
    playlists: zeilen.map((z) => z.playlistId),
    einmal: titel?.titel ?? null,
  };
}

// ---------------------------------------------------------------- 3NF

/// Wie oft steht "1020 = Wien" im Speicher? Vor dem Fix n+1, nach dem Fix 1.
export async function ortSpeicherorte(plz = "1020") {
  const denorm = await prisma.bestellungDenorm.count({ where: { plz } });
  const fix = await prisma.plz.count({ where: { plz } });
  return { denorm, fix };
}

/// Lösch-Anomalie: Was passiert, wenn die letzte 4020-Bestellung weg ist?
/// Im Denorm-Fall verschwindet das Wissen "4020 = Linz" mit.
export async function loeschAnomalie(plz = "4020") {
  const denorm = await prisma.bestellungDenorm.findMany({
    where: { plz },
    select: { ort: true },
  });
  const fix = await prisma.plz.findMany({ where: { plz }, select: { ort: true } });
  return {
    imDenormSichtbar: new Set(denorm.map((d) => d.ort)),
    imFixSichtbar: new Set(fix.map((f) => f.ort)),
  };
}

/// Einfüge-Anomalie: Eine neue PLZ ohne Bestellung ist im Denorm-Fall nicht
/// speicherbar (es gibt keine Zeile, in der sie stehen könnte), im Fix schon.
export async function plzOhneBestellung() {
  const imFix = await prisma.plz.count();
  const imDenorm = await prisma.bestellungDenorm.count({
    where: { plz: "8010" },
  });
  return { plzTabellenZeilen: imFix, denormZeilen: imDenorm };
}

// ------------------------------------------------------- Interleaving

/// Die ursprüngliche Abfrage nach der Zerlegung: Bestellung inklusive
/// Track-Titeln und Ort. Drei Tabellen, zwei JOINs, ein Ergebnis wie vorher.
export async function bestellungMitTracks(bestellNr = 101) {
  const bestellung = await prisma.bestellung.findUnique({
    where: { bestellNr },
    select: {
      bestellNr: true,
      kunde: true,
      plz: true,
      plzOrt: { select: { ort: true } },
      tracks: {
        select: { position: true, song: { select: { titel: true, dauerSek: true } } },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!bestellung) return null;
  return {
    bestellNr: bestellung.bestellNr,
    kunde: bestellung.kunde,
    ort: `${bestellung.plz} ${bestellung.plzOrt.ort}`,
    tracks: bestellung.tracks.map((t) => `${t.position}. ${t.song.titel}`),
  };
}

// --------------------------------------------------------- Quiz-Tabelle

/// Quiz 13: konto(iban PK, inhaber, blz, bankname) — die Kette
/// iban → blz → bankname. Umbenennen der Bank kostet n Kontozeilen.
export async function bankUmbenennenAufwand(blz = "1000") {
  const denorm = await prisma.kontoDenorm.count({ where: { blz } });
  const fix = await prisma.bank.count({ where: { blz } });
  return { denorm, fix };
}

async function main() {
  console.log(
    "1) 1NF  Hobby 'Schwimmen' gefunden:  denorm",
    await hobbySucheOhneFix(),
    "| normalisiert",
    await hobbySucheMitFix(),
  );
  console.log(
    "2) 2NF  Titelumbenennen = Zeilen:    denorm",
    (await titelUmbenennenAufwand()).denorm,
    "| normalisiert",
    (await titelUmbenennenAufwand()).fix,
  );
  console.log(
    "3) 3NF  '1020 = Wien' gespeichert:  denorm",
    (await ortSpeicherorte()).denorm,
    "| normalisiert",
    (await ortSpeicherorte()).fix,
  );
  console.log("4) JOIN Bestellung 101:", await bestellungMitTracks(101));
}

// Nur ausführen, wenn direkt gestartet (nicht beim Import im Test).
// Pfad-Plattformunabhängig: `file://${process.argv[1]}` bricht unter Windows.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}