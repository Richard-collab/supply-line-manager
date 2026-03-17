import solver from 'javascript-lp-solver';
import { RecordData, ModelInputs, AllocationResult } from '@/types';

// Generate random mock data mimicking full_process.py
export function generateRandomRecords(n: number, numProvinces: number, numLineCodes: number): RecordData[] {
  const intentionClasses = ['A', 'B', 'C', 'D', 'E', 'F', '其他'];
  const result: RecordData[] = [];

  for (let i = 0; i < n; i++) {
    const randomProvince = Math.floor(Math.random() * numProvinces) + 1;
    const randomLineCode = Math.floor(Math.random() * numLineCodes) + 1;
    const randomIntention = intentionClasses[Math.floor(Math.random() * intentionClasses.length)];

    result.push({
      province: `Province_${randomProvince}`,
      line_code: `Line_${randomLineCode}`,
      intention_class: randomIntention,
    });
  }

  return result;
}

// Build model inputs from mock data mimicking full_process.py
export function buildModelInputsFromMockData(records: RecordData[], capacityRatio: number = 0.7): ModelInputs {
  const provincesSet = new Set<string>();
  const linesSet = new Set<string>();

  const demandP: Record<string, number> = {};
  const lineTotal: Record<string, number> = {};
  const pairTotal: Record<string, number> = {};
  const pairATotal: Record<string, number> = {};

  for (const row of records) {
    const { province, line_code: line, intention_class: intention } = row;
    provincesSet.add(province);
    linesSet.add(line);

    demandP[province] = (demandP[province] || 0) + 1;
    lineTotal[line] = (lineTotal[line] || 0) + 1;

    const pairKey = `${province}_${line}`;
    pairTotal[pairKey] = (pairTotal[pairKey] || 0) + 1;

    if (intention === 'A') {
      pairATotal[pairKey] = (pairATotal[pairKey] || 0) + 1;
    }
  }

  const provinces = Array.from(provincesSet).sort();
  const lines = Array.from(linesSet).sort();

  const capacityL: Record<string, number> = {};
  for (const line of lines) {
    capacityL[line] = Math.max(1, Math.floor((lineTotal[line] || 0) * capacityRatio));
  }

  const aRate: Record<string, Record<string, number | null>> = {};
  for (const province of provinces) {
    aRate[province] = {};
    for (const line of lines) {
      const pairKey = `${province}_${line}`;
      const total = pairTotal[pairKey] || 0;
      if (total === 0) {
        aRate[province][line] = null;
      } else {
        aRate[province][line] = (pairATotal[pairKey] || 0) / total;
      }
    }
  }

  return { provinces, lines, demand_p: demandP, capacity_l: capacityL, a_rate: aRate };
}

// Adjust demand by available capacity
export function adjustDemandByAvailableCapacity(
  demand_p: Record<string, number>,
  capacity_l: Record<string, number>,
  a_rate: Record<string, Record<string, number | null>>
): Record<string, number> {
  const adjustedDemand: Record<string, number> = {};

  for (const [province, demand] of Object.entries(demand_p)) {
    let maxAvailable = 0;
    for (const [line, capacity] of Object.entries(capacity_l)) {
      if (a_rate[province] && a_rate[province][line] !== null) {
        maxAvailable += capacity;
      }
    }
    const adjusted = Math.min(demand, maxAvailable);
    adjustedDemand[province] = adjusted;

    if (adjusted < demand) {
      console.log(`[需求修正] ${province} 需求并发从 ${demand} 下调到 ${adjusted}，因为可用并发上限只有 ${maxAvailable}。`);
    }
  }

  return adjustedDemand;
}

// Calculate the best possible output for dropping provinces logic
export function calculateBestLineAOutput(
  provinces: string[],
  demand_p: Record<string, number>,
  a_rate: Record<string, Record<string, number | null>>
): Record<string, number> {
  const bestOutput: Record<string, number> = {};

  for (const province of provinces) {
    const rates = Object.values(a_rate[province] || {}).filter((rate): rate is number => rate !== null);
    if (rates.length === 0) {
      bestOutput[province] = 0;
      continue;
    }
    const bestRate = Math.max(...rates);
    bestOutput[province] = demand_p[province] * bestRate;
  }

  return bestOutput;
}

// Solve with javascript-lp-solver
export function solveWithProvinces(
  activeProvinces: string[],
  demand_p: Record<string, number>,
  lines: string[],
  capacity_l: Record<string, number>,
  a_rate: Record<string, Record<string, number | null>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): { solver: typeof solver, solution: any, status: 'OPTIMAL' | 'INFEASIBLE' | 'ERROR', solveTime: number } {

  const startTime = performance.now();

  // Model structure for javascript-lp-solver
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model: any = {
    optimize: 'objective',
    opType: 'max',
    constraints: {},
    variables: {},
    ints: {} // Integer programming
  };

  // Add line capacity constraints
  for (const line of lines) {
    model.constraints[`Supply_${line}`] = { max: capacity_l[line] };
  }

  // Add province demand constraints (equality)
  for (const province of activeProvinces) {
    model.constraints[`Demand_${province}`] = { equal: demand_p[province] };
  }

  // Add variables
  for (const province of activeProvinces) {
    for (const line of lines) {
      const rate = a_rate[province][line];
      const variableName = `c_${province}_${line}`;

      model.variables[variableName] = {
        [`Supply_${line}`]: 1,
        [`Demand_${province}`]: 1,
        objective: rate !== null ? rate : 0
      };

      // Ensure integers
      model.ints[variableName] = 1;

      // Ensure variable can't be used if rate is null
      if (rate === null) {
        model.constraints[`Disable_${variableName}`] = { max: 0 };
        model.variables[variableName][`Disable_${variableName}`] = 1;
      }
    }
  }

  try {
    const solution = solver.Solve(model);
    const endTime = performance.now();

    // In javascript-lp-solver, solution.feasible tells us if it worked
    return {
      solver,
      solution,
      status: solution.feasible ? 'OPTIMAL' : 'INFEASIBLE',
      solveTime: (endTime - startTime) / 1000
    };
  } catch (error) {
    console.error("Solver error:", error);
    return { solver, solution: null, status: 'ERROR', solveTime: 0 };
  }
}

// Extract allocation from javascript-lp-solver result
export function extractAllocation(
  activeProvinces: string[],
  lines: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  solution: any
): Record<string, number> {
  const allocation: Record<string, number> = {};

  for (const province of activeProvinces) {
    for (const line of lines) {
      const variableName = `c_${province}_${line}`;
      const value = solution[variableName];
      if (value && value > 0) {
        allocation[`${province}_${line}`] = value;
      }
    }
  }

  return allocation;
}

// Calculate remaining capacity
export function calculateRemainingCapacity(
  allocation: Record<string, number>,
  lines: string[],
  capacity_l: Record<string, number>
): Record<string, number> {
  const usedCapacity: Record<string, number> = {};
  for (const line of lines) usedCapacity[line] = 0;

  for (const [key, value] of Object.entries(allocation)) {
    const [, line] = key.split('_');
    usedCapacity[line] = (usedCapacity[line] || 0) + value;
  }

  const remainingCapacity: Record<string, number> = {};
  for (const line of lines) {
    remainingCapacity[line] = capacity_l[line] - usedCapacity[line];
  }

  return remainingCapacity;
}

// Add back removed provinces
export function addBackRemovedProvinces(
  removedProvinces: string[],
  allocation: Record<string, number>,
  demand_p: Record<string, number>,
  lines: string[],
  capacity_l: Record<string, number>,
  a_rate: Record<string, Record<string, number | null>>
): Record<string, number> {
  if (removedProvinces.length === 0) {
    console.log("没有被剔除的省份，无需回填。");
    return allocation;
  }

  console.log("\\n开始按反向剔除顺序回填省份并发：");
  const remainingCapacity = calculateRemainingCapacity(allocation, lines, capacity_l);

  for (let i = removedProvinces.length - 1; i >= 0; i--) {
    const province = removedProvinces[i];
    const demand = demand_p[province];
    let remainingNeed = demand;

    const linePriority: { line: string; rate: number }[] = [];
    for (const line of lines) {
      const rate = a_rate[province][line];
      if (rate !== null && remainingCapacity[line] > 0) {
        linePriority.push({ line, rate });
      }
    }

    linePriority.sort((a, b) => b.rate - a.rate);

    let addedForProvince = 0;
    for (const { line } of linePriority) {
      if (remainingNeed <= 0) break;
      const canAdd = Math.min(remainingNeed, remainingCapacity[line]);
      if (canAdd <= 0) continue;

      const key = `${province}_${line}`;
      allocation[key] = (allocation[key] || 0) + canAdd;
      remainingCapacity[line] -= canAdd;
      remainingNeed -= canAdd;
      addedForProvince += canAdd;
    }

    if (addedForProvince > 0) {
      console.log(`  回填 ${province}: 成功增加 ${addedForProvince} 并发，需求 ${demand}，未满足 ${remainingNeed}。`);
    } else {
      console.log(`  回填 ${province}: 无可用线路容量，增加 0 并发。`);
    }
  }

  console.log("回填完成。");
  return allocation;
}

// Main optimization function mimicking the full orchestration
export function solveConcurrencyOptimization(inputs: ModelInputs): AllocationResult | null {
  const { provinces, lines, demand_p, capacity_l, a_rate } = inputs;

  let activeProvinces = [...provinces];
  const baseDemand = adjustDemandByAvailableCapacity(demand_p, capacity_l, a_rate);
  const removedProvinces: string[] = [];

  let totalSolveTime = 0;

  while (activeProvinces.length > 0) {
    const currentDemand: Record<string, number> = {};
    for (const p of activeProvinces) {
      currentDemand[p] = baseDemand[p];
    }

    const { solution, status, solveTime } = solveWithProvinces(activeProvinces, currentDemand, lines, capacity_l, a_rate);
    totalSolveTime += solveTime;

    if (status === 'OPTIMAL') {
      console.log("求解成功");

      let allocation = extractAllocation(activeProvinces, lines, solution);
      allocation = addBackRemovedProvinces(removedProvinces, allocation, baseDemand, lines, capacity_l, a_rate);

      let totalAllocated = 0;
      for (const val of Object.values(allocation)) {
        totalAllocated += val;
      }

      const finalProvincesSet = new Set<string>();
      for (const key of Object.keys(allocation)) {
        const province = key.split('_')[0];
        finalProvincesSet.add(province);
      }

      const finalProvinces = Array.from(finalProvincesSet).sort((a, b) => provinces.indexOf(a) - provinces.indexOf(b));

      return {
        allocation,
        total_allocated: totalAllocated,
        solve_time: totalSolveTime,
        final_provinces: finalProvinces,
        demand_p: baseDemand,
        capacity_l
      };
    }

    // Fallback: Drop a province
    const bestOutput = calculateBestLineAOutput(activeProvinces, currentDemand, a_rate);

    let removedProvince = activeProvinces[0];
    let minVal = Infinity;

    for (const [p, val] of Object.entries(bestOutput)) {
      if (val < minVal) {
        minVal = val;
        removedProvince = p;
      }
    }

    console.log(`当前模型无最优解，剔除省份: ${removedProvince}（A类产出最少）`);
    removedProvinces.push(removedProvince);
    activeProvinces = activeProvinces.filter(p => p !== removedProvince);
  }

  console.log("所有省份都已被剔除，仍无法得到可行解。");
  return null;
}
