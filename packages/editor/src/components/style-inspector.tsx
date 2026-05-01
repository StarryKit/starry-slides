import type { CssPropertyRow } from "../lib/collect-css-properties";

interface StyleInspectorProps {
  inspectedLabel: string;
  inspectedStyles: CssPropertyRow[];
  canUndo: boolean;
  canRedo: boolean;
  isEditingText: boolean;
  isOpen: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

function StyleInspector({
  inspectedLabel,
  inspectedStyles,
  canUndo,
  canRedo,
  isEditingText,
  isOpen,
  onUndo,
  onRedo,
}: StyleInspectorProps) {
  return (
    <section
      className={isOpen ? "hse-inspector-panel is-open" : "hse-inspector-panel is-closed"}
      data-testid="style-inspector"
      aria-hidden={isOpen ? "false" : "true"}
    >
      <div className="hse-panel-header">
        <span className="hse-panel-kicker">Advanced editing</span>
        <h2>{inspectedLabel}</h2>
        <p className="hse-panel-description">
          The floating toolbar will handle quick edits. This panel is reserved for richer
          element-aware controls.
        </p>
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

      <div className="hse-inspector-section">
        <div className="hse-inspector-section-header">
          <span className="hse-panel-kicker">Editor lanes</span>
          <strong>Planned controls</strong>
        </div>
        <div className="hse-control-chip-row">
          <span className="hse-control-chip">Typography</span>
          <span className="hse-control-chip">Layout</span>
          <span className="hse-control-chip">Spacing</span>
          <span className="hse-control-chip">Fill</span>
          <span className="hse-control-chip">Border</span>
          <span className="hse-control-chip">Effects</span>
        </div>
      </div>

      {isEditingText ? (
        <p className="hse-editing-hint">Editing text. Press Enter to save or Escape to cancel.</p>
      ) : null}

      <div className="hse-inspector-section">
        <div className="hse-inspector-section-header">
          <span className="hse-panel-kicker">Live inspection</span>
          <strong>Computed CSS snapshot</strong>
        </div>
      </div>

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
