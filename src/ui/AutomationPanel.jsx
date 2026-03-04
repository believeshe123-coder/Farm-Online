export default function AutomationPanel({
  automation,
  onSetAutomation,
}) {
  const safeAutomation = {
    enabled: false,
    priority: 50,
    minInputStock: 0,
    targetOutputStock: 0,
    autoBuyInputs: false,
    autoSellOutputs: false,
    ...(automation ?? {}),
  };

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <h4>Automation</h4>
      <label>
        <input
          type="checkbox"
          checked={safeAutomation.enabled}
          onChange={(event) => onSetAutomation({ enabled: event.target.checked })}
        />
        Enabled
      </label>
      <label>
        Priority ({safeAutomation.priority})
        <input
          type="range"
          min="0"
          max="100"
          value={safeAutomation.priority}
          onChange={(event) => onSetAutomation({ priority: Number(event.target.value) })}
        />
      </label>
      <label>
        Min input stock
        <input
          type="number"
          min="0"
          value={safeAutomation.minInputStock}
          onChange={(event) => onSetAutomation({ minInputStock: Number(event.target.value) })}
        />
      </label>
      <label>
        Target output stock
        <input
          type="number"
          min="0"
          value={safeAutomation.targetOutputStock}
          onChange={(event) => onSetAutomation({ targetOutputStock: Number(event.target.value) })}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={safeAutomation.autoBuyInputs}
          onChange={(event) => onSetAutomation({ autoBuyInputs: event.target.checked })}
        />
        Auto-buy inputs
      </label>
      <label>
        <input
          type="checkbox"
          checked={safeAutomation.autoSellOutputs}
          onChange={(event) => onSetAutomation({ autoSellOutputs: event.target.checked })}
        />
        Auto-sell outputs above threshold
      </label>
    </div>
  );
}
