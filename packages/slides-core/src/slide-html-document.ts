export function parseHtmlDocument(html: string): Document | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}

export function serializeHtmlDocument(doc: Document): string {
  return `<!DOCTYPE html>
${doc.documentElement.outerHTML}`;
}

export function updateHtmlSource(html: string, updater: (doc: Document) => void): string {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return html;
  }

  updater(doc);
  return serializeHtmlDocument(doc);
}
