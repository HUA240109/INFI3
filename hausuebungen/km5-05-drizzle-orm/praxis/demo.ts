// demo.ts — Drizzle ORM am Musik-Katalog: Lesen, Schreiben, Auswerten.
// Zeigt zu jeder Query das erzeugte SQL (toSQL()) — ein ORM ersetzt SQL
// nicht, es erzeugt es. Laufen mit:  deno task demo
import { and, asc, count, desc, eq, like } from "drizzle-orm";
import { oeffneDb } from "./db.ts";
import { album, artist, track } from "./schema.ts";

// Datei-DB im Projektordner — bei jedem Lauf neu anlegen.
await Deno.remove("musik.db").catch(() => {/* Datei fehlt: egal */});
const db = oeffneDb("musik.db");

// --- Schreiben: insert mit .returning() ------------------------------
const aera = await db.insert(artist)
  .values({ name: "Aera", gruendungsjahr: 1999 })
  .returning();
const nova = await db.insert(artist)
  .values({ name: "Nova", gruendungsjahr: 2012 })
  .returning();
const stille = await db.insert(album)
  .values({ titel: "Silent Lines", jahr: 2015, artistId: aera[0].id })
  .returning();
await db.insert(album)
  .values({ titel: "Night Ferry", jahr: 2012, artistId: nova[0].id });
await db.insert(track)
  .values({ titel: "Silent Lines", dauerSek: 215, albumId: stille[0].id });
await db.insert(track)
  .values({ titel: "Echo Room", dauerSek: 187, albumId: stille[0].id });
// Drittes Album (2020) nur fuer die Hausuebungs-Queries: es liefert eine
// zweite Gruppe fuer "Tracks je Album" und drei Titel fuer die Echo-Query —
// zwei Treffer plus "Harbour Lights" als Ausschlusskandidat, damit man sieht,
// dass and + eq + like wirklich filtert und nicht nur passt.
const echo = await db.insert(album)
  .values({ titel: "Echoes Over Harbour", jahr: 2020, artistId: aera[0].id })
  .returning();
await db.insert(track)
  .values({ titel: "Echoes Over Harbour", dauerSek: 245, albumId: echo[0].id });
await db.insert(track)
  .values({ titel: "Echo Chamber", dauerSek: 198, albumId: echo[0].id });
await db.insert(track)
  .values({ titel: "Harbour Lights", dauerSek: 160, albumId: echo[0].id });

// --- Lesen: select .from() .where() ----------------------------------
const fragen = db.select().from(album).where(eq(album.artistId, aera[0].id));
console.log("Lesen, erzeugtes SQL:", fragen.toSQL().sql);
console.log("Lesen, Parameter:", fragen.toSQL().params);
console.log("Lesen, Ergebnis:", await fragen);

// --- Auswerten: orderBy, limit, count --------------------------------
const neueste = await db.select().from(album).orderBy(desc(album.jahr)).limit(
  1,
);
console.log("Neuestes Album:", neueste[0].titel, "(", neueste[0].jahr, ")");

// --- Aufgabe 2a: aeltestes Album (orderBy + limit) --------------------
// aufsteigend sortieren und abschneiden — dieselbe Mechanik wie oben,
// nur in die andere Richtung. Wichtig: auch die limit-Zahl parametrisiert
// Drizzle ("limit ?"), sie steht also nicht im SQL-Text.
const aelteste = db.select({ titel: album.titel, jahr: album.jahr })
  .from(album)
  .orderBy(asc(album.jahr))
  .limit(1);
console.log("Aeltestes Album, SQL:", aelteste.toSQL().sql);
console.log("Aeltestes Album, Parameter:", aelteste.toSQL().params);
console.log("Aeltestes Album:", await aelteste);

// --- Aufgabe 2b: Tracks eines Albums mit Titel-Anfang "Echo" -----------
// and() verbindet die beiden Bedingungen mit AND und Klammert sie; eq()
// vergleicht Gleichheit (Album), like() auf "%" als Muster (Titel-Anfang).
const echoTracks = db
  .select({ titel: track.titel, dauerSek: track.dauerSek })
  .from(track)
  .where(and(eq(track.albumId, echo[0].id), like(track.titel, "Echo%")))
  .orderBy(track.id);
console.log("Echo-Tracks, SQL:", echoTracks.toSQL().sql);
console.log("Echo-Tracks, Parameter:", echoTracks.toSQL().params);
console.log("Echo-Tracks:", await echoTracks);

// --- Aufgabe 2c: Anzahl Tracks je Album (count + groupBy) -------------
// Gegenueber der Scaffold-Version ist das groupBy um album.titel und die
// Projektion um album.id erweitert: SQLite wuerde einen_projizierten Titel
// ohne ihn im groupBy sonst aus der Gruppe "beliebig" auswaehlen.
const tracksProAlbum = db
  .select({ albumId: album.id, titel: album.titel, tracks: count() })
  .from(track)
  .innerJoin(album, eq(track.albumId, album.id))
  .groupBy(album.id, album.titel)
  .orderBy(album.id);
console.log("Tracks pro Album, SQL:", tracksProAlbum.toSQL().sql);
console.log("Tracks pro Album:", await tracksProAlbum);

// --- Ändern: update .set() .where() ----------------------------------
await db.update(track)
  .set({ dauerSek: 220 })
  .where(and(eq(track.albumId, stille[0].id), like(track.titel, "Silent%")));
const korrigiert = await db.select().from(track)
  .where(eq(track.titel, "Silent Lines"));
console.log("Nach update:", korrigiert[0].dauerSek, "Sekunden");

// --- Löschen: delete .where() ----------------------------------------
await db.delete(track).where(eq(track.titel, "Echo Room"));
const rest = await db.select({ anzahl: count() }).from(track);
console.log("Tracks nach delete:", rest[0].anzahl);

db.$client.close();
