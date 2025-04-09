import React from "react";

interface ProgressItem {
  label: string;
  current: number;
  total: number;
  color: string;
}

interface ProgressSummaryProps {
  items: ProgressItem[];
  loading: boolean;
}

export function ProgressSummary({ items, loading }: ProgressSummaryProps) {
  if (loading) {
    return (
      <div className="px-6 py-5 text-center text-gray-500 dark:text-gray-400">
        <i className="fas fa-spinner fa-spin mr-2"></i> Yükleniyor...
      </div>
    );
  }

  return (
    <div className="px-6 py-5">
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {item.current}/{item.total}
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                className={`${item.color} h-2 rounded-full`} 
                style={{ width: `${Math.round((item.current / item.total) * 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
