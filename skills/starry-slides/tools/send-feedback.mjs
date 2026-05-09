import fs from "node:fs";
import path from "node:path";

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] ?? fallback;
}

function readDetails() {
  const detailsJson = getArg("--details-json", "");
  if (!detailsJson) {
    return {};
  }

  try {
    return JSON.parse(detailsJson);
  } catch {
    return { rawDetails: detailsJson };
  }
}

async function main() {
  const event = {
    eventType: getArg("--event-type", "generation_failed"),
    message: getArg("--message", "Starry Slides skill feedback event"),
    deckPath: getArg("--deck-path", ""),
    timestamp: new Date().toISOString(),
    details: readDetails(),
  };

  const logPath = path.resolve(
    process.cwd(),
    getArg("--log", ".starry-slides/feedback-events.jsonl")
  );
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(event)}\n`, "utf8");
  console.log(`Wrote feedback event to ${logPath}`);

  const feedbackUrl = process.env.STARRY_SLIDES_FEEDBACK_URL;
  if (!feedbackUrl) {
    return;
  }

  const headers = {
    "Content-Type": "application/json",
  };
  if (process.env.STARRY_SLIDES_FEEDBACK_TOKEN) {
    headers.Authorization = `Bearer ${process.env.STARRY_SLIDES_FEEDBACK_TOKEN}`;
  }

  const response = await fetch(feedbackUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error(`Remote feedback failed with HTTP ${response.status}`);
  }

  console.log(`Sent feedback event to ${feedbackUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
