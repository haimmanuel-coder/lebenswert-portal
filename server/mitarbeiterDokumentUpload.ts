export const MAX_MITARBEITER_DOKUMENT_BYTES = 10 * 1024 * 1024;

const ERLAUBTE_DOKUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MIME_NACH_DATEIENDUNG: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function hatPraefix(buffer: Buffer, praefix: number[]) {
  return praefix.every((wert, index) => buffer[index] === wert);
}

/**
 * Ermittelt für Browser ohne verlässlichen MIME-Type einen erlaubten Dateityp
 * ausschließlich anhand einer bekannten Endung. Der Server prüft den Inhalt
 * anschließend erneut, sodass ein Clientwert keine Berechtigung erzeugt.
 */
export function ermittleMitarbeiterDokumentMimeType(dateiname: string, browserMimeType?: string) {
  const endung = dateiname.trim().toLowerCase().split(".").pop() ?? "";
  const erwarteterMimeType = MIME_NACH_DATEIENDUNG[endung];
  if (!erwarteterMimeType) {
    throw new Error("Erlaubt sind PDF-, JPG-, PNG-, DOC- und DOCX-Dateien.");
  }
  if (browserMimeType && browserMimeType !== erwarteterMimeType) {
    throw new Error("Dateiendung und Dateityp passen nicht zusammen.");
  }
  return erwarteterMimeType;
}

/** Prüft Inhalt, Größe und Dateityp vor der externen Speicherung. */
export function pruefeMitarbeiterDokumentUpload(base64: string, mimeType: string, dateiname?: string) {
  const bereinigt = base64.replace(/\s/g, "");

  if (!ERLAUBTE_DOKUMENT_MIME_TYPES.has(mimeType)) {
    throw new Error("Erlaubt sind PDF-, JPG-, PNG-, DOC- und DOCX-Dateien.");
  }
  if (dateiname) {
    const erwarteterMimeType = ermittleMitarbeiterDokumentMimeType(dateiname);
    if (mimeType !== erwarteterMimeType) {
      throw new Error("Dateiendung und Dateityp passen nicht zusammen.");
    }
  }
  // Vor der vollständigen Syntaxprüfung abweisen: Das verhindert einen unnötig
  // großen Regex-Durchlauf bei absichtlich übergroßen Anfragen.
  if (bereinigt.length > Math.ceil(MAX_MITARBEITER_DOKUMENT_BYTES * 4 / 3) + 4) {
    throw new Error("Die Datei ist zu groß. Erlaubt sind maximal 10 MB.");
  }
  const istBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(bereinigt);
  if (!istBase64) {
    throw new Error("Die hochgeladene Datei ist unvollständig oder beschädigt.");
  }

  const buffer = Buffer.from(bereinigt, "base64");
  if (buffer.length === 0) {
    throw new Error("Die hochgeladene Datei ist leer.");
  }
  if (buffer.length > MAX_MITARBEITER_DOKUMENT_BYTES) {
    throw new Error("Die Datei ist zu groß. Erlaubt sind maximal 10 MB.");
  }

  if (mimeType === "application/pdf" && !buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new Error("Die Datei entspricht nicht dem angegebenen PDF-Format.");
  }
  if (mimeType === "image/jpeg" && !hatPraefix(buffer, [0xff, 0xd8, 0xff])) {
    throw new Error("Die Datei entspricht nicht dem angegebenen JPG-Format.");
  }
  if (mimeType === "image/png" && !hatPraefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    throw new Error("Die Datei entspricht nicht dem angegebenen PNG-Format.");
  }

  return buffer;
}
