// db.ts — Verbindung zur SQLite-Datenbank + Tabellen-Anlage (DDL).
// Deno bleibt die Runtime: node:sqlite ist eingebaut, drizzle-orm ist
// reines TypeScript (npm:-Specifier), es gibt kein node_modules und
// keinen Node-Zwang. Version gepinnt: drizzle-orm 1.0.0-rc.4.
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";

// Drizzle kennt das Schema über die Tabellen-Objekte aus schema.ts —
// daraus erzeugt es typsichere Queries. Die DDL hier hält die DB synchron
// mit dem Schema (bis Migrationen mit drizzle-kit Thema werden).
const DDL = [
  `CREATE TABLE IF NOT EXISTS artist (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     gruendungsjahr INTEGER)`,
  `CREATE TABLE IF NOT EXISTS album (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     titel TEXT NOT NULL,
     jahr INTEGER,
     artist_id INTEGER NOT NULL REFERENCES artist(id))`,
  `CREATE TABLE IF NOT EXISTS track (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     titel TEXT NOT NULL,
     dauer_sek INTEGER NOT NULL,
     album_id INTEGER NOT NULL REFERENCES album(id))`,
];

// Kompatibilitaetsschicht (Hausuebung): Drizzles node-sqlite-Treiber steuert die
// Zeilenform ueber stmt.setReturnArrays(...) — eine better-sqlite3-Methode, die
// Deno in node:sqlite NICHT kennt (dort gibt es nur setReadBigInts). Ohne Shim
// bricht schon die erste Query mit "stmt.setReturnArrays is not a function" ab.
//
// Wichtig: es ist KEIN No-Op. Drizzle laedt Zeilen in zwei Modi: "objects"
// ({ id: 1 }) und "arrays" ([1]) — im arrays-Modus mappt es die Rueckgabe
// POSITIONAL, z.B. bei insert().returning(). Deno liefert dagegen immer
// Objekte, d.h. die Schluessel stehen auf positional undefined und
// .returning() liefert { id: undefined, name: undefined }.
// Die Bruecke: all()/get() liefern bei angefordertem Array-Modus
// Object.values(row) zurueck. Die Schluessel-Reihenfolge eines Zeilenobjekts
// ist die Einfuegereihenfolge und damit die Spaltenreihenfolge des
// SELECT/RESULTING — genau die Reihenfolge, die Drizzle positional liest.
type Zeile = Record<string, unknown>;

// node:sqlite typisiert all/get mit Ueberladungen (positional + named), die
// Drizzle nicht einhaelt. Der Shim arbeitet deshalb bewusst auf einer eigenen,
// flachen Typisierung und castet genau einmal zurueck.
type FlacheAnweisung = {
  all: (...params: unknown[]) => unknown[];
  get: (...params: unknown[]) => unknown;
  setReturnArrays: (arrays: boolean) => void;
};

function mitZeilenForm(client: DatabaseSync): DatabaseSync {
  const originalPrepare = client.prepare.bind(client);
  const ersatz = (sql: string) => {
    const stmt = originalPrepare(sql) as unknown as FlacheAnweisung;
    const originalAll = stmt.all.bind(stmt);
    const originalGet = stmt.get.bind(stmt);
    let alsArrays = false;
    stmt.setReturnArrays = (arrays: boolean) => {
      alsArrays = arrays;
    };
    stmt.all = (...params: unknown[]) => {
      const zeilen = originalAll(...params);
      return alsArrays
        ? zeilen.map((zeile) => Object.values(zeile as Zeile))
        : zeilen;
    };
    stmt.get = (...params: unknown[]) => {
      const zeile = originalGet(...params);
      if (zeile && alsArrays) return Object.values(zeile as Zeile);
      return zeile;
    };
    return stmt;
  };
  client.prepare = ersatz as unknown as DatabaseSync["prepare"];
  return client;
}

export function oeffneDb(pfad: string) {
  const client = mitZeilenForm(new DatabaseSync(pfad));
  for (const anweisung of DDL) {
    client.exec(anweisung);
  }
  return drizzle({ client });
}
