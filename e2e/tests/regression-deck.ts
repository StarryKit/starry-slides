import fs from "node:fs";

type RegressionDeckConfig = {
  deckTitle: string;
  summary: string;
  heroKicker: string;
  agendaParagraph: string;
};

const regressionDeckConfig = JSON.parse(
  fs.readFileSync(new URL("../fixtures/regression-deck/config.json", import.meta.url), "utf8")
) as RegressionDeckConfig;

export const REGRESSION_DECK_TITLE = regressionDeckConfig.deckTitle;
export const REGRESSION_DECK_TOPIC = REGRESSION_DECK_TITLE;
export const REGRESSION_DECK_SUMMARY = regressionDeckConfig.summary;
export const REGRESSION_DECK_SOURCE_LABEL = `Generated deck: ${regressionDeckConfig.deckTitle}`;
export const REGRESSION_DECK_HERO_KICKER = regressionDeckConfig.heroKicker;
export const REGRESSION_DECK_AGENDA_PARAGRAPH = regressionDeckConfig.agendaParagraph;
export const REGRESSION_DECK_SLIDE_COUNT = 17;
