import React, { useState, useCallback, useRef } from 'react';
import { UploadCloudIcon } from './icons/Icons';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface FileUploadStepProps {
  onFileUploaded: (data: string, fileName: string) => void;
}

const FileUploadStep: React.FC<FileUploadStepProps> = ({ onFileUploaded }) => {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (e) => {
      const content = e.target?.result;
      if (content === null || content === undefined) {
        alert('Could not read file content.');
        return;
      }

      try {
        let csvString = '';
        if (fileExtension === 'csv' || fileExtension === 'txt') {
          csvString = content as string;
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          const workbook = XLSX.read(content, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          csvString = XLSX.utils.sheet_to_csv(worksheet);
        } else if (fileExtension === 'json') {
          const jsonData = JSON.parse(content as string);
          if (Array.isArray(jsonData)) {
            csvString = Papa.unparse(jsonData);
          } else {
            throw new Error('JSON file must contain an array of objects.');
          }
        } else {
          alert('Unsupported file type. Please upload a CSV, Excel, or JSON file.');
          return;
        }
        onFileUploaded(csvString, file.name);
      } catch (error) {
        console.error("Error parsing file:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred during parsing.";
        alert(`Failed to parse file: ${message}`);
      }
    };
    
    reader.onerror = () => {
        alert('Error reading file.');
    };

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        reader.readAsBinaryString(file);
    } else if (fileExtension === 'csv' || fileExtension === 'txt' || fileExtension === 'json') {
        reader.readAsText(file);
    } else {
        alert('Please upload a valid CSV, Excel, or JSON file.');
    }
  }, [onFileUploaded]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };
  
  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
        <div 
          className={`w-full p-8 border-2 border-dashed rounded-xl transition-colors duration-300 flex flex-col items-center justify-center text-center cursor-pointer
            ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-slate-400'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={onButtonClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="p-4 bg-slate-100 rounded-full">
            <UploadCloudIcon className="w-8 h-8 text-slate-500" />
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-700">
            Drag & drop your data file here
          </p>
          <p className="mt-1 text-sm text-slate-500">
            or click to browse. Supported formats: CSV, Excel, JSON.
          </p>
        </div>
    </div>
  );
};

export default FileUploadStep;