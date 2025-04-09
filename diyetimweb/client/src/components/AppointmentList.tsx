import React from "react";
import { formatDate } from "@/utils/formatDate";
import { Appointment, Client } from "@shared/schema";

// Güvenli tarih formatlama fonksiyonu
const formatDateSafe = (dateInput: Date | string | undefined): string => {
  if (!dateInput) return '-';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return formatDate(date);
  } catch (e) {
    console.error('Tarih formatlama hatası:', e);
    return typeof dateInput === 'string' ? dateInput : '-';
  }
};

interface AppointmentWithClient extends Appointment {
  client: Client;
}

interface AppointmentListProps {
  appointments: AppointmentWithClient[];
  loading: boolean;
  emptyMessage?: string;
}

export function AppointmentList({ appointments, loading, emptyMessage = "Yaklaşan randevu bulunmuyor." }: AppointmentListProps) {
  if (loading) {
    return (
      <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
        <i className="fas fa-spinner fa-spin mr-2"></i> Randevular yükleniyor...
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
        <i className="far fa-calendar-times text-3xl mb-2"></i>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
      {appointments.map((appointment) => (
        <li key={appointment._id}>
          <div className="px-6 py-4 flex items-center">
            <div className="min-w-0 flex-1 flex items-center">
              <div className="flex-shrink-0">
                {appointment.client.profilePicture ? (
                  <img 
                    className="h-12 w-12 rounded-full object-cover" 
                    src={appointment.client.profilePicture} 
                    alt={`${appointment.client.name} profil resmi`} 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.classList.add('fallback-icon');
                    }}
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <i className={`fas fa-${appointment.client.gender === 'female' ? 'female' : 'male'} text-gray-500 dark:text-gray-400`}></i>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 px-4">
                <div>
                  <p className="text-sm font-medium text-primary dark:text-primary-light truncate">
                    {appointment.client.name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <i className="far fa-clock mr-1"></i> {formatDateSafe(appointment.date)}
                  </p>
                </div>
              </div>
            </div>
            <div className="ml-6 flex-shrink-0">
              <button 
                type="button" 
                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white ${
                  appointment.type === 'online' 
                    ? 'bg-secondary hover:bg-secondary-dark' 
                    : 'bg-primary hover:bg-primary-dark'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${appointment.type === 'online' ? 'secondary' : 'primary'}`}
              >
                <i className={`fas fa-${appointment.type === 'online' ? 'video' : 'user'} mr-1`}></i>
                {appointment.type === 'online' ? 'Görüntülü' : 'Yüz yüze'}
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
