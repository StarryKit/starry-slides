import type { CssPropertyRow } from "../lib/collect-css-properties";

interface StyleInspectorProps {
  inspectedLabel: string;
  inspectedStyles: CssPropertyRow[];
}

function StyleInspector({ inspectedLabel, inspectedStyles }: StyleInspectorProps) {
  return (
    <section className="hse-inspector-panel">
      <div className="hse-panel-header">
        <span className="hse-panel-kicker">Styles</span>
        <h2>{inspectedLabel}</h2>
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
