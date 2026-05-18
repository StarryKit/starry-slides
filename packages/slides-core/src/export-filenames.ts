const INVALID_FILENAME_CHAR_PATTERN = /[<>:"\/\\|?*]/g;
const RESERVED_DOT_NAME_PATTERN = /^\.{1,2}$/;

export function createSafeExportFilenameBase(value: string, fallback = "starry-slides"): string {
  const sanitized = value
    .trim()
    .normalize("NFKC")
    .replace(INVALID_FILENAME_CHAR_PATTERN, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/[. ]+$/g, "")
    .trim()
    .replace(/^[-\s]+|[-\s]+$/g, "");

  if (!sanitized || RESERVED_DOT_NAME_PATTERN.test(sanitized)) {
    return fallback;
  }

  return sanitized;
}
