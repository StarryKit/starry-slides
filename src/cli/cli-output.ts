/**
 * Terminal output helpers for the starry-slides CLI.
 *
 * Zero-dependency ANSI styling with TTY / NO_COLOR / CI detection
 * so color degrades safely in non-interactive environments.
 */

// ── ANSI escape codes ──────────────────────────────────────────────

const CSI = "\x1b[";

function sgr(...codes: number[]): string {
  return `${CSI}${codes.join(";")}m`;
}

const RESET = sgr(0);

// ── Color detection ────────────────────────────────────────────────

export function isColorEnabled(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.CI && !process.env.FORCE_COLOR) return false;
  if (!process.stdout.isTTY) return false;
  return true;
}

// ── Style helpers ──────────────────────────────────────────────────

export function style(text: string, ...codes: number[]): string {
  if (!isColorEnabled()) return text;
  return `${sgr(...codes)}${text}${RESET}`;
}

export const bold = (text: string) => style(text, 1);
export const dim = (text: string) => style(text, 2);
export const red = (text: string) => style(text, 91);
export const green = (text: string) => style(text, 92);
export const yellow = (text: string) => style(text, 93);
export const blue = (text: string) => style(text, 94);
export const cyan = (text: string) => style(text, 96);
export const brightWhite = (text: string) => style(text, 97);

/** Draw a text label inside a coloured box line (top / middle / bottom). */
export function boxLine(edge: "top" | "mid" | "bottom", content: string, colourCode = 93): string {
  const width = 60;
  const inner = width - 2;
  const pad = Math.max(0, inner - visibleLength(content));
  const left = edge === "mid" ? "│" : edge === "top" ? "┌" : "└";
  const right = edge === "mid" ? "│" : edge === "top" ? "┐" : "┘";
  const fill = edge === "mid" ? " ".repeat(pad) : "─".repeat(inner);

  if (edge === "mid") {
    return style(`${left}  ${content}${" ".repeat(pad)}${right}`, colourCode);
  }
  return style(`${left}${fill}${right}`, colourCode);
}

/** Strip ANSI codes to compute visible string length. */
function visibleLength(text: string): number {
  const escapeCharacter = String.fromCharCode(27);
  return text.replace(new RegExp(`${escapeCharacter}\\[[0-9;]*m`, "g"), "").length;
}

// ── Commander error output transformation ──────────────────────────

/**
 * Rewrite raw commander error output into human-friendly messages.
 * Called from `configureOutput().writeErr` so transformation is
 * applied before the text reaches stderr.
 */
export function transformCommanderErrorOutput(raw: string): string {
  let transformed = raw;

  // "error: option '--flag <value>' argument missing"
  transformed = transformed.replace(
    /^error: option '(.+?)' argument missing\n?/m,
    (_full: string, flag: string) => {
      const parts = flag.split(" ");
      const optionName = parts[0]; // e.g. '--slide'
      const valueName = parts.slice(1).join(" "); // e.g. '<manifest-file>'
      return [
        `${red("✖ Missing value:")} the ${bold(optionName)} option requires a value ${dim(`(${valueName})`)}`,
        `${dim("→")} ${bold("Tip:")} run ${bold("starry-slides help <command>")} to see usage.\n`,
        "",
      ].join("\n");
    }
  );

  // "unknown option '--flag'"
  transformed = transformed.replace(
    /^unknown option '(.+?)'\n?/m,
    (_full: string, flag: string) => {
      return [
        `${red("✖ Unknown option:")} ${bold(flag)} is not recognized.`,
        `${dim("→")} ${bold("Tip:")} run ${bold("starry-slides help <command>")} to see available options.\n`,
        "",
      ].join("\n");
    }
  );

  // "error: unknown option '--flag'" (showHelpAfterError path)
  transformed = transformed.replace(
    /^error: unknown option '(.+?)'\n?/m,
    (_full: string, flag: string) => {
      return [
        `${red("✖ Unknown option:")} ${bold(flag)} is not recognized.`,
        `${dim("→")} ${bold("Tip:")} run ${bold("starry-slides help <command>")} to see available options.\n`,
        "",
      ].join("\n");
    }
  );

  // "too many arguments"
  transformed = transformed.replace(/^too many arguments\n?/m, () => {
    return [
      `${red("✖ Too many arguments:")} unexpected extra arguments were provided.`,
      `${dim("→")} ${bold("Tip:")} run ${bold("starry-slides help")} to see usage.\n`,
      "",
    ].join("\n");
  });

  // "error: missing required argument '...'"
  transformed = transformed.replace(
    /^error: missing required argument '(.+?)'\n?/m,
    (_full: string, arg: string) => {
      return [
        `${red("✖ Missing argument:")} the ${bold(arg)} argument is required.`,
        `${dim("→")} ${bold("Tip:")} run ${bold("starry-slides help <command>")} to see usage.\n`,
        "",
      ].join("\n");
    }
  );

  // "error: too many arguments" (with error: prefix, from showHelpAfterError path)
  transformed = transformed.replace(/^error: too many arguments.*\n?/m, () => {
    return [
      `${red("✖ Too many arguments:")} unexpected extra arguments were provided.`,
      `${dim("→")} ${bold("Tip:")} run ${bold("starry-slides help")} to see usage.\n`,
      "",
    ].join("\n");
  });

  return transformed;
}

// ── Update banner ──────────────────────────────────────────────────

const BOX_H = "─";

/**
 * Format an update-available notice as a bright, visually prominent
 * box on stderr.  Degrades to plain text in non-TTY environments.
 */
export function formatUpdateBanner(
  currentVersion: string,
  latestVersion: string,
  upgradeCommand: string
): string {
  const width = 54;
  const banner = [
    "",
    boxLine("top", "", 93),
    boxLine(
      "mid",
      `  ${bold("✨ Update available!")}  ${dim(`v${currentVersion}  →  v${latestVersion}`)}`,
      93
    ),
    boxLine("mid", "", 93),
    boxLine("mid", `  ${dim("Upgrade:")} ${bold(upgradeCommand)}`, 93),
    boxLine("bottom", "", 93),
    "",
  ].join("\n");

  return banner;
}
