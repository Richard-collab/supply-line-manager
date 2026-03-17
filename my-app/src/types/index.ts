export interface RecordData {
  province: string;
  line_code: string;
  intention_class: string;
}

export interface ModelInputs {
  provinces: string[];
  lines: string[];
  demand_p: Record<string, number>;
  capacity_l: Record<string, number>;
  a_rate: Record<string, Record<string, number | null>>;
}

export interface AllocationResult {
  allocation: Record<string, number>; // key format: "province_line", value: amount
  total_allocated: number;
  solve_time: number;
  final_provinces: string[];
  demand_p: Record<string, number>;
  capacity_l: Record<string, number>;
}
