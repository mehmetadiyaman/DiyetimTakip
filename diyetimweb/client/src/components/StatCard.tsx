import { ReactNode } from "react";

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  iconBg: string;
  iconColor: string;
  link: string;
  linkText: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon, iconBg, iconColor, link, linkText, onClick }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-lg ${iconBg} p-3 shadow-sm transition-all duration-200`}>
            <i className={`${icon} ${iconColor} text-xl`}></i>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</dt>
              <dd>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3 border-t border-gray-100 dark:border-gray-700">
        <div className="text-sm">
          {onClick ? (
            <button
              onClick={onClick}
              className="font-medium text-primary hover:text-primary-dark dark:text-primary-light w-full text-left flex items-center"
            >
              {linkText}
              <i className="fas fa-chevron-right ml-1 text-xs opacity-70"></i>
            </button>
          ) : (
            <a href={link} className="font-medium text-primary hover:text-primary-dark dark:text-primary-light flex items-center">
              {linkText}
              <i className="fas fa-chevron-right ml-1 text-xs opacity-70"></i>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
