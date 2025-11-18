
import React from 'react';
import { ChartConfig, DataRecord } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter
} from 'recharts';

interface ChartRendererProps {
  config: ChartConfig;
  data: DataRecord[];
}

const COLORS = ['#0ea5e9', '#84cc16', '#f97316', '#8b5cf6', '#ec4899', '#facc15'];

const ChartRenderer: React.FC<ChartRendererProps> = ({ config, data }) => {
  const renderChart = () => {
    switch (config.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3}/>
              <XAxis dataKey={config.dataKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip wrapperClassName="!bg-white !border-slate-200 !rounded-md !shadow-lg" />
              <Legend />
              {config.valueKeys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey={config.dataKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip wrapperClassName="!bg-white !border-slate-200 !rounded-md !shadow-lg" />
              <Legend />
              {config.valueKeys.map((key, index) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                    <XAxis dataKey={config.dataKey} tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip wrapperClassName="!bg-white !border-slate-200 !rounded-md !shadow-lg" />
                    <Legend />
                    {config.valueKeys.map((key, index) => (
                        <Area key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.3} />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        );
      case 'pie':
        const pieData = data.map(item => ({ name: item[config.dataKey], value: Number(item[config.valueKeys[0]]) }));
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip wrapperClassName="!bg-white !border-slate-200 !rounded-md !shadow-lg" />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis type="category" dataKey={config.dataKey} name={config.dataKey} tick={{ fontSize: 12 }} />
              <YAxis type="number" dataKey={config.valueKeys[0]} name={config.valueKeys[0]} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} wrapperClassName="!bg-white !border-slate-200 !rounded-md !shadow-lg" />
              <Legend />
              <Scatter name={config.title} data={data} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return <p>Unsupported chart type: {config.chartType}</p>;
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h3 className="text-lg font-bold text-slate-800">{config.title}</h3>
      <p className="text-sm text-slate-500 mb-4">{config.description}</p>
      {renderChart()}
    </div>
  );
};

export default ChartRenderer;
