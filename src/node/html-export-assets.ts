import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

interface InlineDeckLocalAssetsOptions {
  deckPath: string;
  slideFile: string;
  htmlSource: string;
}

const MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

export function inlineDeckLocalAssets({
  deckPath,
  slideFile,
  htmlSource,
}: InlineDeckLocalAssetsOptions): string {
  const deckRoot = path.resolve(deckPath);
  const slideDir = path.dirname(path.join(deckRoot, slideFile));
  const dataUrlCache = new Map<string, string>();
  const dom = new JSDOM(htmlSource, { virtualConsole: new VirtualConsole() });
  const { document } = dom.window;

  for (const link of Array.from(document.querySelectorAll<HTMLLinkElement>("link[href]"))) {
    if (!isStylesheetLink(link)) {
      continue;
    }

    const assetPath = resolveDeckLocalAssetPath({
      deckRoot,
      baseDir: slideDir,
      url: link.getAttribute("href") ?? "",
    });
    if (!assetPath) {
      continue;
    }

    const css = fs.readFileSync(assetPath, "utf8");
    const style = document.createElement("style");
    style.textContent = inlineCssUrls({
      css,
      deckRoot,
      baseDir: path.dirname(assetPath),
      dataUrlCache,
    });
    link.replaceWith(style);
  }

  for (const style of Array.from(document.querySelectorAll<HTMLStyleElement>("style"))) {
    style.textContent = inlineCssUrls({
      css: style.textContent ?? "",
      deckRoot,
      baseDir: slideDir,
      dataUrlCache,
    });
  }

  for (const element of Array.from(document.querySelectorAll<HTMLElement>("[style]"))) {
    const inlineStyle = element.getAttribute("style");
    if (!inlineStyle) {
      continue;
    }
    element.setAttribute(
      "style",
      inlineCssUrls({ css: inlineStyle, deckRoot, baseDir: slideDir, dataUrlCache })
    );
  }

  inlineAttributeUrls(
    document,
    "img[src],video[src],audio[src],source[src],track[src],embed[src]",
    "src",
    {
      deckRoot,
      baseDir: slideDir,
      dataUrlCache,
    }
  );
  inlineAttributeUrls(document, "video[poster]", "poster", {
    deckRoot,
    baseDir: slideDir,
    dataUrlCache,
  });
  inlineAttributeUrls(document, "object[data]", "data", {
    deckRoot,
    baseDir: slideDir,
    dataUrlCache,
  });
  inlineAttributeUrls(
    document,
    "image[href],image[xlink\\:href],use[href],use[xlink\\:href]",
    "href",
    {
      deckRoot,
      baseDir: slideDir,
      dataUrlCache,
    }
  );
  inlineAttributeUrls(
    document,
    "image[href],image[xlink\\:href],use[href],use[xlink\\:href]",
    "xlink:href",
    {
      deckRoot,
      baseDir: slideDir,
      dataUrlCache,
    }
  );

  return dom.serialize();
}

function isStylesheetLink(link: HTMLLinkElement): boolean {
  const rel = link.getAttribute("rel");
  return Boolean(rel?.split(/\s+/).some((value) => value.toLowerCase() === "stylesheet"));
}

function inlineAttributeUrls(
  document: Document,
  selector: string,
  attribute: string,
  options: {
    deckRoot: string;
    baseDir: string;
    dataUrlCache: Map<string, string>;
  }
) {
  for (const element of Array.from(document.querySelectorAll(selector))) {
    const value = element.getAttribute(attribute);
    if (!value) {
      continue;
    }

    const assetPath = resolveDeckLocalAssetPath({ ...options, url: value });
    if (!assetPath) {
      continue;
    }

    element.setAttribute(attribute, getDataUrl(assetPath, options.dataUrlCache));
  }
}

function inlineCssUrls({
  css,
  deckRoot,
  baseDir,
  dataUrlCache,
}: {
  css: string;
  deckRoot: string;
  baseDir: string;
  dataUrlCache: Map<string, string>;
}): string {
  return css.replace(/url\(\s*(["']?)(.*?)\1\s*\)/g, (match, quote: string, rawUrl: string) => {
    const assetPath = resolveDeckLocalAssetPath({ deckRoot, baseDir, url: rawUrl });
    if (!assetPath) {
      return match;
    }

    return `url(${quote}${getDataUrl(assetPath, dataUrlCache)}${quote})`;
  });
}

function resolveDeckLocalAssetPath({
  deckRoot,
  baseDir,
  url,
}: {
  deckRoot: string;
  baseDir: string;
  url: string;
}): string | null {
  const trimmedUrl = url.trim();
  if (!trimmedUrl || isNonLocalUrl(trimmedUrl)) {
    return null;
  }

  const pathOnly = trimmedUrl.split(/[?#]/, 1)[0];
  const decodedPath = safeDecodeUriComponent(pathOnly);
  const assetPath = path.resolve(baseDir, decodedPath);
  if (!isInsideDirectory(assetPath, deckRoot)) {
    return null;
  }

  try {
    if (!fs.statSync(assetPath).isFile()) {
      return null;
    }
  } catch {
    return null;
  }

  return assetPath;
}

function isNonLocalUrl(url: string): boolean {
  return (
    url.startsWith("#") ||
    url.startsWith("/") ||
    url.startsWith("//") ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(url)
  );
}

function safeDecodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isInsideDirectory(filePath: string, directory: string): boolean {
  const relativePath = path.relative(directory, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function getDataUrl(filePath: string, cache: Map<string, string>): string {
  const cached = cache.get(filePath);
  if (cached) {
    return cached;
  }

  const mimeType = MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
  const dataUrl = `data:${mimeType};base64,${fs.readFileSync(filePath).toString("base64")}`;
  cache.set(filePath, dataUrl);
  return dataUrl;
}
