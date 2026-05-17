const DEFAULT_DECK_SLIDE_BASE_URL = "/deck/slides/";

export function getDeckSlideBaseUrl(sourceFile?: string): string {
  if (!sourceFile) {
    return DEFAULT_DECK_SLIDE_BASE_URL;
  }

  const pathSegments = sourceFile
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment));
  pathSegments.pop();

  return `/deck/${pathSegments.length ? `${pathSegments.join("/")}/` : ""}`;
}

export function injectBaseTag(htmlSource: string, sourceFile?: string): string {
  const baseTag = `<base href="${getDeckSlideBaseUrl(sourceFile)}">`;
  const htmlWithHeadBase = htmlSource.replace(/(<head[^>]*>)/i, `$1${baseTag}`);

  if (htmlWithHeadBase !== htmlSource) {
    return htmlWithHeadBase;
  }

  return `${baseTag}${htmlSource}`;
}
