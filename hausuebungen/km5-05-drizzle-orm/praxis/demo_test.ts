// demo_test.ts — Tests zur Drizzle-Einstiegs-Lesson (In-Memory-DB).
import { assertEquals, assertThrows } from "@std/assert";
import { and, asc, count, desc, eq, like } from "drizzle-orm";
import { oeffneDb } from "./db.ts";
import { album, artist, track } from "./schema.ts";

function testDb() {
  const db = oeffneDb(":memory:");
  return db;
}

Deno.test("insert mit returning liefert die neue Zeile mit id", async () => {
  const db = testDb();
  const neu = await db.insert(artist)
    .values({ name: "Aera", gruendungsjahr: 1999 })
    .returning();
  assertEquals(neu.length, 1);
  assertEquals(neu[0].id, 1);
  assertEquals(neu[0].name, "Aera");
});

Deno.test("select mit where filtert typsicher", async () => {
  const db = testDb();
  const a = await db.insert(artist)
    .values({ name: "Aera", gruendungsjahr: 1999 })
    .returning();
  await db.insert(artist).values({ name: "Nova", gruendungsjahr: 2012 });
  const treffer = await db.select().from(artist)
    .where(eq(artist.gruendungsjahr, 2012));
  assertEquals(treffer.length, 1);
  assertEquals(treffer[0].name, "Nova");
  // a nur verwenden, damit der Import nicht als unbenutzt gilt:
  assertEquals(a[0].gruendungsjahr, 1999);
});

Deno.test("Fremdschlüssel verhindert Album ohne Artist", async () => {
  const db = testDb();
  await db.insert(artist).values({ name: "Aera", gruendungsjahr: 1999 });
  const fehler = await db.insert(album)
    .values({ titel: "Ohne Herkunft", jahr: 2020, artistId: 99 })
    .catch((e) => e);
  assertEquals(String(fehler?.cause ?? fehler).includes("FOREIGN KEY"), true);
});

Deno.test("update aendert nur die gewaehlten Zeilen", async () => {
  const db = testDb();
  const a = await db.insert(artist)
    .values({ name: "Aera", gruendungsjahr: 1999 })
    .returning();
  const al = await db.insert(album)
    .values({ titel: "Silent Lines", jahr: 2015, artistId: a[0].id })
    .returning();
  await db.insert(track)
    .values({ titel: "Silent Lines", dauerSek: 215, albumId: al[0].id });
  await db.insert(track)
    .values({ titel: "Echo Room", dauerSek: 187, albumId: al[0].id });

  await db.update(track)
    .set({ dauerSek: 220 })
    .where(and(eq(track.albumId, al[0].id), like(track.titel, "Silent%")));

  const tracks = await db.select().from(track).orderBy(track.id);
  assertEquals(tracks[0].dauerSek, 220);
  assertEquals(tracks[1].dauerSek, 187); // unberuehrt
});

Deno.test("delete entfernt nur die gewaehlte Zeile", async () => {
  const db = testDb();
  const a = await db.insert(artist)
    .values({ name: "Aera", gruendungsjahr: 1999 })
    .returning();
  const al = await db.insert(album)
    .values({ titel: "Silent Lines", jahr: 2015, artistId: a[0].id })
    .returning();
  await db.insert(track)
    .values({ titel: "Silent Lines", dauerSek: 215, albumId: al[0].id });
  await db.insert(track)
    .values({ titel: "Echo Room", dauerSek: 187, albumId: al[0].id });

  await db.delete(track).where(eq(track.titel, "Echo Room"));
  const rest = await db.select({ anzahl: count() }).from(track);
  assertEquals(rest[0].anzahl, 1);
});

Deno.test("orderBy + limit liefern das juengste Album", async () => {
  const db = testDb();
  const a = await db.insert(artist)
    .values({ name: "Aera", gruendungsjahr: 1999 })
    .returning();
  await db.insert(album)
    .values({ titel: "Night Ferry", jahr: 2012, artistId: a[0].id });
  await db.insert(album)
    .values({ titel: "Silent Lines", jahr: 2015, artistId: a[0].id });

  const neueste = await db.select().from(album)
    .orderBy(desc(album.jahr)).limit(1);
  assertEquals(neueste[0].titel, "Silent Lines");
});

Deno.test("innerJoin verbindet Album und Artist", async () => {
  const db = testDb();
  const a = await db.insert(artist)
    .values({ name: "Aera", gruendungsjahr: 1999 })
    .returning();
  await db.insert(album)
    .values({ titel: "Silent Lines", jahr: 2015, artistId: a[0].id });

  const joined = await db
    .select({ titel: album.titel, artist: artist.name })
    .from(album)
    .innerJoin(artist, eq(album.artistId, artist.id));
  assertEquals(joined, [{ titel: "Silent Lines", artist: "Aera" }]);
});

Deno.test("Drizzle parametrisiert: Werte stecken in params, nicht im SQL", () => {
  const db = testDb();
  const fragen = db.select().from(album).where(eq(album.jahr, 2015));
  const { sql, params } = fragen.toSQL();
  assertEquals(sql.includes("2015"), false); // kein Wert im SQL-Text
  assertEquals(params, [2015]); // der Wert steckt als Parameter
});

Deno.test("assertThrows ist importiert und steht bereit", () => {
  // Platzhalter, um den Import nicht sterben zu lassen — echte FK-Prüfung
  // oben über .catch() und String-Match (node:sqlite wirft asynchron).
  assertThrows(
    () => {
      throw new Error("FOREIGN KEY constraint failed");
    },
    Error,
    "FOREIGN KEY",
  );
});

// --- Hausuebung KM5-05: die drei ergaenzten Queries --------------------

// Fixture: drei Alben, das mittlere mit zwei "Echo"-Titeln + einem anderen.
async function demoDb() {
  const db = testDb();
  const a = await db.insert(artist)
    .values({ name: "Aera", gruendungsjahr: 1999 })
    .returning();
  await db.insert(album)
    .values({ titel: "Silent Lines", jahr: 2015, artistId: a[0].id });
  const echo = await db.insert(album)
    .values({ titel: "Echoes Over Harbour", jahr: 2020, artistId: a[0].id })
    .returning();
  await db.insert(album)
    .values({ titel: "Night Ferry", jahr: 2012, artistId: a[0].id });
  const still = await db.select().from(album).where(
    eq(album.titel, "Silent Lines"),
  );
  await db.insert(track)
    .values({ titel: "Silent Lines", dauerSek: 215, albumId: still[0].id });
  await db.insert(track)
    .values({ titel: "Echo Room", dauerSek: 187, albumId: still[0].id });
  await db.insert(track).values(
    { titel: "Echoes Over Harbour", dauerSek: 245, albumId: echo[0].id },
  );
  await db.insert(track)
    .values({ titel: "Echo Chamber", dauerSek: 198, albumId: echo[0].id });
  await db.insert(track)
    .values({ titel: "Harbour Lights", dauerSek: 160, albumId: echo[0].id });
  return { db, a };
}

Deno.test("orderBy(asc) + limit liefern das aelteste Album", async () => {
  const { db } = await demoDb();
  const aelteste = await db.select().from(album)
    .orderBy(asc(album.jahr))
    .limit(1);
  assertEquals(aelteste.length, 1);
  assertEquals(aelteste[0].titel, "Night Ferry");
  assertEquals(aelteste[0].jahr, 2012);
});

Deno.test("limit parametrisiert mit — die Zahl steht nicht im SQL-Text", () => {
  const db = testDb();
  const frage = db.select().from(album).orderBy(asc(album.jahr)).limit(1);
  const { sql, params } = frage.toSQL();
  assertEquals(sql.includes("limit ?"), true);
  assertEquals(sql.includes("limit 1"), false);
  assertEquals(params, [1]);
});

Deno.test("and + eq + like: Echo-Titel nur im passenden Album", async () => {
  const { db } = await demoDb();
  const ziel = await db.select().from(album)
    .where(eq(album.titel, "Echoes Over Harbour"));

  const treffer = await db
    .select({ titel: track.titel, dauerSek: track.dauerSek })
    .from(track)
    .where(and(eq(track.albumId, ziel[0].id), like(track.titel, "Echo%")))
    .orderBy(track.id);
  // "Harbour Lights" faellt raus (kein Echo-Anfang), "Silent Lines" und
  // "Echo Room" liegen im anderen Album (eq greift nicht).
  assertEquals(treffer.map((t) => t.titel), [
    "Echoes Over Harbour",
    "Echo Chamber",
  ]);
});

Deno.test("and erzeugt genau eine geklammerte WHERE-Bedingung", () => {
  const db = testDb();
  const frage = db.select().from(track)
    .where(and(eq(track.albumId, 3), like(track.titel, "Echo%")));
  const { sql, params } = frage.toSQL();
  assertEquals(
    sql,
    `select "id", "titel", "dauer_sek", "album_id" from "track" where (("track"."album_id" = ?) and ("track"."titel" like ?))`,
  );
  assertEquals(params, [3, "Echo%"]);
});

Deno.test("count + groupBy zaehlt die Tracks je Album", async () => {
  const { db } = await demoDb();
  const proAlbum = await db
    .select({ albumId: album.id, titel: album.titel, tracks: count() })
    .from(track)
    .innerJoin(album, eq(track.albumId, album.id))
    .groupBy(album.id, album.titel)
    .orderBy(album.id);
  assertEquals(proAlbum, [
    { albumId: 1, titel: "Silent Lines", tracks: 2 },
    { albumId: 2, titel: "Echoes Over Harbour", tracks: 3 },
  ]);
});

Deno.test("innerJoin laesst das Album ohne Tracks weg — leftJoin nicht", async () => {
  const { db } = await demoDb();
  const mitInner = await db
    .select({ titel: album.titel, tracks: count() })
    .from(track)
    .innerJoin(album, eq(track.albumId, album.id))
    .groupBy(album.id, album.titel)
    .orderBy(album.id);
  assertEquals(
    mitInner.some((zeile) => zeile.titel === "Night Ferry"),
    false,
  );

  // Gegenprobe: ab album aus JOINen + COUNT(track.id) statt COUNT(*)
  // zaehlt das leere Album ehrlich als 0.
  const mitLeft = await db
    .select({ titel: album.titel, tracks: count(track.id) })
    .from(album)
    .leftJoin(track, eq(track.albumId, album.id))
    .groupBy(album.id, album.titel)
    .orderBy(album.id);
  assertEquals(mitLeft, [
    // nach album.id, nicht alphabetisch: die Album wurden in dieser
    // Reihenfolge angelegt (Silent Lines, Echoes, Night Ferry).
    { titel: "Silent Lines", tracks: 2 },
    { titel: "Echoes Over Harbour", tracks: 3 },
    { titel: "Night Ferry", tracks: 0 },
  ]);
});
