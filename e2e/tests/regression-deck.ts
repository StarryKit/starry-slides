import fs from "node:fs";

type RegressionDeckConfig = {
  topic: string;
  summary: string;
  heroKicker: string;
  agendaParagraph: string;
};

const regressionDeckConfig = JSON.parse(
  fs.readFileSync(new URL("../fixtures/regression-deck/config.json", import.meta.url), "utf8")
) as RegressionDeckConfig;

export const REGRESSION_DECK_TOPIC = regressionDeckConfig.topic;
export const REGRESSION_DECK_SUMMARY = regressionDeckConfig.summary;
export const REGRESSION_DECK_SOURCE_LABEL = `Generated deck: ${regressionDeckConfig.topic}`;
export const REGRESSION_DECK_HERO_KICKER = regressionDeckConfig.heroKicker;
export const REGRESSION_DECK_AGENDA_PARAGRAPH = regressionDeckConfig.agendaParagraph;
