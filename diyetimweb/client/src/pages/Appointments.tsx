import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/formatDate";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Appointment as ServerAppointment, Client as ServerClient } from "@shared/schema";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

// Frontend ve backend modelleri arasındaki uyumluluk için interface tanımlamaları
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
  date: Date | string; // String formatını da kabul ediyoruz
  duration: number;
  status: string;
  notes?: string;
  createdAt: Date | string; // String formatını da kabul ediyoruz
  updatedAt: Date | string; // String formatını da kabul ediyoruz
  type?: string;
}

// Format date safely for display
const formatDateSafe = (dateInput: Date | string | undefined): string => {
  if (!dateInput) return '-';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('tr-TR');
  } catch (e) {
    console.error('Tarih formatlama hatası:', e);
    return typeof dateInput === 'string' ? dateInput : '-';
  }
};

// Function to safely convert dates to ISO string format for form inputs
const dateToInputFormat = (dateInput: Date | string | undefined): string => {
  if (!dateInput) return '';
  
  try {
    if (dateInput instanceof Date) {
      return dateInput.toISOString().split('T')[0];
    } else if (typeof dateInput === 'string') {
      // Try to convert to date and back
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      // If can't convert, just extract YYYY-MM-DD part if it looks like ISO format
      if (/^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
        return dateInput.substring(0, 10);
      }
    }
    return '';
  } catch (e) {
    console.error('Tarih dönüştürme hatası:', e);
    return '';
  }
};

// Backend ile frontend arasında dönüşüm yapacak yardımcı fonksiyonlar
function serverToClientAppointment(serverAppointment: ServerAppointment): Appointment {
  // Tip alanını düzgün bir şekilde işleyelim
  let type: string | undefined = serverAppointment.type;
  
  // Geçerli değer kontrolü yap
  if (type !== "online" && type !== "in-person") {
    console.warn(`Geçersiz randevu tipi: ${type}, varsayılan olarak "in-person" kullanılıyor`);
    type = "in-person"; // Varsayılan değer
  }
  
  return {
    _id: serverAppointment._id,
    clientId: serverAppointment.clientId || "",
    userId: serverAppointment.userId || "",
    date: serverAppointment.date,
    duration: serverAppointment.duration || 0,
    status: serverAppointment.status || "scheduled",
    notes: serverAppointment.notes,
    createdAt: serverAppointment.createdAt,
    updatedAt: serverAppointment.updatedAt,
    type: type
  };
}

function serverToClientClient(serverClient: ServerClient): Client {
  return {
    _id: serverClient._id || "", // Undefined kontrolü
    userId: serverClient.userId || "", // userId için fallback
    name: serverClient.name || "", // name alanı için fallback
    email: serverClient.email || "", // email için fallback
    phone: serverClient.phone,
    birthDate: serverClient.birthDate,
    gender: serverClient.gender,
    createdAt: serverClient.createdAt ? 
      (typeof serverClient.createdAt === 'string' ? 
        serverClient.createdAt : 
        new Date(serverClient.createdAt).toISOString()
      ) : undefined,
    notes: serverClient.notes,
    profilePicture: serverClient.profilePicture,
    status: serverClient.status
  };
}

// Appointment form schema - MongoDB şemasına uygun
const appointmentFormSchema = z.object({
  clientId: z.string({
    required_error: "Danışan seçimi zorunludur",
  }),
  date: z.string({
    required_error: "Tarih zorunludur",
  }),
  time: z.string({
    required_error: "Saat zorunludur",
  }),
  duration: z.coerce.number().min(15, "Süre en az 15 dakika olmalıdır"),
  type: z.enum(["online", "in-person"], {
    required_error: "Görüşme tipi zorunludur",
  }),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export default function Appointments() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentIdToDelete, setAppointmentIdToDelete] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"upcoming" | "past">("upcoming");
  
  // Fetch appointments with conversion
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/appointments', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) throw new Error(`Randevu verisi alınamadı: ${response.status} ${response.statusText}`);
        const serverAppointments = await response.json() as ServerAppointment[];
        return serverAppointments.map(serverToClientAppointment);
      } catch (error: any) {
        console.error("Randevu verisi alınırken hata:", error.message || error);
        throw error;
      }
    }
  });
  
  // Fetch clients for the select dropdown with conversion
  const { data: clients, isLoading: isClientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/clients', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) throw new Error(`Danışan listesi alınamadı: ${response.status} ${response.statusText}`);
        const serverClients = await response.json() as ServerClient[];
        return serverClients.map(serverToClientClient);
      } catch (error: any) {
        console.error("Danışan listesi alınırken hata:", error.message || error);
        throw error;
      }
    }
  });
  
  // Add appointment mutation
  const addAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        console.log('Gönderilecek randevu verisi:', JSON.stringify(data, null, 2));
        const response = await apiRequest("POST", "/api/appointments", data);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API yanıt hatası:", response.status, errorText);
          throw new Error(`Randevu oluşturulurken hata: (${response.status}) ${errorText || response.statusText}`);
        }
        
        return response.json();
      } catch (error: any) {
        console.error("API isteği hatası:", error.message || error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setShowAddDialog(false);
      toast({
        title: "Başarılı",
        description: "Randevu başarıyla oluşturuldu",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: `Randevu oluşturulurken bir hata oluştu: ${error.message}`,
      });
    }
  });
  
  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        const { id, ...formValues } = data;
        
        // Type değerini açıkça belirtiyoruz
        const sanitizedValues = {
          ...formValues,
          type: formValues.type // tip değerini garantiye alalım
        };
        
        console.log('Güncellenecek randevu verisi:', JSON.stringify(sanitizedValues, null, 2));
        console.log('Randevu tipi:', sanitizedValues.type);
        
        const response = await apiRequest("PUT", `/api/appointments/${id}`, sanitizedValues);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API yanıt hatası:", response.status, errorText);
          throw new Error(`Randevu güncellenirken hata: (${response.status}) ${errorText || response.statusText}`);
        }
        
        const result = await response.json();
        console.log('API yanıtı:', JSON.stringify(result, null, 2));
        return result;
      } catch (error: any) {
        console.error("API isteği hatası:", error.message || error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setShowEditDialog(false);
      setSelectedAppointment(null);
      toast({
        title: "Başarılı",
        description: "Randevu başarıyla güncellendi",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: `Randevu güncellenirken bir hata oluştu: ${error.message}`,
      });
    }
  });
  
  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const response = await apiRequest("DELETE", `/api/appointments/${id}`);
        
        if (!response.ok && response.status !== 204) {
          const errorText = await response.text();
          console.error("API yanıt hatası:", response.status, errorText);
          throw new Error(`Randevu silinirken hata: (${response.status}) ${errorText || response.statusText}`);
        }
        
        return response.status === 204 ? true : response.json();
      } catch (error: any) {
        console.error("API isteği hatası:", error.message || error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setShowDeleteDialog(false);
      setAppointmentIdToDelete(null);
      toast({
        title: "Başarılı",
        description: "Randevu başarıyla silindi",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: `Randevu silinirken bir hata oluştu: ${error.message}`,
      });
    }
  });
  
  // Filter appointments based on current view
  const filteredAppointments = React.useMemo(() => {
    if (!appointments) return [];
    
    const now = new Date();
    
    if (currentView === "upcoming") {
      return appointments
        .filter(appointment => {
          try {
            const appointmentDate = appointment.date instanceof Date ? 
              appointment.date : new Date(appointment.date);
            return appointmentDate >= now;
          } catch (e) {
            console.error("Tarih dönüştürme hatası:", e);
            return false;
          }
        })
        .sort((a, b) => {
          try {
            const dateA = a.date instanceof Date ? a.date : new Date(a.date);
            const dateB = b.date instanceof Date ? b.date : new Date(b.date);
            return dateA.getTime() - dateB.getTime();
          } catch (e) {
            console.error("Sıralama hatası:", e);
            return 0;
          }
        });
    } else {
      return appointments
        .filter(appointment => {
          try {
            const appointmentDate = appointment.date instanceof Date ? 
              appointment.date : new Date(appointment.date);
            return appointmentDate < now;
          } catch (e) {
            console.error("Tarih dönüştürme hatası:", e);
            return false;
          }
        })
        .sort((a, b) => {
          try {
            const dateA = a.date instanceof Date ? a.date : new Date(a.date);
            const dateB = b.date instanceof Date ? b.date : new Date(b.date);
            return dateB.getTime() - dateA.getTime();
          } catch (e) {
            console.error("Sıralama hatası:", e);
            return 0;
          }
        });
    }
  }, [appointments, currentView]);
  
  // Group appointments by date
  const groupedAppointments = React.useMemo(() => {
    const groups: { [key: string]: Appointment[] } = {};
    
    filteredAppointments.forEach(appointment => {
      try {
        const appointmentDate = appointment.date instanceof Date ? 
          appointment.date : new Date(appointment.date);
        const dateKey = appointmentDate.toLocaleDateString('tr-TR');
        
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(appointment);
      } catch (e) {
        console.error("Tarih gruplandırma hatası:", e);
      }
    });
    
    return groups;
  }, [filteredAppointments]);
  
  // Appointment form
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      duration: 60,
      type: "in-person",
      notes: "",
    },
  });
  
  // Form submission
  function onSubmit(values: AppointmentFormValues) {
    try {
      // Combine date and time for the API
      const dateTimeStr = `${values.date}T${values.time}:00`;
      let dateTime: Date;
      
      try {
        dateTime = new Date(dateTimeStr);
        if (isNaN(dateTime.getTime())) throw new Error("Geçersiz tarih formatı");
      } catch (e) {
        console.error("Tarih dönüştürme hatası:", e);
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Tarih ve saat formatı geçersiz. Lütfen kontrol edip tekrar deneyin.",
        });
        return;
      }

      // Randevu tipini kontrol edelim
      console.log('Form submit - seçilen tip:', values.type);
      
      const appointmentData = {
        clientId: values.clientId,
        date: dateTime.toISOString(),
        duration: values.duration,
        type: values.type, // Enum değeri: "online" veya "in-person"
        notes: values.notes || "",
        status: "scheduled"
      };
      
      console.log('Gönderilecek randevu verisi:', JSON.stringify(appointmentData, null, 2));
      
      if (selectedAppointment) {
        // Update existing appointment
        updateAppointmentMutation.mutate({
          id: selectedAppointment._id,
          ...appointmentData
        });
      } else {
        // Create new appointment
        addAppointmentMutation.mutate(appointmentData);
      }
    } catch (error: any) {
      console.error("Form gönderim hatası:", error.message || error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: `Form gönderilirken hata oluştu: ${error.message || "Bilinmeyen hata"}`,
      });
    }
  }
  
  // Get client by ID - MongoID
  const getClientById = (clientId: string) => {
    if (!clients || !clientId) {
      console.warn(`Clients verisi yok veya clientId boş: ${clientId}`);
      return null;
    }
    
    const client = clients.find(client => client._id === clientId);
    if (!client) {
      console.warn(`ID'si ${clientId} olan danışan bulunamadı`);
      return null;
    }
    return client;
  };
  
  // Handle edit appointment
  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    
    try {
      // Convert appointment date to form fields (date and time separately)
      const appointmentDate = appointment.date instanceof Date ? 
        appointment.date : new Date(appointment.date);
      
      // Format date as YYYY-MM-DD for the date input
      const dateString = dateToInputFormat(appointmentDate);
      
      // Format time as HH:MM for the time input
      const timeString = appointmentDate.toTimeString().substring(0, 5);
      
      // Randevu tipini kontrol et ve doğru formata dönüştür
      let type: "online" | "in-person" = "in-person";
      if (appointment.type === "online") {
        type = "online";
      }
      
      console.log('Düzenlenecek randevu tipi:', appointment.type, '-> form tipi:', type);
      
      form.reset({
        clientId: appointment.clientId,
        date: dateString,
        time: timeString,
        duration: appointment.duration || 60,
        type: type, // Kontrol edilmiş tipi kullan
        notes: appointment.notes || "",
      });
      
      setShowEditDialog(true);
    } catch (error) {
      console.error("Randevu bilgilerini form alanlarına doldururken hata:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Randevu bilgileri yüklenirken bir hata oluştu."
      });
    }
  };
  
  // Handle delete appointment 
  const handleDeleteAppointment = (appointmentId: string) => {
    setAppointmentIdToDelete(appointmentId);
    setShowDeleteDialog(true);
  };
  
  // Confirm delete appointment
  const confirmDeleteAppointment = () => {
    if (appointmentIdToDelete) {
      deleteAppointmentMutation.mutate(appointmentIdToDelete);
    }
  };
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Randevular</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tüm danışan randevularınızı yönetin.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
          <div className="flex rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                currentView === "upcoming"
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
              onClick={() => setCurrentView("upcoming")}
            >
              <i className="fas fa-calendar-day mr-2"></i> Yaklaşan
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                currentView === "past"
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
              onClick={() => setCurrentView("past")}
            >
              <i className="fas fa-history mr-2"></i> Geçmiş
            </button>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <i className="fas fa-plus mr-2"></i>
                Yeni Randevu
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Yeni Randevu Oluştur</DialogTitle>
                <DialogDescription>
                  Danışan için yeni bir randevu oluşturun.
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[60vh] pr-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Danışan*</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="">Danışan Seçin</option>
                              {clients?.map(client => (
                                <option key={client._id} value={client._id}>{client.name}</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tarih*</FormLabel>
                            <FormControl>
                              <input
                                type="date"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Saat*</FormLabel>
                            <FormControl>
                              <input
                                type="time"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Süre (dakika)*</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                              >
                                <option value="15">15 dakika</option>
                                <option value="30">30 dakika</option>
                                <option value="45">45 dakika</option>
                                <option value="60">60 dakika</option>
                                <option value="90">90 dakika</option>
                                <option value="120">120 dakika</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Randevu Tipi*</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                              >
                                <option value="in-person">Yüz yüze</option>
                                <option value="online">Online</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notlar</FormLabel>
                          <FormControl>
                            <textarea
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Randevu ile ilgili notlar..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={addAppointmentMutation.isPending}>
                        {addAppointmentMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i> Kaydediliyor...
                          </>
                        ) : (
                          "Randevu Oluştur"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <i className="fas fa-spinner fa-spin text-primary text-2xl mr-2"></i>
          <span>Randevular yükleniyor...</span>
        </div>
      ) : (
        <>
          {Object.keys(groupedAppointments).length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
              <i className="fas fa-calendar-times text-gray-300 dark:text-gray-600 text-5xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {currentView === "upcoming" 
                  ? "Yaklaşan randevunuz bulunmuyor" 
                  : "Geçmiş randevunuz bulunmuyor"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {currentView === "upcoming"
                  ? "Yeni bir randevu oluşturmak için 'Yeni Randevu' butonuna tıklayın."
                  : "Randevularınız tamamlandıkça burada görünecektir."}
              </p>
              
              {currentView === "upcoming" && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <i className="fas fa-plus mr-2"></i>
                  Yeni Randevu Oluştur
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedAppointments).map(([date, dayAppointments]) => (
                <div key={date}>
                  <div className="flex items-center mb-4">
                    <div className="relative bg-primary/5 p-2 rounded-lg mr-3">
                      <i className="fas fa-calendar-day text-primary-900 dark:text-primary font-bold text-xl"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {date}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dayAppointments.map((appointment) => {
                      const client = getClientById(appointment.clientId);
                      
                      let timeString = '--:--';
                      let endTimeString = '--:--';
                      
                      try {
                        const appointmentDate = appointment.date instanceof Date ? 
                          appointment.date : new Date(appointment.date);
                          
                        timeString = appointmentDate.toLocaleTimeString('tr-TR', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        });
                        
                        const endTime = new Date(appointmentDate.getTime() + (appointment.duration || 0) * 60000);
                        endTimeString = endTime.toLocaleTimeString('tr-TR', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        });
                      } catch (e) {
                        console.error("Randevu saati hesaplama hatası:", e);
                      }
                      
                      return (
                        <Card key={appointment._id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center">
                                <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-3">
                                  {client?.profilePicture ? (
                                    <img 
                                      src={client.profilePicture} 
                                      alt={`${client.name} profil resmi`} 
                                      className="h-12 w-12 rounded-full object-cover"
                                      onError={(e) => {
                                        // Resim yüklenemezse simge göster
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement?.classList.add('fallback-icon');
                                      }}
                                    />
                                  ) : (
                                    <i className="fas fa-user text-gray-500 dark:text-gray-400"></i>
                                  )}
                                </div>
                                <div>
                                  <CardTitle className="text-base">{client?.name || "Danışan"}</CardTitle>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {timeString} - {endTimeString}
                                  </div>
                                </div>
                              </div>
                              <div className={`px-2 py-1 rounded text-xs font-medium ${
                                appointment.type === 'online' 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              }`}>
                                {appointment.type === 'online' ? 'Online' : 'Yüz yüze'}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {appointment.notes && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                <i className="fas fa-sticky-note text-gray-400 mr-2"></i>
                                {appointment.notes}
                              </p>
                            )}
                            
                            <div className="mt-4 flex gap-2">
                              {appointment.type === 'online' && (
                                <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                                  <i className="fas fa-video mr-2"></i> Görüşmeye Başla
                                </Button>
                              )}
                              
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditAppointment(appointment)}
                              >
                                <i className="fas fa-edit mr-2"></i> Düzenle
                              </Button>
                              
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteAppointment(appointment._id)}
                              >
                                <i className="fas fa-trash-alt mr-2"></i> Sil
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Düzenleme Dialog'u */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Randevu Düzenle</DialogTitle>
            <DialogDescription>
              Randevu bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Danışan*</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="">Danışan Seçin</option>
                          {clients?.map(client => (
                            <option key={client._id} value={client._id}>{client.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tarih*</FormLabel>
                        <FormControl>
                          <input
                            type="date"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Saat*</FormLabel>
                        <FormControl>
                          <input
                            type="time"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Süre (dakika)*</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          >
                            <option value="15">15 dakika</option>
                            <option value="30">30 dakika</option>
                            <option value="45">45 dakika</option>
                            <option value="60">60 dakika</option>
                            <option value="90">90 dakika</option>
                            <option value="120">120 dakika</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Randevu Tipi*</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          >
                            <option value="in-person">Yüz yüze</option>
                            <option value="online">Online</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notlar</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Randevu ile ilgili notlar..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => setShowEditDialog(false)}
                  >
                    İptal
                  </Button>
                  <Button type="submit" disabled={updateAppointmentMutation.isPending}>
                    {updateAppointmentMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i> Güncelleniyor...
                      </>
                    ) : (
                      "Randevu Güncelle"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Silme Onay Dialog'u */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Randevu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu randevuyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteAppointment}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {deleteAppointmentMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i> Siliniyor...
                </>
              ) : (
                "Evet, Sil"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
