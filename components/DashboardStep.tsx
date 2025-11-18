import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ChartConfig, DataRecord, Filters } from '../types';
import { generateDashboardConfigsWithGemini } from '../services/geminiService';
import ChartRenderer from './charts/ChartRenderer';
import { LoaderIcon, SparklesIcon, RefreshCwIcon, FilterIcon, ChevronDownIcon } from './icons/Icons';

interface DashboardStepProps {
  cleanedData: DataRecord[];
  chartConfigs: ChartConfig[];
  onDashboardGenerated: (configs: ChartConfig[]) => void;
  onReset: () => void;
}

const MemoizedChartRenderer = React.memo(ChartRenderer);

const FilterDropdown: React.FC<{ column: string; values: (string | number)[]; selected: (string | number)[]; onChange: (newSelected: (string | number)[]) => void; }> = ({ column, values, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    const handleSelect = (value: string | number) => {
        const newSelected = selected.includes(value)
            ? selected.filter(item => item !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    return (
        <div className="relative inline-block text-left" ref={ref}>
            <div>
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="inline-flex justify-center w-full rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    {column}
                    {selected.length > 0 && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">{selected.length}</span>}
                    <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" />
                </button>
            </div>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1 max-h-60 overflow-y-auto" role="menu" aria-orientation="vertical">
                        {values.map(value => (
                            <label key={String(value)} className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer">
                                <input type="checkbox" className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" checked={selected.includes(value)} onChange={() => handleSelect(value)} />
                                <span className="ml-3 truncate">{String(value)}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const DashboardStep: React.FC<DashboardStepProps> = ({ cleanedData, chartConfigs, onDashboardGenerated, onReset }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  
  const [filters, setFilters] = useState<Filters>({});
  const [filteredData, setFilteredData] = useState<DataRecord[]>(cleanedData);

  const categoricalColumns = useMemo(() => {
    if (cleanedData.length === 0) return [];
    const headers = Object.keys(cleanedData[0]);
    // A simple heuristic for categorical data: string type with not too many unique values
    return headers.filter(header => {
        if (typeof cleanedData[0][header] !== 'string') return false;
        const uniqueValues = new Set(cleanedData.map(row => row[header]));
        return uniqueValues.size > 1 && uniqueValues.size <= 50;
    });
  }, [cleanedData]);

  const uniqueFilterValues = useMemo(() => {
    const values: Record<string, (string|number)[]> = {};
    categoricalColumns.forEach(col => {
      const uniqueVals = [...new Set(cleanedData.map(row => row[col]))].sort();
      values[col] = uniqueVals;
    });
    return values;
  }, [cleanedData, categoricalColumns]);

  useEffect(() => {
    const activeFilters = Object.keys(filters).filter(key => filters[key].length > 0);

    if (activeFilters.length === 0) {
      setFilteredData(cleanedData);
      setPage(0);
      return;
    }

    const newFilteredData = cleanedData.filter(row => {
      return activeFilters.every(key => {
        return filters[key].includes(row[key]);
      });
    });
    setFilteredData(newFilteredData);
    setPage(0);
  }, [filters, cleanedData]);


  const handleGenerateDashboard = useCallback(async () => {
    if (!prompt) {
      setError('Please provide instructions for the dashboard.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const configs = await generateDashboardConfigsWithGemini(filteredData, prompt);
      onDashboardGenerated(configs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, filteredData, onDashboardGenerated]);

  const headers = cleanedData.length > 0 ? Object.keys(cleanedData[0]) : [];
  const paginatedData = filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const pageCount = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 sm:mb-0">Filtered Data ({filteredData.length} of {cleanedData.length} rows)</h2>
            {categoricalColumns.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <FilterIcon className="w-5 h-5 text-slate-500"/>
                    <span className="font-semibold text-slate-700">Filters:</span>
                    {categoricalColumns.map(col => (
                        <FilterDropdown
                            key={col}
                            column={col}
                            values={uniqueFilterValues[col]}
                            selected={filters[col] || []}
                            onChange={(newSelected) => setFilters(prev => ({...prev, [col]: newSelected}))}
                        />
                    ))}
                </div>
            )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>{headers.map(h => <th key={h} className="px-4 py-2 text-left font-semibold text-slate-600">{h}</th>)}</tr>
            </thead>
            <tbody className="bg-white">
              {paginatedData.map((row, i) => (
                <tr key={i} className="border-t border-slate-200">
                  {headers.map(h => <td key={h} className="px-4 py-2 text-slate-600 truncate max-w-xs">{String(row[h])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div className="flex justify-between items-center mt-4">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50">Previous</button>
            <span className="text-sm text-slate-500">Page {page + 1} of {pageCount}</span>
            <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="px-3 py-1 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Generate Dashboard</h2>
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'Show total sales by region. Create a time-series chart for profit over time. What's the distribution of product categories?'"
            className="w-full h-28 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            disabled={isLoading}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-between items-center">
            <button onClick={onReset} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400">
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Start Over
            </button>
            <button
                onClick={handleGenerateDashboard}
                disabled={isLoading || !prompt}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? (
                    <>
                        <LoaderIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                        Generating...
                    </>
                ) : (
                    <>
                        <SparklesIcon className="-ml-1 mr-2 h-5 w-5" />
                        Generate with AI
                    </>
                )}
            </button>
          </div>
        </div>
      </div>

      {chartConfigs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {chartConfigs.map((config, i) => (
                  <MemoizedChartRenderer key={i} config={config} data={filteredData} />
              ))}
          </div>
      )}
    </div>
  );
};

export default DashboardStep;