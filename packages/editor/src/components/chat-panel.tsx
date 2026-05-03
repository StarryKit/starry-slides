import { Image, Paperclip, Send, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

const SAMPLE_MESSAGES = [
  {
    id: "assistant-intro",
    role: "assistant",
    text: "Tell me what you want to change on this slide. I can help with copy, layout, visual hierarchy, or speaker-note style edits.",
  },
  {
    id: "user-request",
    role: "user",
    text: "Make the title feel sharper and suggest a cleaner layout for the comparison section.",
  },
  {
    id: "assistant-draft",
    role: "assistant",
    text: "I would tighten the headline, reduce the paragraph width, and make the two comparison columns use matching rhythm before changing colors.",
  },
] as const;

const FORM_OPTIONS = {
  tone: ["Sharper", "Warmer", "Executive"],
  layout: ["More structure", "More whitespace", "Stronger contrast"],
  scope: ["Selected element", "Current slide", "Whole deck"],
} as const;

const SUGGESTIONS = [
  "Rewrite selected text",
  "Improve this layout",
  "Make this slide cleaner",
  "Suggest a visual direction",
] as const;

type FormField = keyof typeof FORM_OPTIONS;

function ChatPanel() {
  const [draftPrompt, setDraftPrompt] = useState("");
  const [formSelections, setFormSelections] = useState<Record<FormField, string>>({
    tone: FORM_OPTIONS.tone[0],
    layout: FORM_OPTIONS.layout[0],
    scope: FORM_OPTIONS.scope[1],
  });

  const inlineFormPrompt = useMemo(() => {
    return `Revise the ${formSelections.scope.toLowerCase()} using ${formSelections.tone.toLowerCase()} tone and ${formSelections.layout.toLowerCase()}.`;
  }, [formSelections]);

  const updateInlineForm = (field: FormField, value: string) => {
    const nextSelections = { ...formSelections, [field]: value };
    setFormSelections(nextSelections);
    setDraftPrompt(
      `Revise the ${nextSelections.scope.toLowerCase()} using ${nextSelections.tone.toLowerCase()} tone and ${nextSelections.layout.toLowerCase()}.`
    );
  };

  return (
    <div className="hse-chat-panel">
      <div className="hse-chat-conversation" aria-label="Chat conversation">
        {SAMPLE_MESSAGES.map((message) => (
          <div
            className={
              message.role === "user" ? "hse-chat-message is-user" : "hse-chat-message is-assistant"
            }
            key={message.id}
          >
            <div className="hse-chat-bubble">
              <p>{message.text}</p>
            </div>
          </div>
        ))}

        <div className="hse-chat-message is-assistant">
          <div className="hse-chat-bubble hse-chat-form-bubble">
            <div className="hse-chat-form-header">
              <strong>Choose an edit direction</strong>
              <p>Selections become the next prompt draft.</p>
            </div>

            <div className="hse-chat-inline-form">
              {(Object.keys(FORM_OPTIONS) as FormField[]).map((field) => (
                <fieldset key={field}>
                  <legend>{field}</legend>
                  <div className="hse-chat-option-row">
                    {FORM_OPTIONS[field].map((option) => (
                      <button
                        type="button"
                        className={
                          formSelections[field] === option
                            ? "hse-chat-option is-selected"
                            : "hse-chat-option"
                        }
                        key={option}
                        aria-pressed={formSelections[field] === option}
                        onClick={() => {
                          updateInlineForm(field, option);
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <button
              className="hse-chat-use-prompt"
              type="button"
              onClick={() => {
                setDraftPrompt(inlineFormPrompt);
              }}
            >
              Use as next prompt
            </button>
          </div>
        </div>
      </div>

      <div className="hse-chat-suggestions" aria-label="Suggested prompts">
        {SUGGESTIONS.map((suggestion) => (
          <button
            type="button"
            key={suggestion}
            onClick={() => {
              setDraftPrompt(suggestion);
            }}
          >
            <Sparkles aria-hidden="true" />
            {suggestion}
          </button>
        ))}
      </div>

      <form className="hse-chat-composer" aria-label="Chat prompt input">
        <textarea
          rows={4}
          placeholder="Ask for edits to the current slide..."
          value={draftPrompt}
          onChange={(event) => {
            setDraftPrompt(event.target.value);
          }}
        />
        <div className="hse-chat-composer-footer">
          <div className="hse-chat-tool-row" aria-label="Prompt tools">
            <button type="button" aria-label="Attach file">
              <Paperclip aria-hidden="true" />
            </button>
            <button type="button" aria-label="Reference image">
              <Image aria-hidden="true" />
            </button>
            <button type="button" aria-label="Prompt tools">
              <Wand2 aria-hidden="true" />
            </button>
          </div>
          <button className="hse-chat-send-button" type="button" aria-label="Send message">
            <Send aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}

export { ChatPanel };
