declare module 'javascript-lp-solver' {
  export interface Model {
    optimize: string;
    opType: 'max' | 'min';
    constraints: Record<string, { max?: number; min?: number; equal?: number }>;
    variables: Record<string, Record<string, number>>;
    ints?: Record<string, number>;
  }

  export interface Solution {
    feasible: boolean;
    result: number;
    bounded: boolean;
    [key: string]: number | boolean;
  }

  export function Solve(model: Model): Solution;
}
