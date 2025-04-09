import React from "react";
import { formatDate } from "@/utils/formatDate";
import { Activity } from "@shared/schema";

interface ActivityItem {
  _id: string;
  type: string;
  description: string;
  createdAt: Date;
  timeSince: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Aktiviteler yükleniyor...</p>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-4 mb-4">
          <i className="fas fa-clock text-4xl text-gray-400 dark:text-gray-500"></i>
        </div>
        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Henüz aktivite yok</h4>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          Diyet planları eklediğinizde, ölçümler kaydettiğinizde veya randevular oluşturduğunuzda burada görünecektir.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {activities.map(activity => (
        <div key={activity._id} className="py-4 px-6 transition-colors">
          <div className="flex items-start">
            <div className={`flex-shrink-0 mr-4 ${activity.iconBg} p-2 rounded-lg`}>
              <i className={`${activity.icon} ${activity.iconColor}`}></i>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {activity.description}
              </p>
              <div className="mt-1 flex">
                <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <i className="fas fa-clock text-gray-400 dark:text-gray-500 mr-1.5"></i>
                  {activity.timeSince}
                </span>
                
                {/* Aktivite tipine göre etiket */}
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs uppercase tracking-wide font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: getActivityTypeColor(activity.type).bg,
                    color: getActivityTypeColor(activity.type).text
                  }}
                >
                  {getActivityTypeLabel(activity.type)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Aktivite tipine göre renk
function getActivityTypeColor(type: string): { bg: string, text: string } {
  switch (type) {
    case 'diet_plan':
      return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' };
    case 'measurement':
      return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' };
    case 'appointment':
      return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' };
    case 'telegram':
      return { bg: 'rgba(139, 92, 246, 0.1)', text: '#8b5cf6' };
    case 'client':
      return { bg: 'rgba(236, 72, 153, 0.1)', text: '#ec4899' };
    default:
      return { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' };
  }
}

// Aktivite tipine göre etiket
function getActivityTypeLabel(type: string): string {
  switch (type) {
    case 'diet_plan':
      return 'Diyet';
    case 'measurement':
      return 'Ölçüm';
    case 'appointment':
      return 'Randevu';
    case 'telegram':
      return 'Telegram';
    case 'client':
      return 'Danışan';
    default:
      return 'Aktivite';
  }
}
