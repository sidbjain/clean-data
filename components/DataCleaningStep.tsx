import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { DataRecord, CleaningResults } from '../types';
import { cleanDataWithGemini } from '../services/geminiService';
import { LoaderIcon, SparklesIcon, FileTextIcon, MagicWandIcon, UndoIcon, RedoIcon } from './icons/Icons';

interface DataCleaningStepProps {
  rawCsvData: string;
  fileName: string;
  onDataCleaned: (data: DataRecord[]) => void;
}

const AUTO_CLEAN_PROMPT = `
Automatically clean and preprocess the data. Perform the following tasks:
1.  Identify column data types (numeric, string, date).
2.  Handle missing values: Remove any row that contains one or more missing, empty, or null values in any of its columns. Do not attempt to fill missing data.
3.  Remove any fully duplicate rows.
4.  Trim leading/trailing whitespace from all string values.
5.  Attempt to standardize date formats to YYYY-MM-DD.
6.  Correct obvious typos in categorical columns if possible (e.g., 'Nwe York' to 'New York').
`;

type RemovedRow = { originalRow: DataRecord; reason: string };

type DataHistory = {
    past: { cleanedData: DataRecord[], removedRows: RemovedRow[] }[];
    present: { cleanedData: DataRecord[], removedRows: RemovedRow[] };
    future: { cleanedData: DataRecord[], removedRows: RemovedRow[] }[];
}

const DataCleaningStep: React.FC<DataCleaningStepProps> = ({ rawCsvData, fileName, onDataCleaned }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<'auto' | 'custom' | null>(null);
  const [error, setError] = useState<string>('');
  
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [cleaningSummary, setCleaningSummary] = useState<string>('');
  const [dataHistory, setDataHistory] = useState<DataHistory>({ past: [], present: { cleanedData: [], removedRows: [] }, future: [] });

  const { cleanedData: finalCleanedData, removedRows } = dataHistory.present;

  const [sampleData, headers] = useMemo(() => {
    if (!rawCsvData) return [[], []];
    const lines = rawCsvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1, 6).map(line => {
      const values = line.split(',');
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
        return obj;
      }, {} as DataRecord);
    });
    return [data, headers];
  }, [rawCsvData]);
  
  const handleCleanData = async (cleaningPrompt: string, action: 'auto' | 'custom') => {
    if (!cleaningPrompt) {
        setError('Please provide cleaning instructions.');
        return;
    }
    setActiveAction(action);
    setIsProcessing(true);
    setError('');
    try {
        const results = await cleanDataWithGemini(rawCsvData, cleaningPrompt);
        setCleaningSummary(results.changeLog.summary);
        setDataHistory({
            past: [],
            present: {
                cleanedData: results.cleanedData,
                removedRows: results.changeLog.removedRows,
            },
            future: []
        });
        setIsReviewing(true);
    } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
        setIsProcessing(false);
        setActiveAction(null);
    }
  };
  
  const handleRestoreRow = useCallback((rowToRestore: RemovedRow, index: number) => {
    const { present, past } = dataHistory;

    const newPresent = {
      cleanedData: [...present.cleanedData, rowToRestore.originalRow],
      removedRows: present.removedRows.filter((_, i) => i !== index),
    };

    setDataHistory({
      past: [...past, present],
      present: newPresent,
      future: [] // Clear future on new action
    });
  }, [dataHistory]);
  
  const handleUndo = useCallback(() => {
    const { past, present, future } = dataHistory;
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setDataHistory({
        past: newPast,
        present: previous,
        future: [present, ...future],
    });
  }, [dataHistory]);

  const handleRedo = useCallback(() => {
    const { past, present, future } = dataHistory;
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setDataHistory({
        past: [...past, present],
        present: next,
        future: newFuture,
    });
  }, [dataHistory]);


  const handleConfirmCleaning = () => {
      onDataCleaned(finalCleanedData);
  };
  
  if (isReviewing) {
    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Cleaning Summary</h2>
                <p className="text-slate-600 mb-6">Review the changes made by the AI. You can restore any row removals before proceeding.</p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-blue-800 mb-2">AI's Summary of Actions:</h3>
                    <p className="text-sm text-blue-700 whitespace-pre-wrap">{cleaningSummary}</p>
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <button onClick={handleUndo} disabled={dataHistory.past.length === 0} className="flex items-center px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <UndoIcon className="w-4 h-4 mr-1"/>
                      Undo
                  </button>
                  <button onClick={handleRedo} disabled={dataHistory.future.length === 0} className="flex items-center px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <RedoIcon className="w-4 h-4 mr-1"/>
                      Redo
                  </button>
                </div>
                
                {removedRows.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2">Removed Rows ({removedRows.length}):</h3>
                    <div className="overflow-x-auto max-h-96 rounded-lg border border-slate-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    {headers.map((header, i) => (
                                        <th key={i} className="px-4 py-2 text-left font-semibold text-slate-600">{header}</th>
                                    ))}
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Reason</th>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                            {removedRows.map((item, i) => (
                                <tr key={i} className="border-t border-slate-200">
                                    {headers.map((header, j) => (
                                        <td key={j} className="px-4 py-2 text-slate-600 truncate max-w-xs">{String(item.originalRow[header] ?? '')}</td>
                                    ))}
                                    <td className="px-4 py-2 text-slate-500 italic">{item.reason}</td>
                                    <td className="px-4 py-2">
                                        <button onClick={() => handleRestoreRow(item, i)} className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                                            <UndoIcon className="w-4 h-4 mr-1"/>
                                            Restore
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex justify-between items-center">
                    <button onClick={() => setIsReviewing(false)} className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50">
                        Back to Edit
                    </button>
                    <button onClick={handleConfirmCleaning} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                        Confirm & Proceed
                    </button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md">
        <div className="flex items-center space-x-3 mb-6">
            <FileTextIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-800">Clean Your Data: <span className="font-medium text-slate-500">{fileName}</span></h2>
        </div>

        <div className="mb-6">
            <h3 className="font-semibold text-slate-700 mb-2">Data Preview (First 5 Rows)</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            {headers.map((header, i) => (
                                <th key={i} className="px-4 py-2 text-left font-semibold text-slate-600">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                       {sampleData.map((row, i) => (
                           <tr key={i} className="border-t border-slate-200">
                               {headers.map((header, j) => (
                                   <td key={j} className="px-4 py-2 text-slate-600 truncate max-w-xs">{String(row[header])}</td>
                               ))}
                           </tr>
                       ))}
                    </tbody>
                </table>
            </div>
        </div>

        <div>
          <label htmlFor="cleaning-prompt" className="block text-md font-semibold text-slate-700 mb-2">
            Option 1: Describe how to clean the data (for custom tasks)
          </label>
          <textarea
            id="cleaning-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'Remove rows where 'Sales' is 0. Fill missing 'Region' with 'N/A'. Convert 'Order Date' to YYYY-MM-DD format.'"
            className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            disabled={isProcessing}
          />
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        
        <div className="mt-6 flex flex-col sm:flex-row justify-end sm:items-center sm:space-x-4">
            <div className='text-center sm:text-left mb-4 sm:mb-0'>
                <p className="font-semibold text-slate-700">Option 2: One-click cleaning</p>
                <p className="text-sm text-slate-500">Let AI handle common cleaning tasks automatically.</p>
            </div>
            <div className="flex justify-end space-x-4">
                <button
                    onClick={() => handleCleanData(AUTO_CLEAN_PROMPT, 'auto')}
                    disabled={isProcessing}
                    className="inline-flex items-center px-6 py-3 border border-slate-300 text-base font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isProcessing && activeAction === 'auto' ? (
                        <>
                            <LoaderIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <MagicWandIcon className="-ml-1 mr-2 h-5 w-5" />
                            Auto-clean with AI
                        </>
                    )}
                </button>
                <button
                    onClick={() => handleCleanData(prompt, 'custom')}
                    disabled={isProcessing || !prompt}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isProcessing && activeAction === 'custom' ? (
                        <>
                            <LoaderIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                            Cleaning...
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="-ml-1 mr-2 h-5 w-5" />
                            Clean with Instructions
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DataCleaningStep;