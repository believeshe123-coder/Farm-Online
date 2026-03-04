const DEFAULT_AUTOMATION = {
  enabled: false,
  priority: 50,
  minInputStock: 0,
  targetOutputStock: 0,
  autoBuyInputs: false,
  autoSellOutputs: false,
};

export function createInitialWorkers(count = 4) {
  return Array.from({ length: count }, (_, index) => ({
    id: `worker-${index + 1}`,
    assignmentId: null,
    fatigue: 0,
    upkeep: 0,
  }));
}

export function withAutomationDefaults(config = {}) {
  return {
    ...DEFAULT_AUTOMATION,
    ...config,
  };
}

export function allocateWorkersByPriority(workers = [], assignments = []) {
  const freeWorkers = workers.map((worker) => ({ ...worker, assignmentId: null }));
  const sortedAssignments = [...assignments]
    .filter((assignment) => assignment.enabled && assignment.maxWorkers > 0)
    .sort((a, b) => b.priority - a.priority);

  const allocation = {};

  sortedAssignments.forEach((assignment) => {
    const available = freeWorkers.filter((worker) => worker.assignmentId === null);
    const toAssign = Math.min(assignment.maxWorkers, available.length);

    for (let index = 0; index < toAssign; index += 1) {
      available[index].assignmentId = assignment.id;
    }

    allocation[assignment.id] = toAssign;
  });

  return {
    workers: freeWorkers,
    allocation,
  };
}

export function getThroughputMultiplier({
  assignedWorkers = 0,
  requiredWorkers = 1,
  toolLevel = 0,
  fatigueEnabled = false,
  upkeepEnabled = false,
  averageFatigue = 0,
}) {
  if (assignedWorkers <= 0) {
    return 0;
  }

  const staffingRatio = Math.min(1.5, assignedWorkers / Math.max(1, requiredWorkers));
  const toolBoost = 1 + Math.max(0, toolLevel) * 0.12;
  const fatiguePenalty = fatigueEnabled ? Math.max(0.5, 1 - averageFatigue * 0.03) : 1;
  const upkeepPenalty = upkeepEnabled ? 0.9 : 1;

  return staffingRatio * toolBoost * fatiguePenalty * upkeepPenalty;
}

export function updateWorkerFatigue(workers = [], activeAssignmentIds = new Set(), fatigueEnabled = false) {
  if (!fatigueEnabled) {
    return workers.map((worker) => ({ ...worker, fatigue: 0 }));
  }

  return workers.map((worker) => {
    if (!worker.assignmentId) {
      return { ...worker, fatigue: Math.max(0, (worker.fatigue ?? 0) - 1) };
    }

    const isActive = activeAssignmentIds.has(worker.assignmentId);
    return { ...worker, fatigue: Math.max(0, (worker.fatigue ?? 0) + (isActive ? 1 : 0.25)) };
  });
}

export function getAverageAssignmentFatigue(workers = [], assignmentId) {
  const assignedWorkers = workers.filter((worker) => worker.assignmentId === assignmentId);
  if (assignedWorkers.length === 0) {
    return 0;
  }

  const totalFatigue = assignedWorkers.reduce((sum, worker) => sum + (worker.fatigue ?? 0), 0);
  return totalFatigue / assignedWorkers.length;
}
