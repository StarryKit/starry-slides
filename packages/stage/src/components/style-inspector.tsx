import type { CssPropertyRow } from "../lib/collect-css-properties";

interface StyleInspectorProps {
  inspectedLabel: string;
  inspectedStyles: CssPropertyRow[];
  canUndo: boolean;
  canRedo: boolean;
  isEditingText: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

function StyleInspector({
  inspectedLabel,
  inspectedStyles,
  canUndo,
  canRedo,
  isEditingText,
  onUndo,
  onRedo,
}: StyleInspectorProps) {
  return (
    <section className="hse-inspector-panel" data-testid="style-inspector">
      <div className="hse-panel-header">
        <span className="hse-panel-kicker">Styles</span>
        <h2>{inspectedLabel}</h2>
      </div>

      <div className="hse-history-toolbar" data-testid="history-toolbar">
        <button
          className="hse-history-button"
          disabled={!canUndo || isEditingText}
          onClick={onUndo}
          data-testid="undo-button"
          type="button"
        >
          Undo
        </button>
        <button
          className="hse-history-button"
          disabled={!canRedo || isEditingText}
          onClick={onRedo}
          data-testid="redo-button"
          type="button"
        >
          Redo
        </button>
      </div>

      {isEditingText ? (
        <p className="hse-editing-hint">Editing text. Press Enter to save or Escape to cancel.</p>
      ) : null}

      <div className="hse-style-list">
        {inspectedStyles.map((property) => (
          <div className="hse-style-row" key={property.name}>
            <span className="hse-style-name">{property.name}</span>
            <code className="hse-style-value">{property.value}</code>
          </div>
        ))}
      </div>
    </section>
  );
}

export { StyleInspector };
