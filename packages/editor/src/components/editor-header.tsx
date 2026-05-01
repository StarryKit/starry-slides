interface EditorHeaderProps {
  deckTitle: string;
  sourceLabel: string;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
}

function PanelIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5zm2 0v11h6v-11zm8 0h-1v11h1z"
        fill="currentColor"
      />
    </svg>
  );
}

function EditorHeader({
  deckTitle,
  sourceLabel,
  isInspectorOpen,
  onToggleInspector,
}: EditorHeaderProps) {
  return (
    <header className="hse-editor-header">
      <div className="hse-editor-header-copy">
        <div className="hse-editor-header-title-row">
          <h1>{deckTitle}</h1>
        </div>
        <p>{sourceLabel}</p>
      </div>

      <div className="hse-editor-header-actions">
        <button
          className="hse-header-button hse-header-button-secondary"
          type="button"
          aria-label={isInspectorOpen ? "Hide advanced panel" : "Show advanced panel"}
          aria-pressed={isInspectorOpen}
          data-testid="toggle-inspector-button"
          onClick={onToggleInspector}
        >
          <PanelIcon />
        </button>
        <button className="hse-header-button hse-header-button-secondary" type="button">
          Export
        </button>
        <button
          className="hse-header-button hse-header-button-primary"
          type="button"
          aria-label="Present slides"
          title="Present mode UI placeholder"
        >
          Present
        </button>
      </div>
    </header>
  );
}

export { EditorHeader };
