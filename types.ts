export enum AppStep {
  FileUpload = 1,
  DataCleaning = 2,
  Dashboard = 3,
}

export type DataRecord = {
  [key: string]: string | number;
};

export type ChartConfig = {
  title: string;
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  dataKey: string;
  valueKeys: string[];
  description?: string;
};

export type Filters = Record<string, (string | number)[]>;

export type ChangeLog = {
  summary: string;
  removedRows: { originalRow: DataRecord; reason: string }[];
};

export type CleaningResults = {
  cleanedData: DataRecord[];
  changeLog: ChangeLog;
};
