import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { AppointmentList } from "@/components/AppointmentList";
import { ProgressSummary } from "@/components/ProgressSummary";
import { ActivityFeed } from "@/components/ActivityFeed";
import { getTimeSince } from "@/utils/formatDate";
import { DashboardStats, ProgressSummaryItem } from "@/lib/apiTypes";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// MongoDB uyumlu interface tanımlamaları
interface Client {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  createdAt?: string; // Optional olarak işaretlendi
  notes?: string;
  profilePicture?: string;
  status?: string; // Optional olarak işaretlendi
}

interface Appointment {
  _id: string;
  clientId: string;
  userId: string;
  date: Date | string; // String formatını da kabul ediyor
  duration: number;
  status: string;
  notes?: string;
  createdAt: Date | string; // String formatını da kabul ediyor
  updatedAt: Date | string; // String formatını da kabul ediyor
  type?: string; // "online" veya "in-person" değerlerini alır
}

interface Activity {
  _id: string;
  userId: string;
  type: string;
  description: string;
  createdAt: Date;
}

// New interface for the updated activities API response
interface ActivitiesResponse {
  activities: Activity[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
}

interface BlogArticle {
  _id: string;
  title: string;
  content: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  thumbnail?: string;
  tags?: string[];
  isPublished: boolean;
}

const Dashboard: React.FC = () => {
  const { toast } = useToast();
  // Kullanıcı auth bilgisiyle ilgili kısmı düzeltiyorum
  // const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Randevuları getir
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      const response = await fetch('/api/appointments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Randevular alınamadı');
      return response.json() as Promise<Appointment[]>;
    }
  });

  // Bugün aynı gün mü kontrol eden fonksiyon
  const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
    try {
      const d1 = date1 instanceof Date ? date1 : new Date(date1);
      const d2 = date2 instanceof Date ? date2 : new Date(date2);
      
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    } catch (e) {
      console.error("Tarih karşılaştırma hatası:", e);
      return false;
    }
  };

  // Tarih gelecekte mi kontrol eden fonksiyon
  const isDateInFuture = (date: Date | string): boolean => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const compareDate = date instanceof Date ? date : new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      
      return compareDate >= now;
    } catch (e) {
      console.error("Tarih gelecek kontrolü hatası:", e);
      return false;
    }
  };

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) throw new Error('Stats verisi alınamadı');
        
        // API'den veri alamazsak, client tarafında bugünkü randevuları manuel hesapla
        const data = await response.json() as DashboardStats;
        
        // Eğer bugünkü randevular verisi yoksa ve randevular verisini aldıysak
        if ((data.todayAppointments === undefined || data.todayAppointments === 0) && appointments) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Bugünkü randevuları manuel olarak hesapla
          const todayAppointmentsCount = appointments.filter(appointment => {
            try {
              return isSameDay(appointment.date, today);
            } catch (e) {
              console.error("Tarih karşılaştırma hatası:", e);
              return false;
            }
          }).length;
          
          // Hesaplanan randevu sayısını stats verisine ekle
          return {
            ...data,
            todayAppointments: todayAppointmentsCount
          };
        }
        
        return data;
      } catch (error) {
        console.error("Stats verisi alınırken hata:", error);
        throw error;
      }
    },
    // Stats verisi appointments'a bağımlı olsun
    enabled: !appointmentsLoading
  });

  // Fetch clients for appointments
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Danışan verisi alınamadı');
      return response.json() as Promise<Client[]>;
    }
  });

  // Fetch activities - always limit to 5 for dashboard
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['/api/activities'],
    queryFn: async () => {
      const response = await fetch('/api/activities?limit=5', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Aktivite verisi alınamadı');
      return response.json() as Promise<ActivitiesResponse | Activity[]>;
    }
  });

  // Fetch blog articles
  const { data: articles, isLoading: isLoadingArticles } = useQuery({
    queryKey: ['/api/blog'],
    queryFn: async () => {
      const response = await fetch('/api/blog');
      if (!response.ok) throw new Error('Blog makaleleri alınamadı');
      return response.json() as Promise<any[]>;
    },
    enabled: false // Disable this query since we've removed blog functionality
  });

  // Gelecekteki randevuların müşteri bilgileriyle gösterilmesi
  const upcomingAppointmentsWithClients = useMemo(() => {
    if (!appointments || !clients) return [];
    
    try {
      // Sadece gelecekteki randevular
      const futureAppointments = appointments.filter(appointment => {
        try {
          return isDateInFuture(appointment.date);
        } catch (e) {
          console.error("Tarih gelecek kontrolü hatası:", e);
          return false;
        }
      });
      
      // Tarihe göre sırala
      const sortedAppointments = [...futureAppointments].sort((a, b) => {
        try {
          const dateA = a.date instanceof Date ? a.date : new Date(a.date);
          const dateB = b.date instanceof Date ? b.date : new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          console.error("Randevuları sıralama hatası:", e);
          return 0;
        }
      });
      
      // İlk 3 randevuyu göster ve müşteri bilgisini ekle
      return sortedAppointments.slice(0, 3).map(appointment => {
        const client = clients.find(c => c._id === appointment.clientId);
        return {
          ...appointment,
          client
        };
      });
    } catch (e) {
      console.error("Gelecekteki randevuları hesaplama hatası:", e);
      return [];
    }
  }, [appointments, clients, isDateInFuture]);

  // Bugünkü randevuları müşteri bilgileriyle göster
  const todayAppointmentsWithClients = useMemo(() => {
    if (!appointments || !clients) return [];
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Bugünkü randevuları filtrele
      const todaysAppointments = appointments.filter(appointment => {
        try {
          return isSameDay(appointment.date, today);
        } catch (e) {
          console.error("Bugünkü randevu filtreleme hatası:", e);
          return false;
        }
      });
      
      // Saate göre sırala
      const sortedAppointments = [...todaysAppointments].sort((a, b) => {
        try {
          const dateA = a.date instanceof Date ? a.date : new Date(a.date);
          const dateB = b.date instanceof Date ? b.date : new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          console.error("Bugünkü randevuları sıralama hatası:", e);
          return 0;
        }
      });
      
      // Müşteri bilgilerini ekle
      return sortedAppointments.map(appointment => {
        const client = clients.find(c => c._id === appointment.clientId);
        return {
          ...appointment,
          client
        };
      });
    } catch (e) {
      console.error("Bugünkü randevuları hesaplama hatası:", e);
      return [];
    }
  }, [appointments, clients, isSameDay]);

  // Prepare activities with display data
  const formattedActivities = React.useMemo(() => {
    if (!activities) return [];
    
    // Use type guards to check the structure of the response
    const isActivitiesResponse = (data: any): data is ActivitiesResponse => {
      return data && typeof data === 'object' && Array.isArray(data.activities);
    };
    
    // Get the activities array based on the response structure
    const activitiesArray = isActivitiesResponse(activities) 
      ? activities.activities 
      : (Array.isArray(activities) ? activities : []);
    
    return activitiesArray.map(activity => {
      let icon = 'fas fa-bell';
      let iconBg = 'bg-white dark:bg-gray-900 border border-primary/10';
      let iconColor = 'text-primary font-bold';
      
      switch (activity.type) {
        case 'diet_plan':
          icon = 'fas fa-utensils';
          iconBg = 'bg-white dark:bg-gray-900 border border-primary/10';
          iconColor = 'text-primary font-bold';
          break;
        case 'measurement':
          icon = 'fas fa-weight';
          iconBg = 'bg-white dark:bg-gray-900 border border-blue-500/10';
          iconColor = 'text-blue-600 dark:text-blue-400 font-bold';
          break;
        case 'appointment':
          icon = 'fas fa-calendar-alt';
          iconBg = 'bg-white dark:bg-gray-900 border border-amber-500/10';
          iconColor = 'text-amber-600 dark:text-amber-400 font-bold';
          break;
        case 'telegram':
          icon = 'fab fa-telegram-plane';
          iconBg = 'bg-white dark:bg-gray-900 border border-purple-500/10';
          iconColor = 'text-purple-600 dark:text-purple-400 font-bold';
          break;
        case 'client':
          icon = 'fas fa-user-plus';
          iconBg = 'bg-white dark:bg-gray-900 border border-green-500/10';
          iconColor = 'text-green-600 dark:text-green-400 font-bold';
          break;
      }
      
      return {
        ...activity,
        timeSince: getTimeSince(activity.createdAt),
        icon,
        iconBg,
        iconColor
      };
    });
  }, [activities]);

  // Progress summary data - Fallback default values
  const progressItems: ProgressSummaryItem[] = [
    {
      label: "Hedef Ağırlığa Ulaşanlar",
      current: 12,
      total: 42,
      color: "bg-green-500"
    },
    {
      label: "Diyet Uyumu",
      current: 27,
      total: 42,
      color: "bg-primary"
    },
    {
      label: "Egzersiz Uyumu",
      current: 18,
      total: 42,
      color: "bg-amber-500"
    },
    {
      label: "Su Tüketimi Takibi",
      current: 32,
      total: 42,
      color: "bg-blue-500"
    }
  ];

  const progressSummary = React.useMemo(() => {
    // Eğer loading durumunda veya veri yoksa örnek verileri kullan
    if (statsLoading || !stats) {
      return {
        items: progressItems,
        loading: true
      };
    }

    // API'den gelen verilerle progress öğelerini oluştur
    // Her durumda tutarlı değerler sağla ve total 0 olmamasını garantile
    const activeClients = Math.max(stats.activeClients || 1, 1); // En az 1 aktif kullanıcı olmasını sağla
    
    return {
      items: [
        {
          label: "Hedef Ağırlığa Ulaşanlar",
          current: Math.min(stats.weightGoalAchieved || 0, activeClients), // Current değeri total'dan büyük olamaz
          total: activeClients,
          color: "bg-green-500"
        },
        {
          label: "Diyet Uyumu",
          current: Math.min(stats.dietCompliance || 0, activeClients),
          total: activeClients,
          color: "bg-primary"
        },
        {
          label: "Egzersiz Uyumu",
          current: Math.min(stats.exerciseCompliance || 0, activeClients),
          total: activeClients,
          color: "bg-amber-500"
        },
        {
          label: "Su Tüketimi Takibi",
          current: Math.min(stats.waterIntakeTracking || 0, activeClients),
          total: activeClients,
          color: "bg-blue-500"
        }
      ],
      loading: false
    };
  }, [stats, statsLoading, progressItems]);

  // Navigation handlers
  const handleClientsClick = () => {
    window.location.href = '/clients';
  };

  const handleAppointmentsClick = () => {
    window.location.href = '/appointments';
  };

  const handleDietPlansClick = () => {
    window.location.href = '/diet-plans';
  };

  const handleTelegramClick = () => {
    window.location.href = '/telegram-bot';
  };

  const handleStatsClick = () => {
    window.location.href = '/statistics';
  };

  // Activity ve Blog için navigasyon
  const handleActivityClick = () => {
    window.location.href = '/activities';
  };

  const handleBlogClick = () => {
    window.location.href = '/blog';
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8 bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Gösterge Paneli</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Günlük aktivitelerinize genel bir bakış.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={handleClientsClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
          >
            <i className="fas fa-plus mr-2"></i>
            Yeni Danışan
          </button>
        </div>
      </div>

      {/* Stats Cards - Improved grid with better spacing */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Aktif Danışanlar"
          value={statsLoading ? "..." : stats?.activeClients || 0}
          icon="fas fa-users"
          iconBg="bg-gradient-to-br from-primary/10 to-primary/30 dark:from-primary/20 dark:to-primary/40"
          iconColor="text-primary-600 dark:text-primary-400"
          link="/clients"
          linkText="Tümünü Görüntüle"
          onClick={handleClientsClick}
        />
        
        <StatCard
          title="Bugünkü Randevular"
          value={statsLoading ? "..." : stats?.todayAppointments || 0}
          icon="fas fa-calendar-check"
          iconBg="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/40"
          iconColor="text-blue-600 dark:text-blue-400"
          link="/appointments"
          linkText="Takvimi Görüntüle"
          onClick={handleAppointmentsClick}
        />
        
        <StatCard
          title="Aktif Diyet Planları"
          value={statsLoading ? "..." : stats?.activeDietPlans || 0}
          icon="fas fa-utensils"
          iconBg="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/40"
          iconColor="text-amber-600 dark:text-amber-400"
          link="/diet-plans"
          linkText="Planları Görüntüle"
          onClick={handleDietPlansClick}
        />
        
        <StatCard
          title="Telegram Mesajları"
          value={statsLoading ? "..." : stats?.telegramMessages || 0}
          icon="fas fa-paper-plane"
          iconBg="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/40"
          iconColor="text-purple-600 dark:text-purple-400"
          link="/telegram-bot"
          linkText="Bot Ayarları"
          onClick={handleTelegramClick}
        />
      </div>

      {/* Main content grid with improved layout */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Appointments - wider column */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 lg:col-span-2 transition-all duration-200 hover:shadow-lg">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white font-heading flex items-center">
                  <i className="fas fa-calendar-alt text-primary mr-2"></i>
                  Yaklaşan Randevular
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Bugün ve gelecek 7 gün içindeki randevularınız.
                </p>
              </div>
              <button
                onClick={handleAppointmentsClick}
                className="text-primary hover:text-primary-dark dark:text-primary-light"
              >
                <i className="fas fa-external-link-alt"></i>
              </button>
            </div>
          </div>
          
          <AppointmentList 
            appointments={upcomingAppointmentsWithClients as any} 
            loading={appointmentsLoading || clientsLoading}
            emptyMessage="Yaklaşan randevu bulunmuyor. Yeni bir randevu ekleyebilirsiniz."
          />
          
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <button 
              onClick={handleAppointmentsClick}
              className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200"
            >
              Tüm Randevuları Görüntüle
              <i className="fas fa-arrow-right ml-2 text-xs"></i>
            </button>
          </div>
        </div>

        {/* Danışan İlerleme Özeti */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-lg">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white font-heading flex items-center">
                  <i className="fas fa-chart-line text-primary mr-2"></i>
                  Danışan İlerleme Özeti
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Son 30 gündeki danışan ilerleme durumları.
                </p>
              </div>
              <button
                onClick={handleStatsClick}
                className="text-primary hover:text-primary-dark dark:text-primary-light"
              >
                <i className="fas fa-external-link-alt"></i>
              </button>
            </div>
          </div>
          
          <ProgressSummary 
            items={progressSummary.items}
            loading={progressSummary.loading}
          />
          
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <button 
              onClick={handleStatsClick}
              className="text-sm font-medium text-primary dark:text-primary-light hover:text-primary-dark flex items-center"
            >
              Detaylı İstatistikleri Görüntüle 
              <i className="fas fa-arrow-right ml-2 text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Latest Activities - full width with improved design */}
      <div className="mt-8 bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-lg">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white font-heading flex items-center">
                <i className="fas fa-history text-primary mr-2"></i>
                Son Aktiviteler
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Sistemdeki son işlemler ve değişiklikler.
              </p>
            </div>
            <button
              onClick={handleActivityClick}
              className="text-primary hover:text-primary-dark dark:text-primary-light"
            >
              <i className="fas fa-external-link-alt"></i>
            </button>
          </div>
        </div>
        
        <ActivityFeed 
          activities={formattedActivities}
          loading={activitiesLoading}
        />
        
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <Button 
            onClick={handleActivityClick}
            variant="ghost" 
            className="text-sm font-medium text-primary dark:text-primary-light hover:text-primary-dark w-full flex justify-center items-center transition-all duration-200"
          >
            Tüm Aktiviteleri Görüntüle <i className="fas fa-arrow-right ml-2"></i>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
