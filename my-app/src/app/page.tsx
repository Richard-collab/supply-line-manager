'use client';

import { useState } from 'react';
import { useOptimization } from '@/hooks/useOptimization';
import SankeyChart from '@/components/SankeyChart';

export default function Home() {
  const [nRecords, setNRecords] = useState<number>(1000);
  const [numProvinces, setNumProvinces] = useState<number>(10);
  const [numLineCodes, setNumLineCodes] = useState<number>(5);
  const [capacityRatio, setCapacityRatio] = useState<number>(0.7);

  const { inputs, result, isLoading, error, logs, runOptimization } = useOptimization();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runOptimization(nRecords, numProvinces, numLineCodes, capacityRatio);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      <header className="bg-white border-b border-gray-200 py-6 px-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">并发分配调度引擎 (Concurrency Optimization)</h1>
        <p className="text-gray-500 mt-2 text-sm">基于浏览器端的线性规划与回填机制，实现零配置服务器部署。</p>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Sidebar Form */}
        <div className="lg:col-span-4 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-gray-100 transition-all hover:shadow-lg">
            <h2 className="text-xl font-semibold mb-6 border-b pb-2">参数配置</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模拟记录数 (n_records)</label>
                <input
                  type="number"
                  min="100" max="500000"
                  value={nRecords}
                  onChange={(e) => setNRecords(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                />
                <p className="text-xs text-gray-400 mt-1">建议 1000 - 10000 以避免浏览器卡顿。</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">省份数量 (num_provinces)</label>
                <input
                  type="number"
                  min="2" max="50"
                  value={numProvinces}
                  onChange={(e) => setNumProvinces(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">线路数量 (num_line_codes)</label>
                <input
                  type="number"
                  min="2" max="30"
                  value={numLineCodes}
                  onChange={(e) => setNumLineCodes(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">容量系数 (capacity_ratio)</label>
                <input
                  type="number"
                  step="0.1" min="0.1" max="2.0"
                  value={capacityRatio}
                  onChange={(e) => setCapacityRatio(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                />
                <p className="text-xs text-gray-400 mt-1">控制总线路容量与总需求并发的比例。</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-8 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
                ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}
                transition-colors duration-200`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  计算中 (Computing)...
                </span>
              ) : '开始调度 (Run Dispatch)'}
            </button>
          </form>

          {/* Logs Panel */}
          <div className="bg-gray-900 rounded-xl shadow-md p-4 h-64 overflow-y-auto border border-gray-800">
            <h3 className="text-gray-300 text-xs font-mono mb-2 uppercase tracking-wider">Console Output</h3>
            <div className="font-mono text-xs text-green-400 space-y-1 break-words">
              {logs.length === 0 && <span className="text-gray-600">Waiting for execution...</span>}
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">优化失败</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && result && inputs ? (
            <SankeyChart result={result} inputs={inputs} />
          ) : (
            !isLoading && !error && (
              <div className="bg-white p-12 rounded-xl shadow-sm border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 h-[600px]">
                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-lg font-medium">配置参数并点击 &quot;开始调度&quot; 以生成图表</p>
              </div>
            )
          )}
        </div>

      </main>
    </div>
  );
}
