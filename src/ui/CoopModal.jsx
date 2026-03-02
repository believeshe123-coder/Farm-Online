import { useMemo, useState } from 'react';

export default function CoopModal({ coop, onClose, onBreed }) {
  const [parentAId, setParentAId] = useState('');
  const [parentBId, setParentBId] = useState('');

  const chickens = useMemo(
    () => (Array.isArray(coop?.animals) ? coop.animals.filter((animal) => animal.species === 'chicken') : []),
    [coop],
  );

  const canBreed = parentAId && parentBId && parentAId !== parentBId;

  if (!coop) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <section className="panel modal-card">
        <h3>Chicken Coop</h3>
        <p className="muted">Eggs are produced when each chicken's egg timer reaches 0.</p>
        <p>
          <strong>Chickens:</strong> {chickens.length}
        </p>
        <ul className="stack-sm coop-list">
          {chickens.map((chicken) => (
            <li key={chicken.id}>
              <strong>{chicken.id}</strong> — {chicken.traits.rarity} {chicken.traits.color}, {chicken.traits.size},
              egg every {chicken.traits.eggRateTicks} ticks (timer: {chicken.eggTimer})
            </li>
          ))}
        </ul>
        <div className="stack-sm">
          <label>
            Parent A
            <select value={parentAId} onChange={(event) => setParentAId(event.target.value)}>
              <option value="">Select chicken</option>
              {chickens.map((chicken) => (
                <option key={chicken.id} value={chicken.id}>
                  {chicken.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Parent B
            <select value={parentBId} onChange={(event) => setParentBId(event.target.value)}>
              <option value="">Select chicken</option>
              {chickens.map((chicken) => (
                <option key={chicken.id} value={chicken.id}>
                  {chicken.id}
                </option>
              ))}
            </select>
          </label>
          <div className="stack-row">
            <button type="button" disabled={!canBreed} onClick={() => onBreed(parentAId, parentBId)}>
              Breed
            </button>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
