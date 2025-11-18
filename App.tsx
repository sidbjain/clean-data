
import React, { useState, useCallback } from 'react';
import { AppStep, ChartConfig, DataRecord } from './types';
import FileUploadStep from './components/FileUploadStep';
import DataCleaningStep from './components/DataCleaningStep';
import DashboardStep from './components/DashboardStep';
import Stepper from './components/Stepper';
import { GithubIcon } from './components/icons/Icons';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.FileUpload);
  const [rawCsvData, setRawCsvData] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [cleanedData, setCleanedData] = useState<DataRecord[]>([]);
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);

  const handleFileUploaded = useCallback((data: string, name: string) => {
    setRawCsvData(data);
    setFileName(name);
    setStep(AppStep.DataCleaning);
  }, []);

  const handleDataCleaned = useCallback((data: DataRecord[]) => {
    setCleanedData(data);
    setStep(AppStep.Dashboard);
  }, []);

  const handleDashboardGenerated = useCallback((configs: ChartConfig[]) => {
    setChartConfigs(configs);
  }, []);
  
  const handleReset = useCallback(() => {
    setStep(AppStep.FileUpload);
    setRawCsvData('');
    setFileName('');
    setCleanedData([]);
    setChartConfigs([]);
  }, []);

  const renderStep = () => {
    switch (step) {
      case AppStep.FileUpload:
        return <FileUploadStep onFileUploaded={handleFileUploaded} />;
      case AppStep.DataCleaning:
        return <DataCleaningStep rawCsvData={rawCsvData} onDataCleaned={handleDataCleaned} fileName={fileName} />;
      case AppStep.Dashboard:
        return <DashboardStep cleanedData={cleanedData} onDashboardGenerated={handleDashboardGenerated} chartConfigs={chartConfigs} onReset={handleReset} />;
      default:
        return <FileUploadStep onFileUploaded={handleFileUploaded} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-6xl mx-auto flex justify-between items-center pb-4">
          <div className="flex items-center space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">DataClean & Viz AI</h1>
          </div>
          <a href="https://github.com/google/labs-prototypes/tree/main/data-clean-viz-ai" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-800 transition-colors">
              <GithubIcon className="w-6 h-6" />
          </a>
      </header>
      
      <main className="w-full max-w-6xl mx-auto flex-grow flex flex-col">
        <Stepper currentStep={step} />
        <div className="mt-8 flex-grow">
          {renderStep()}
        </div>
      </main>
    </div>
  );
};

export default App;
