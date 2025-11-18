
import React from 'react';
import { AppStep } from '../types';
import { UploadCloudIcon, WrenchIcon, LayoutDashboardIcon, CheckIcon } from './icons/Icons';

interface StepperProps {
  currentStep: AppStep;
}

const steps = [
  { id: AppStep.FileUpload, name: 'Upload Data', icon: UploadCloudIcon },
  { id: AppStep.DataCleaning, name: 'Clean Data', icon: WrenchIcon },
  { id: AppStep.Dashboard, name: 'Generate Dashboard', icon: LayoutDashboardIcon },
];

const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''} flex-1`}>
            {step.id < currentStep ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-blue-600" />
                </div>
                <div className="relative w-8 h-8 flex items-center justify-center bg-blue-600 rounded-full">
                  <CheckIcon className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
              </>
            ) : step.id === currentStep ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-slate-200" />
                </div>
                <div className="relative w-8 h-8 flex items-center justify-center bg-white border-2 border-blue-600 rounded-full">
                  <span className="h-2.5 w-2.5 bg-blue-600 rounded-full" aria-hidden="true" />
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-slate-200" />
                </div>
                <div className="group relative w-8 h-8 flex items-center justify-center bg-white border-2 border-slate-300 rounded-full">
                </div>
              </>
            )}
            <div className="absolute top-10 w-max text-center -translate-x-1/2 left-1/2">
                <p className={`text-sm font-medium ${step.id <= currentStep ? 'text-blue-600' : 'text-slate-500'}`}>{step.name}</p>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Stepper;
