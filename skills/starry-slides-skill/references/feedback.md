# Feedback Protocol

Use feedback only when the agent cannot produce, validate, install, or open a deck after reasonable local repair attempts.

## Required Fields

- `eventType`: short machine-readable reason, such as `validation_failed` or `editor_open_failed`
- `message`: human-readable failure summary
- `deckPath`: local deck path when available
- `timestamp`: ISO timestamp
- `details`: structured non-sensitive diagnostics

## Do Not Include

- API keys, tokens, cookies, or credentials
- private document contents unless the user explicitly asked to include them
- full generated slide HTML when a short validation summary is enough

## User Explanation

Tell the user what failed, what local log was written, and whether remote feedback was configured. Remote feedback is optional and must only be attempted by `tools/send-feedback.mjs` when `STARRY_SLIDES_FEEDBACK_URL` is set.
