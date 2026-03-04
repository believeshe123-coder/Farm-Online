import { MILESTONES, TECH_NODES, canResearchTech, getMilestoneStatus } from '../game/progression';

export default function ProgressionPanel({ state, onResearchTech, onClearNotifications }) {
  const progression = state.progression ?? { researchPoints: 0, notifications: [] };
  const milestoneStatus = getMilestoneStatus(state);
  const unreadNotifications = progression.notifications?.length ?? 0;

  return (
    <section className="panel">
      <div className="shop-header-row">
        <h3>Progression</h3>
        {unreadNotifications > 0 && (
          <button type="button" onClick={onClearNotifications}>Clear {unreadNotifications} alerts</button>
        )}
      </div>
      <p className="muted">Research points: {progression.researchPoints ?? 0}</p>

      <details open>
        <summary>Tech tree</summary>
        <div className="stack-sm shop-section-body">
          {Object.values(TECH_NODES).map((tech) => {
            const researched = progression.researchedTechs?.includes(tech.id);
            const canResearch = canResearchTech(state, tech.id);
            const blockedBy = tech.mutuallyExclusive.filter((id) => progression.researchedTechs?.includes(id));
            return (
              <div key={tech.id}>
                <p className="muted">
                  <strong>{tech.name}</strong> ({tech.cost} RP){' '}
                  {researched ? '✓ researched' : blockedBy.length > 0 ? `(blocked by ${blockedBy.join(', ')})` : ''}
                </p>
                <p className="muted">{tech.description}</p>
                <button type="button" disabled={researched || !canResearch} onClick={() => onResearchTech(tech.id)}>
                  Research
                </button>
              </div>
            );
          })}
        </div>
      </details>

      <details open>
        <summary>Milestones</summary>
        <div className="stack-sm shop-section-body">
          {Object.values(milestoneStatus).map((milestone) => (
            <p key={milestone.id} className="muted">
              {MILESTONES[milestone.id].name}: {milestone.progress}/{milestone.target} {milestone.completed ? '✓' : ''}
            </p>
          ))}
        </div>
      </details>

      {unreadNotifications > 0 && (
        <details open>
          <summary>HUD notifications</summary>
          <div className="stack-sm shop-section-body">
            {progression.notifications.map((notification) => (
              <p key={notification.id} className="muted">• {notification.message}</p>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
