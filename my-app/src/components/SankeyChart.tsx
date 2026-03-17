import React from 'react';
import Chart from 'react-google-charts';
import { AllocationResult, ModelInputs } from '@/types';

interface SankeyChartProps {
  result: AllocationResult;
  inputs: ModelInputs;
}

export default function SankeyChart({ result, inputs }: SankeyChartProps) {
  const { allocation } = result;
  const { provinces, lines, capacity_l, demand_p } = inputs;

  const data: Array<Array<string | number | { type: string; role: string; p: { html: boolean } }>> = [
    ['From', 'To', 'Weight', { type: 'string', role: 'tooltip', p: { html: true } }],
  ];

  let hasData = false;

  for (const [key, amount] of Object.entries(allocation)) {
    if (amount <= 0) continue;
    hasData = true;

    // Key format is "Province_X_Line_Y", we need to split it
    // Wait, let's make sure our key format from solver.ts is correct: `${province}_${line}`
    const separatorIndex = key.lastIndexOf('_Line_');
    let province = key.substring(0, separatorIndex);
    let line = `Line_${key.substring(separatorIndex + 6)}`;

    // Quick fix: the above logic might fail if key structure isn't exactly like that.
    // Let's use a more robust split: assuming keys are like "Province_1_Line_1"
    const parts = key.split('_');
    // For standard province and line: parts[0] = 'Province', parts[1] = '1', parts[2] = 'Line', parts[3] = '1'
    if (parts.length >= 4) {
      const pIndex = key.indexOf('_Line_');
      if (pIndex !== -1) {
        province = key.substring(0, pIndex);
        line = key.substring(pIndex + 1);
      }
    }

    const tooltipHtml = `
      <div style="padding: 10px; font-family: sans-serif;">
        <strong>${line} → ${province}</strong><br/>
        分配并发: ${amount}
      </div>
    `;

    data.push([line, province, amount, tooltipHtml]);
  }

  if (!hasData) {
    return <div className="text-center p-8 bg-gray-50 rounded-lg text-gray-500">暂无分配数据可用于图表展示</div>;
  }

  const options = {
    sankey: {
      node: {
        labelPadding: 20,
        nodePadding: 40,
        width: 15,
        interactivity: true,
      },
      link: {
        colorMode: 'gradient',
      },
    },
    tooltip: { isHtml: true },
  };

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <h3 className="text-xl font-semibold mb-6 text-center text-gray-800">线路 → 省份 并发分配桑基图</h3>
      <div className="w-full h-[600px] overflow-x-auto">
        <div className="min-w-[800px] h-full">
          <Chart
            chartType="Sankey"
            width="100%"
            height="100%"
            data={data}
            options={options}
          />
        </div>
      </div>

      {/* Node specific tooltips replacement: summary section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
        <div>
          <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">线路使用情况 (Line Usage)</h4>
          <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {lines.map((line) => {
              const capacity = capacity_l[line];
              const used = Object.entries(allocation)
                .filter(([k]) => k.includes(line))
                .reduce((sum, [, val]) => sum + val, 0);
              return (
                <li key={line} className="flex justify-between items-center py-1">
                  <span className="font-medium">{line}</span>
                  <span className="text-gray-500">已用: {used} / 容量: {capacity}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">省份满足情况 (Province Fulfillment)</h4>
          <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {provinces.map((province) => {
              const demand = demand_p[province];
              const allocated = Object.entries(allocation)
                .filter(([k]) => k.startsWith(province + '_'))
                .reduce((sum, [, val]) => sum + val, 0);
              return (
                <li key={province} className="flex justify-between items-center py-1">
                  <span className="font-medium">{province}</span>
                  <span className={allocated < demand ? 'text-amber-600' : 'text-green-600'}>
                    已分配: {allocated} / 需求: {demand}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
