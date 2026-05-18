import packageJson from "../../package.json";
import { formatUpdateBanner } from "./cli-output";

const RUNTIME_UPDATE_COMMAND = "npm install -g starry-slides@latest";
const NPM_LATEST_URL = `https://registry.npmjs.org/${packageJson.name}/latest`;
const VERSION_PATTERN =
  /^v?(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:-(?<prerelease>[0-9A-Za-z.-]+))?(?:\+.*)?$/;

let runtimeUpdateNotificationPromise: Promise<void> | null = null;

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

export function shouldCheckForRuntimeUpdates(argv = process.argv.slice(2), env = process.env) {
  if (env.STARRY_SLIDES_DISABLE_UPDATE_CHECK === "1") {
    return false;
  }

  if (env.CI && env.STARRY_SLIDES_FORCE_UPDATE_CHECK !== "1") {
    return false;
  }

  if (argv.length === 0) {
    return true;
  }

  return !argv.includes("--help") && !argv.includes("-h") && argv[0] !== "help";
}

export async function notifyIfRuntimeUpdateAvailable() {
  runtimeUpdateNotificationPromise ??= runRuntimeUpdateNotification();
  await runtimeUpdateNotificationPromise;
}

async function runRuntimeUpdateNotification() {
  if (!shouldCheckForRuntimeUpdates()) {
    return;
  }

  const currentVersion = packageJson.version;
  const latestVersion = await resolveLatestRuntimeVersion();
  if (!latestVersion || compareVersions(latestVersion, currentVersion) <= 0) {
    return;
  }

  process.stderr.write(formatUpdateBanner(currentVersion, latestVersion, RUNTIME_UPDATE_COMMAND));
}

async function resolveLatestRuntimeVersion() {
  const testVersion = process.env.STARRY_SLIDES_TEST_LATEST_VERSION;
  if (testVersion) {
    return testVersion;
  }

  try {
    const response = await fetch(NPM_LATEST_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { version?: unknown };
    return typeof payload.version === "string" ? payload.version : null;
  } catch {
    return null;
  }
}

function compareVersions(left: string, right: string) {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);
  if (!leftVersion || !rightVersion) {
    return left.localeCompare(right);
  }

  if (leftVersion.major !== rightVersion.major) {
    return leftVersion.major - rightVersion.major;
  }
  if (leftVersion.minor !== rightVersion.minor) {
    return leftVersion.minor - rightVersion.minor;
  }
  if (leftVersion.patch !== rightVersion.patch) {
    return leftVersion.patch - rightVersion.patch;
  }

  return comparePrerelease(leftVersion.prerelease, rightVersion.prerelease);
}

function parseVersion(version: string): ParsedVersion | null {
  const match = VERSION_PATTERN.exec(version);
  if (!match?.groups) {
    return null;
  }

  return {
    major: Number(match.groups.major),
    minor: Number(match.groups.minor),
    patch: Number(match.groups.patch),
    prerelease: match.groups.prerelease ? match.groups.prerelease.split(".") : [],
  };
}

function comparePrerelease(left: string[], right: string[]) {
  if (left.length === 0 && right.length === 0) {
    return 0;
  }
  if (left.length === 0) {
    return 1;
  }
  if (right.length === 0) {
    return -1;
  }

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];
    if (leftPart === undefined) {
      return -1;
    }
    if (rightPart === undefined) {
      return 1;
    }

    const leftNumber = Number(leftPart);
    const rightNumber = Number(rightPart);
    const leftIsNumber = Number.isInteger(leftNumber) && String(leftNumber) === leftPart;
    const rightIsNumber = Number.isInteger(rightNumber) && String(rightNumber) === rightPart;

    if (leftIsNumber && rightIsNumber && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }
    if (leftIsNumber !== rightIsNumber) {
      return leftIsNumber ? -1 : 1;
    }
    if (leftPart !== rightPart) {
      return leftPart.localeCompare(rightPart);
    }
  }

  return 0;
}
