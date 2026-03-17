import { useState, useCallback } from 'react';
import { generateRandomRecords, buildModelInputsFromMockData, solveConcurrencyOptimization } from '@/lib/optimization/solver';
import { ModelInputs, AllocationResult } from '@/types';

interface OptimizationState {
  inputs: ModelInputs | null;
  result: AllocationResult | null;
  isLoading: boolean;
  error: string | null;
  logs: string[];
}

export function useOptimization() {
  const [state, setState] = useState<OptimizationState>({
    inputs: null,
    result: null,
    isLoading: false,
    error: null,
    logs: [],
  });

  const runOptimization = useCallback(async (nRecords: number, numProvinces: number, numLineCodes: number, capacityRatio: number) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, logs: [] }));

    // Intercept console.log to show logs on the UI
    const capturedLogs: string[] = [];
    const originalLog = console.log;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log = (...args: any[]) => {
      capturedLogs.push(args.join(' '));
      originalLog(...args);
    };

    try {
      // Use setImmediate/setTimeout equivalent to not block UI immediately during heavy computation
      await new Promise(resolve => setTimeout(resolve, 50));

      const records = generateRandomRecords(nRecords, numProvinces, numLineCodes);
      const inputs = buildModelInputsFromMockData(records, capacityRatio);

      console.log("已从 mock_data 构建调度输入：");
      console.log(`  省份数量: ${inputs.provinces.length}`);
      console.log(`  线路数量: ${inputs.lines.length}`);

      let totalDemand = 0;
      for (const val of Object.values(inputs.demand_p)) totalDemand += val;
      console.log(`  总需求并发: ${totalDemand}`);

      let totalCapacity = 0;
      for (const val of Object.values(inputs.capacity_l)) totalCapacity += val;
      console.log(`  总线路容量: ${totalCapacity}`);

      const result = solveConcurrencyOptimization(inputs);

      if (result) {
        console.log(`\\n总分配并发: ${result.total_allocated}`);
        console.log(`求解耗时: ${result.solve_time.toFixed(4)} 秒`);
        console.log(`最终参与省份: ${result.final_provinces.join(', ')}`);
      }

      setState({
        inputs,
        result,
        isLoading: false,
        error: result ? null : "所有省份都已被剔除，仍无法得到可行解。",
        logs: capturedLogs,
      });

    } catch (err) {
      console.error(err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "发生未知错误",
        logs: capturedLogs,
      }));
    } finally {
      // Restore console.log
      console.log = originalLog;
    }
  }, []);

  return { ...state, runOptimization };
}
