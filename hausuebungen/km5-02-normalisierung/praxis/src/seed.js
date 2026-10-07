// src/seed.js — befüllt die Demo-DB mit den Daten der Lesson.
//
// Idempotent: erst leer machen (Kinder vor Eltern, wegen Fremdschlüsseln),
// dann in Abhängigkeits-Reihenfolge wieder füllen.
import { prisma } from "./prisma.js";

// Reihenfolge: von den Kindern zu den Eltern, weil SQLite Fremdschlüssel prüft.
const KINDER_ZUERST = [
  "bestellungRepeat",
  "kundeDenorm",
  "songPlaylistDenorm",
  "bestellpositionProdDenorm",
  "bestellposition",
  "hobby",
  "songPlaylist",
  "pruefung",
  "kontoDenorm",
  "bestellungDenorm",
  "song",
  "playlist",
  "produkt",
  "plz",
  "bestellung",
  "bank",
  "konto",
];

async function leeren() {
  for (const tabelle of KINDER_ZUERST) {
    await prisma[tabelle].deleteMany();
  }
}

async function main() {
  await leeren();

  // ---- Elterntabellen zuerst ----
  // `Bestellung` wird von `Bestellposition` und `BestellpositionProd` per FK
  // referenziert, `Plz` von `Bestellung` — also muss beides vor allen
  // Positionen existieren, sonst bricht der Seed am Fremdschlüssel ab.
  await prisma.plz.createMany({
    data: [
      { plz: "1020", ort: "Wien" },
      { plz: "4020", ort: "Linz" },
      { plz: "8010", ort: "Graz" },
    ],
  });
  await prisma.bestellung.createMany({
    data: [
      { bestellNr: 101, kunde: "Auer", plz: "1020" },
      { bestellNr: 102, kunde: "Beck", plz: "1020" },
      { bestellNr: 103, kunde: "Cevik", plz: "4020" },
    ],
  });
  await prisma.bank.createMany({
    data: [
      { blz: "1000", name: "Erste Bank" },
      { blz: "20111", name: "Bank Austria" },
    ],
  });

  // ---------------- 1NF: Liste in einer Zelle ----------------
  await prisma.kundeDenorm.createMany({
    data: [
      { kundeId: 1, name: "Auer", hobbys: "Lesen, Schwimmen" },
      { kundeId: 2, name: "Beck", hobbys: "Schach" },
      { kundeId: 3, name: "Cevik", hobbys: "Radfahren, Wandern, Kochen" },
    ],
  });
  // 1NF-Fix: eine Zeile pro Wert.
  await prisma.hobby.createMany({
    data: [
      { kundeId: 1, hobby: "Lesen" },
      { kundeId: 1, hobby: "Schwimmen" },
      { kundeId: 2, hobby: "Schach" },
      { kundeId: 3, hobby: "Radfahren" },
      { kundeId: 3, hobby: "Wandern" },
      { kundeId: 3, hobby: "Kochen" },
    ],
  });

  // ---------------- 1NF: Wiederholgruppe als Spalten ----------------
  await prisma.song.createMany({
    data: [
      { songId: 1, titel: "Silent Lines", dauerSek: 215 },
      { songId: 2, titel: "Night Ferry", dauerSek: 240 },
      { songId: 3, titel: "Dust Choir", dauerSek: 198 },
      { songId: 4, titel: "Harbour Line", dauerSek: 262 },
      { songId: 5, titel: "Amber Rain", dauerSek: 231 },
    ],
  });

  await prisma.bestellungRepeat.createMany({
    data: [
      { bestellNr: 101, kunde: "Auer", track1: 1, track2: 2, track3: null },
      { bestellNr: 102, kunde: "Beck", track1: 3, track2: null, track3: null },
      { bestellNr: 103, kunde: "Cevik", track1: null, track2: null, track3: 4 },
    ],
  });
  // 1NF-Fix: eine Zeile pro Vorkommen, mit Positionsnummer.
  await prisma.bestellposition.createMany({
    data: [
      { bestellNr: 101, position: 1, trackId: 1 },
      { bestellNr: 101, position: 2, trackId: 2 },
      { bestellNr: 102, position: 1, trackId: 3 },
      { bestellNr: 103, position: 1, trackId: 4 },
    ],
  });

  // ---------------- 2NF: partielle Abhängigkeit ----------------
  await prisma.playlist.createMany({
    data: [
      { playlistId: 10, name: "Fokus" },
      { playlistId: 20, name: "Nachtfahrt" },
      { playlistId: 30, name: "Regen" },
    ],
  });
  await prisma.songPlaylistDenorm.createMany({
    data: [
      { songId: 1, playlistId: 10, songTitel: "Silent Lines" },
      { songId: 1, playlistId: 20, songTitel: "Silent Lines" },
      { songId: 2, playlistId: 20, songTitel: "Night Ferry" },
      { songId: 5, playlistId: 30, songTitel: "Amber Rain" },
    ],
  });
  await prisma.songPlaylist.createMany({
    data: [
      { songId: 1, playlistId: 10 },
      { songId: 1, playlistId: 20 },
      { songId: 2, playlistId: 20 },
      { songId: 5, playlistId: 30 },
    ],
  });

  await prisma.produkt.createMany({
    data: [
      { produktNr: 1, name: "Kabel" },
      { produktNr: 2, name: "Stecker" },
      { produktNr: 3, name: "Adapter" },
    ],
  });
  await prisma.bestellpositionProdDenorm.createMany({
    data: [
      { bestellNr: 101, produktNr: 1, menge: 2, produktName: "Kabel" },
      { bestellNr: 101, produktNr: 2, menge: 1, produktName: "Stecker" },
      { bestellNr: 102, produktNr: 1, menge: 5, produktName: "Kabel" },
    ],
  });
  await prisma.bestellpositionProd.createMany({
    data: [
      { bestellNr: 101, produktNr: 1, menge: 2 },
      { bestellNr: 101, produktNr: 2, menge: 1 },
      { bestellNr: 102, produktNr: 1, menge: 5 },
    ],
  });

  // Gegenprobe Quiz 9: die Note braucht beide Schlüsselteile.
  await prisma.pruefung.createMany({
    data: [
      { matrNr: 1, lvNr: "DBI", note: 1 },
      { matrNr: 1, lvNr: "SWP", note: 2 },
      { matrNr: 2, lvNr: "DBI", note: 3 },
    ],
  });

  // ---------------- 3NF: transitive Abhängigkeit ----------------
  // Die Denorm-Variante speichert `ort` mit; Plz und Bestellung stehen oben.
  await prisma.bestellungDenorm.createMany({
    data: [
      { bestellNr: 101, kunde: "Auer", plz: "1020", ort: "Wien" },
      { bestellNr: 102, kunde: "Beck", plz: "1020", ort: "Wien" },
      { bestellNr: 103, kunde: "Cevik", plz: "4020", ort: "Linz" },
    ],
  });

  // ---------------- Quiz-Tabelle konto: iban → blz → bankname ----------------
  await prisma.kontoDenorm.createMany({
    data: [
      { iban: "AT01", inhaber: "Auer", blz: "1000", bankname: "Erste Bank" },
      { iban: "AT02", inhaber: "Beck", blz: "1000", bankname: "Erste Bank" },
      { iban: "AT03", inhaber: "Cevik", blz: "20111", bankname: "Bank Austria" },
    ],
  });
  await prisma.konto.createMany({
    data: [
      { iban: "AT01", inhaber: "Auer", blz: "1000" },
      { iban: "AT02", inhaber: "Beck", blz: "1000" },
      { iban: "AT03", inhaber: "Cevik", blz: "20111" },
    ],
  });

  console.log(
    `Seed fertig: ${await prisma.song.count()} Songs, ` +
      `${await prisma.bestellungDenorm.count()} denorm-Bestellungen, ` +
      `${await prisma.plz.count()} PLZ, ${await prisma.konto.count()} Konten.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });