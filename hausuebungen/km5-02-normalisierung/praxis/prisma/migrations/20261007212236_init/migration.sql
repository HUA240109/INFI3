-- CreateTable
CREATE TABLE "KundeDenorm" (
    "kundeId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "hobbys" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Hobby" (
    "kundeId" INTEGER NOT NULL,
    "hobby" TEXT NOT NULL,

    PRIMARY KEY ("kundeId", "hobby")
);

-- CreateTable
CREATE TABLE "BestellungRepeat" (
    "bestellNr" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kunde" TEXT NOT NULL,
    "track1" INTEGER,
    "track2" INTEGER,
    "track3" INTEGER
);

-- CreateTable
CREATE TABLE "Bestellposition" (
    "bestellNr" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,

    PRIMARY KEY ("bestellNr", "position"),
    CONSTRAINT "Bestellposition_bestellNr_fkey" FOREIGN KEY ("bestellNr") REFERENCES "Bestellung" ("bestellNr") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bestellposition_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Song" ("songId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Song" (
    "songId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titel" TEXT NOT NULL,
    "dauerSek" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Playlist" (
    "playlistId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SongPlaylistDenorm" (
    "songId" INTEGER NOT NULL,
    "playlistId" INTEGER NOT NULL,
    "songTitel" TEXT NOT NULL,

    PRIMARY KEY ("songId", "playlistId"),
    CONSTRAINT "SongPlaylistDenorm_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("songId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SongPlaylist" (
    "songId" INTEGER NOT NULL,
    "playlistId" INTEGER NOT NULL,

    PRIMARY KEY ("songId", "playlistId"),
    CONSTRAINT "SongPlaylist_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("songId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SongPlaylist_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist" ("playlistId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Produkt" (
    "produktNr" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BestellpositionProdDenorm" (
    "bestellNr" INTEGER NOT NULL,
    "produktNr" INTEGER NOT NULL,
    "menge" INTEGER NOT NULL,
    "produktName" TEXT NOT NULL,

    PRIMARY KEY ("bestellNr", "produktNr")
);

-- CreateTable
CREATE TABLE "BestellpositionProd" (
    "bestellNr" INTEGER NOT NULL,
    "produktNr" INTEGER NOT NULL,
    "menge" INTEGER NOT NULL,

    PRIMARY KEY ("bestellNr", "produktNr"),
    CONSTRAINT "BestellpositionProd_produktNr_fkey" FOREIGN KEY ("produktNr") REFERENCES "Produkt" ("produktNr") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BestellpositionProd_bestellNr_fkey" FOREIGN KEY ("bestellNr") REFERENCES "Bestellung" ("bestellNr") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pruefung" (
    "matrNr" INTEGER NOT NULL,
    "lvNr" TEXT NOT NULL,
    "note" INTEGER NOT NULL,

    PRIMARY KEY ("matrNr", "lvNr")
);

-- CreateTable
CREATE TABLE "BestellungDenorm" (
    "bestellNr" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kunde" TEXT NOT NULL,
    "plz" TEXT NOT NULL,
    "ort" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Plz" (
    "plz" TEXT NOT NULL PRIMARY KEY,
    "ort" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Bestellung" (
    "bestellNr" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kunde" TEXT NOT NULL,
    "plz" TEXT NOT NULL,
    CONSTRAINT "Bestellung_plz_fkey" FOREIGN KEY ("plz") REFERENCES "Plz" ("plz") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KontoDenorm" (
    "iban" TEXT NOT NULL PRIMARY KEY,
    "inhaber" TEXT NOT NULL,
    "blz" TEXT NOT NULL,
    "bankname" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Bank" (
    "blz" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Konto" (
    "iban" TEXT NOT NULL PRIMARY KEY,
    "inhaber" TEXT NOT NULL,
    "blz" TEXT NOT NULL,
    CONSTRAINT "Konto_blz_fkey" FOREIGN KEY ("blz") REFERENCES "Bank" ("blz") ON DELETE RESTRICT ON UPDATE CASCADE
);
