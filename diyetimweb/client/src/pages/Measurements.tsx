import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { calculateBMI, getBMIClassification, estimateBodyFatPercentage } from "@/utils/calculations";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// MongoDB yapısına uygun tiplerle güncellendi
interface Client {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  height?: number;
  createdAt: string;
  notes?: string;
  profilePicture?: string;
  status: string;
}

interface Measurement {
  _id: string;
  clientId: string;
  date: string;
  weight?: number;
  height?: number;
  neck?: number;
  arm?: number;
  chest?: number;
  waist?: number;
  abdomen?: number;
  hip?: number;
  thigh?: number;
  calf?: number;
  notes?: string;
  images?: string[];
  bodyFatPercentage?: number;
  [key: string]: string | number | undefined | string[];
}

// Güvenli tarih formatı fonksiyonu
const formatDateSafe = (dateInput: string | Date | undefined): string => {
  if (!dateInput) return '-';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('tr-TR');
  } catch (e) {
    console.error("Tarih formatı hatası:", e);
    return String(dateInput);
  }
};

// Ölçüm form schema - MongoDB şemasına uygun
const measurementFormSchema = z.object({
  clientId: z.string({
    required_error: "Danışan seçimi zorunludur",
  }),
  weight: z.coerce.number().min(20, "Ağırlık en az 20kg olmalıdır").max(300, "Ağırlık en fazla 300kg olabilir"),
  neck: z.coerce.number().optional(),
  chest: z.coerce.number().optional(),
  waist: z.coerce.number().optional(),
  abdomen: z.coerce.number().optional(),
  hip: z.coerce.number().optional(),
  arm: z.coerce.number().optional(),
  thigh: z.coerce.number().optional(),
  calf: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type MeasurementFormValues = z.infer<typeof measurementFormSchema>;

// Grafik için ölçüm türleri ve renkleri
interface MeasurementType {
  key: 'weight' | 'neck' | 'chest' | 'waist' | 'abdomen' | 'hip' | 'arm' | 'thigh' | 'calf';
  name: string;
  color: string;
}

interface ChartDataPoint {
  date: string;
  weight?: number;
  neck?: number;
  chest?: number;
  waist?: number;
  abdomen?: number;
  hip?: number;
  arm?: number;
  thigh?: number;
  calf?: number;
  [key: string]: string | number | undefined;
}

const measurementTypes: MeasurementType[] = [
  { key: 'weight', name: 'Ağırlık (kg)', color: '#10b981' },
  { key: 'neck', name: 'Boyun (cm)', color: '#8b5cf6' },
  { key: 'chest', name: 'Göğüs (cm)', color: '#f43f5e' },
  { key: 'waist', name: 'Bel (cm)', color: '#3b82f6' },
  { key: 'abdomen', name: 'Karın (cm)', color: '#64748b' },
  { key: 'hip', name: 'Kalça (cm)', color: '#ec4899' },
  { key: 'arm', name: 'Kol (cm)', color: '#f59e0b' },
  { key: 'thigh', name: 'Bacak (cm)', color: '#7c3aed' },
  { key: 'calf', name: 'Baldır (cm)', color: '#06b6d4' }
];

export default function Measurements() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Ölçüm yapıldığında ilerleme göstergeleri
  const [submittingMeasurement, setSubmittingMeasurement] = useState(false);
  
  const [measurementIdToDelete, setMeasurementIdToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Fetch clients
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Danışan listesi alınamadı');
      return response.json() as Promise<Client[]>;
    }
  });
  
  // Fetch measurements for selected client
  const { data: measurements, isLoading: measurementsLoading } = useQuery({
    queryKey: ['/api/clients', selectedClientId, 'measurements'],
    queryFn: async () => {
      if (!selectedClientId) return null;
      
      const response = await fetch(`/api/clients/${selectedClientId}/measurements`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Ölçüm verisi alınamadı');
      return response.json() as Promise<Measurement[]>;
    },
    enabled: !!selectedClientId
  });
  
  // Add measurement mutation
  const addMeasurementMutation = useMutation({
    mutationFn: async (data: MeasurementFormValues) => {
      const response = await apiRequest("POST", `/api/clients/${data.clientId}/measurements`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', selectedClientId, 'measurements'] });
      setShowAddDialog(false);
      toast({
        title: "Başarılı",
        description: "Ölçüm başarıyla kaydedildi",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: `Ölçüm kaydedilirken bir hata oluştu: ${error.message}`,
      });
    }
  });
  
  // Delete measurement mutation
  const deleteMeasurementMutation = useMutation({
    mutationFn: async (measurementId: string) => {
      if (!selectedClientId) throw new Error("Danışan seçilmedi");
      
      try {
        // Silme işlemi için doğrudan Post request kullanarak
        const response = await fetch(`/api/measurements/delete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          // Backend'in beklediği şekilde veri gönder
          body: JSON.stringify({ 
            clientId: selectedClientId,
            measurementId: measurementId
          })
        });
        
        // Yanıtı kontrol et
        const text = await response.text();
        
        if (!response.ok) {
          toast({
            variant: "destructive",
            title: "Hata",
            description: "Ölçüm silinirken bir hata oluştu"
          });
          throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
        }
        
        return true;
      } catch (error) {
        console.error("Ölçüm silme hatası:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', selectedClientId, 'measurements'] });
      setShowDeleteDialog(false);
      setMeasurementIdToDelete(null);
      toast({
        title: "Başarılı",
        description: "Ölçüm başarıyla silindi",
      });
    },
    onError: (error: Error) => {
      console.error("Silme hatası:", error);
      setShowDeleteDialog(false);
      toast({
        variant: "destructive",
        title: "Hata",
        description: `Ölçüm silinirken bir hata oluştu: ${error.message}`,
      });
    }
  });
  
  // Measurement form
  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues: {
      clientId: selectedClientId || undefined,
    },
  });
  
  // Update form default values when selected client changes
  React.useEffect(() => {
    if (selectedClientId) {
      form.setValue("clientId", selectedClientId);
    }
  }, [selectedClientId, form]);
  
  // Form submission
  function onSubmit(values: MeasurementFormValues) {
    setSubmittingMeasurement(true);
    
    // Temizlenen değerler için kontrol (boş değerleri yönet)
    const cleanedValues = { ...values };
    
    // Calculate body fat percentage if possible
    const selectedClient = clients?.find(c => c._id === cleanedValues.clientId);
    
    if (selectedClient && selectedClient.height && selectedClient.gender && cleanedValues.weight) {
      const height = Number(selectedClient.height);
      const weight = cleanedValues.weight;
      const bmi = calculateBMI(weight, height);
      
      // Estimate age from birth date or use a default
      let age = 30;
      if (selectedClient.birthDate) {
        const birthDate = new Date(selectedClient.birthDate);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
      }
      
      const bodyFatPercentage = estimateBodyFatPercentage(bmi, age, selectedClient.gender as any);
      
      // Add body fat percentage to submission
      const dataWithBodyFat = {
        ...cleanedValues,
        bodyFatPercentage: Math.round(bodyFatPercentage * 10) / 10
      };
      
      addMeasurementMutation.mutate(dataWithBodyFat, {
        onSettled: () => {
          setSubmittingMeasurement(false);
        }
      });
    } else {
      addMeasurementMutation.mutate(cleanedValues, {
        onSettled: () => {
          setSubmittingMeasurement(false);
        }
      });
    }
  }
  
  // Get selected client
  const selectedClient = selectedClientId ? clients?.find(c => c._id === selectedClientId) : null;
  
  // Calculate latest measurements and changes
  const latestMeasurements = React.useMemo(() => {
    if (!measurements || measurements.length === 0) return null;
    
    const latest = measurements[0];
    
    // If we have previous measurements, calculate changes
    let changes: Record<string, number | null> = {
      weight: null,
      chest: null,
      waist: null,
      hip: null,
      arm: null,
      thigh: null
    };

    if (measurements.length > 1) {
      const previous = measurements[1];
      
      changes = {
        weight: latest.weight && previous.weight ? Number(latest.weight) - Number(previous.weight) : null,
        chest: latest.chest && previous.chest ? Number(latest.chest) - Number(previous.chest) : null,
        waist: latest.waist && previous.waist ? Number(latest.waist) - Number(previous.waist) : null,
        hip: latest.hip && previous.hip ? Number(latest.hip) - Number(previous.hip) : null,
        arm: latest.arm && previous.arm ? Number(latest.arm) - Number(previous.arm) : null,
        thigh: latest.thigh && previous.thigh ? Number(latest.thigh) - Number(previous.thigh) : null,
      };
    }
    
    // Calculate BMI if weight and height are available
    let bmi = null;
    let bmiClassification = null;
    
    if (latest.weight && selectedClient?.height) {
      const weight = Number(latest.weight);
      const height = Number(selectedClient.height) / 100; // cm to meters
      bmi = calculateBMI(weight, height);
      bmiClassification = getBMIClassification(bmi);
    }
    
    return { latest, changes, bmi, bmiClassification };
  }, [measurements, selectedClient]);
  
  // Prepare chart data for measurements
  const combinedChartData = React.useMemo((): ChartDataPoint[] => {
    if (!measurements || measurements.length === 0) return [];
    
    // En son ölçümden en eskiye doğru sırala
    const reversed = [...measurements].reverse();
    
    // Tüm ölçüm tarihlerini içeren bir dizi oluştur
    return reversed.map(m => {
      // Güvenli bir şekilde tarih formatla
      let formattedDate = '-';
      try {
        formattedDate = formatDateSafe(m.date);
      } catch (e) {
        console.error("Grafik tarih formatlama hatası:", e);
      }
      
      // Her bir ölçüm değerini güvenli bir şekilde sayıya dönüştür
      const safeNumber = (value: any): number | undefined => {
        if (value === undefined || value === null) return undefined;
        const num = Number(value);
        return isNaN(num) ? undefined : num;
      };
      
      return {
        date: formattedDate,
        weight: safeNumber(m.weight),
        neck: safeNumber(m.neck),
        chest: safeNumber(m.chest),
        waist: safeNumber(m.waist),
        abdomen: safeNumber(m.abdomen),
        hip: safeNumber(m.hip),
        arm: safeNumber(m.arm),
        thigh: safeNumber(m.thigh),
        calf: safeNumber(m.calf),
      };
    });
  }, [measurements, formatDateSafe]);
  
  // Handle delete measurement
  const handleDeleteMeasurement = (measurementId: string) => {
    setMeasurementIdToDelete(measurementId);
    setShowDeleteDialog(true);
  };
  
  // Confirm delete measurement
  const confirmDeleteMeasurement = () => {
    if (measurementIdToDelete) {
      deleteMeasurementMutation.mutate(measurementIdToDelete);
    }
  };
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Ölçümler</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Danışanlarınızın vücut ölçümlerini takip edin.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
          {selectedClientId && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <i className="fas fa-plus mr-2"></i>
                  Yeni Ölçüm
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Yeni Ölçüm Ekle</DialogTitle>
                  <DialogDescription>
                    {selectedClient?.name} için yeni bir ölçüm kaydedin.
                  </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="max-h-[60vh] pr-4">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <input type="hidden" {...form.register("clientId")} />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ağırlık (kg)*</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  inputMode="numeric" 
                                  pattern="[0-9]*\.?[0-9]*"
                                  placeholder="Örn: 70.5" 
                                  {...field}
                                  value={field.value === undefined || field.value === null ? '' : field.value.toString()}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                    const numberValue = value === '' ? undefined : parseFloat(value);
                                    field.onChange(numberValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="neck"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Boyun (cm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  inputMode="numeric" 
                                  pattern="[0-9]*\.?[0-9]*"
                                  placeholder="Boyun ölçüsü"
                                  value={field.value === undefined || field.value === null ? '' : field.value.toString()}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                    const numberValue = value === '' ? undefined : parseFloat(value);
                                    field.onChange(numberValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="waist"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bel (cm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  inputMode="numeric" 
                                  pattern="[0-9]*\.?[0-9]*"
                                  placeholder="Bel ölçüsü"
                                  value={field.value === undefined || field.value === null ? '' : field.value.toString()}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                    const numberValue = value === '' ? undefined : parseFloat(value);
                                    field.onChange(numberValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="hip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kalça (cm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  inputMode="numeric" 
                                  pattern="[0-9]*\.?[0-9]*"
                                  placeholder="Kalça ölçüsü"
                                  value={field.value === undefined || field.value === null ? '' : field.value.toString()}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                    const numberValue = value === '' ? undefined : parseFloat(value);
                                    field.onChange(numberValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="arm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kol (cm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  inputMode="numeric" 
                                  pattern="[0-9]*\.?[0-9]*"
                                  placeholder="Kol ölçüsü"
                                  value={field.value === undefined || field.value === null ? '' : field.value.toString()}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                    const numberValue = value === '' ? undefined : parseFloat(value);
                                    field.onChange(numberValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="thigh"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bacak (cm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  inputMode="numeric" 
                                  pattern="[0-9]*\.?[0-9]*"
                                  placeholder="Bacak ölçüsü"
                                  value={field.value === undefined || field.value === null ? '' : field.value.toString()}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                    const numberValue = value === '' ? undefined : parseFloat(value);
                                    field.onChange(numberValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="chest"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Göğüs (cm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  inputMode="numeric" 
                                  pattern="[0-9]*\.?[0-9]*"
                                  placeholder="Göğüs ölçüsü"
                                  value={field.value === undefined || field.value === null ? '' : field.value.toString()}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                    const numberValue = value === '' ? undefined : parseFloat(value);
                                    field.onChange(numberValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="abdomen"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Karın (cm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  inputMode="numeric" 
                                  pattern="[0-9]*\.?[0-9]*"
                                  placeholder="Karın ölçüsü"
                                  value={field.value === undefined || field.value === null ? '' : field.value.toString()}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                    const numberValue = value === '' ? undefined : parseFloat(value);
                                    field.onChange(numberValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="calf"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Baldır (cm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  inputMode="numeric" 
                                  pattern="[0-9]*\.?[0-9]*"
                                  placeholder="Baldır ölçüsü"
                                  value={field.value === undefined || field.value === null ? '' : field.value.toString()}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                    const numberValue = value === '' ? undefined : parseFloat(value);
                                    field.onChange(numberValue);
                                  }}
                                />
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
                                placeholder="Ölçümler ile ilgili notlar..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={addMeasurementMutation.isPending || submittingMeasurement}
                          className="relative"
                        >
                          {addMeasurementMutation.isPending || submittingMeasurement ? (
                            <>
                              <span className="opacity-0">Ölçüm Kaydet</span>
                              <span className="absolute inset-0 flex items-center justify-center">
                                <i className="fas fa-spinner fa-spin mr-2"></i> Kaydediliyor...
                              </span>
                            </>
                          ) : (
                            "Ölçüm Kaydet"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Client selection sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Danışan Seçimi</CardTitle>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="flex justify-center py-4">
                  <i className="fas fa-spinner fa-spin text-primary text-xl"></i>
                </div>
              ) : (
                <>
                  {clients && clients.length > 0 ? (
                    <div className="space-y-2">
                      {clients.map(client => (
                        <button
                          key={client._id}
                          className={`w-full text-left py-2 px-3 rounded-md flex items-center ${
                            selectedClientId === client._id
                              ? "bg-primary text-white"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                          onClick={() => setSelectedClientId(client._id)}
                        >
                          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 mr-3 flex items-center justify-center overflow-hidden">
                            {client.profilePicture ? (
                              <img 
                                src={client.profilePicture} 
                                alt={client.name}
                                className="h-full w-full object-cover" 
                              />
                            ) : (
                              <i className={`fas fa-${client.gender === 'female' ? 'female' : 'male'}`}></i>
                            )}
                          </div>
                          <span>{client.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <p>Henüz danışan eklenmemiş.</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Measurements display area */}
        <div className="md:col-span-2 lg:col-span-3">
          {selectedClientId ? (
            <>
              {measurementsLoading ? (
                <div className="flex justify-center py-12">
                  <i className="fas fa-spinner fa-spin text-primary text-2xl mr-2"></i>
                  <span>Ölçümler yükleniyor...</span>
                </div>
              ) : (
                <>
                  {!measurements || measurements.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
                      <i className="fas fa-weight text-gray-300 dark:text-gray-600 text-5xl mb-4"></i>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Henüz ölçüm kaydedilmemiş
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {selectedClient?.name} için ilk ölçümü kaydetmek için 'Yeni Ölçüm' butonuna tıklayın.
                      </p>
                      
                      <Button onClick={() => setShowAddDialog(true)}>
                        <i className="fas fa-plus mr-2"></i>
                        Yeni Ölçüm Ekle
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Summary cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {/* Weight card */}
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-base font-medium text-gray-700 dark:text-gray-300">
                                Güncel Ağırlık
                              </h3>
                              <div className="bg-white dark:bg-gray-900 shadow-sm border border-primary/20 p-2 rounded-full">
                                <i className="fas fa-weight text-primary font-bold"></i>
                              </div>
                            </div>
                            <div className="flex items-end">
                              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                {latestMeasurements?.latest.weight} kg
                              </span>
                              
                              {latestMeasurements?.changes?.weight !== null && latestMeasurements?.changes?.weight !== undefined && (
                                <span className={`ml-2 text-sm ${
                                  (latestMeasurements.changes.weight || 0) < 0 
                                    ? 'text-green-500' 
                                    : (latestMeasurements.changes.weight || 0) > 0 
                                      ? 'text-red-500' 
                                      : 'text-gray-500'
                                }`}>
                                  {(latestMeasurements.changes.weight || 0) < 0 ? '↓' : (latestMeasurements.changes.weight || 0) > 0 ? '↑' : ''}
                                  {' '}
                                  {Math.abs(latestMeasurements.changes.weight || 0).toFixed(1)} kg
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Son ölçüm: {latestMeasurements?.latest.date ? new Date(latestMeasurements.latest.date).toLocaleDateString('tr-TR') : ''}
                            </p>
                          </CardContent>
                        </Card>
                        
                        {/* BMI card */}
                        {latestMeasurements?.bmi && (
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-base font-medium text-gray-700 dark:text-gray-300">
                                  Vücut Kitle İndeksi
                                </h3>
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                                  <i className="fas fa-calculator text-blue-600 dark:text-blue-400"></i>
                                </div>
                              </div>
                              <div className="flex items-end">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                  {latestMeasurements.bmi.toFixed(1)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {latestMeasurements.bmiClassification}
                              </p>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Body fat card */}
                        {latestMeasurements?.latest.bodyFatPercentage && (
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-base font-medium text-gray-700 dark:text-gray-300">
                                  Vücut Yağ Oranı
                                </h3>
                                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                                  <i className="fas fa-percentage text-amber-600 dark:text-amber-400"></i>
                                </div>
                              </div>
                              <div className="flex items-end">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                  %{latestMeasurements.latest.bodyFatPercentage}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Tahmini değer
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                      
                      {/* Measurement charts */}
                      <div className="mb-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Vücut Ölçümleri Değişimi</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {combinedChartData.length > 1 ? (
                              <div className="h-[450px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart
                                    data={combinedChartData}
                                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis 
                                      dataKey="date" 
                                      axisLine={{ stroke: '#e5e7eb' }}
                                      tick={{ fill: '#6b7280', fontSize: 12 }}
                                    />
                                    <YAxis 
                                      yAxisId="left"
                                      orientation="left"
                                      axisLine={{ stroke: '#e5e7eb' }}
                                      tick={{ fill: '#6b7280', fontSize: 12 }}
                                      label={{ 
                                        value: 'Ağırlık (kg)', 
                                        angle: -90, 
                                        position: 'insideLeft',
                                        offset: -5,
                                        style: { textAnchor: 'middle', fill: '#10b981', fontSize: 12 }
                                      }}
                                    />
                                    <YAxis 
                                      yAxisId="right"
                                      orientation="right"
                                      axisLine={{ stroke: '#e5e7eb' }}
                                      tick={{ fill: '#6b7280', fontSize: 12 }}
                                      label={{ 
                                        value: 'Ölçüm (cm)', 
                                        angle: 90, 
                                        position: 'insideRight',
                                        offset: -5,
                                        style: { textAnchor: 'middle', fill: '#3b82f6', fontSize: 12 }
                                      }}
                                    />
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '4px',
                                        fontSize: '12px'
                                      }}
                                    />
                                    <Legend 
                                      verticalAlign="top" 
                                      height={36}
                                      iconType="circle"
                                      iconSize={8}
                                      wrapperStyle={{ fontSize: '12px' }}
                                    />
                                    
                                    {/* Ağırlık değişimi (sol eksende) */}
                                    <Line 
                                      yAxisId="left"
                                      type="monotone" 
                                      dataKey="weight" 
                                      name="Ağırlık (kg)" 
                                      stroke="#10b981" 
                                      strokeWidth={2}
                                      dot={{ r: 4, strokeWidth: 2 }}
                                      activeDot={{ r: 6 }}
                                      connectNulls
                                    />
                                    
                                    {/* Diğer ölçümler (sağ eksende) */}
                                    <Line 
                                      yAxisId="right"
                                      type="monotone" 
                                      dataKey="neck" 
                                      name="Boyun (cm)" 
                                      stroke="#8b5cf6" 
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      activeDot={{ r: 6 }}
                                      connectNulls
                                    />
                                    <Line 
                                      yAxisId="right"
                                      type="monotone" 
                                      dataKey="chest" 
                                      name="Göğüs (cm)" 
                                      stroke="#f43f5e"
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      activeDot={{ r: 6 }}
                                      connectNulls
                                    />
                                    <Line 
                                      yAxisId="right"
                                      type="monotone" 
                                      dataKey="waist" 
                                      name="Bel (cm)" 
                                      stroke="#3b82f6" 
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      activeDot={{ r: 6 }}
                                      connectNulls
                                    />
                                    <Line 
                                      yAxisId="right"
                                      type="monotone" 
                                      dataKey="abdomen" 
                                      name="Karın (cm)" 
                                      stroke="#64748b" 
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      activeDot={{ r: 6 }}
                                      connectNulls
                                    />
                                    <Line 
                                      yAxisId="right"
                                      type="monotone" 
                                      dataKey="hip" 
                                      name="Kalça (cm)" 
                                      stroke="#ec4899"
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      activeDot={{ r: 6 }}
                                      connectNulls
                                    />
                                    <Line 
                                      yAxisId="right"
                                      type="monotone" 
                                      dataKey="arm" 
                                      name="Kol (cm)" 
                                      stroke="#f59e0b" 
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      activeDot={{ r: 6 }}
                                      connectNulls
                                    />
                                    <Line 
                                      yAxisId="right"
                                      type="monotone" 
                                      dataKey="thigh" 
                                      name="Bacak (cm)" 
                                      stroke="#7c3aed" 
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      activeDot={{ r: 6 }}
                                      connectNulls
                                    />
                                    <Line 
                                      yAxisId="right"
                                      type="monotone" 
                                      dataKey="calf" 
                                      name="Baldır (cm)" 
                                      stroke="#06b6d4" 
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      activeDot={{ r: 6 }}
                                      connectNulls
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <i className="fas fa-chart-line text-4xl mb-3 opacity-30"></i>
                                <p>Grafik için en az iki ölçüm gereklidir.</p>
                                <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddDialog(true)}>
                                  <i className="fas fa-plus mr-2"></i>
                                  Yeni Ölçüm Ekle
                                </Button>
                              </div>
                            )}
                            
                            {/* Ölçüm açıklamaları */}
                            {combinedChartData.length > 1 && (
                              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                {measurementTypes.map(type => {
                                  // Her ölçüm türü için veri olup olmadığını kontrol et
                                  const hasData = combinedChartData.some(d => d[type.key] !== undefined);
                                  
                                  if (!hasData) return null;
                                  
                                  // Ölçüm değerlerini güvenli şekilde al
                                  const measurementValue = measurements?.[0]?.[type.key];
                                  
                                  // Değişim değerlerini güvenli şekilde al
                                  const changeValue = latestMeasurements?.changes?.[type.key] as number | null | undefined;
                                  const hasChange = changeValue !== null && changeValue !== undefined;
                                  
                                  return (
                                    <div 
                                      key={type.key}
                                      className="border rounded-md p-2 flex flex-col items-center text-center"
                                      style={{ borderColor: `${type.color}33` }}
                                    >
                                      <div className="text-xs text-gray-500 mb-1">{type.name}</div>
                                      <div 
                                        className="text-xl font-semibold"
                                        style={{ color: type.color }}
                                      >
                                        {measurementValue} {type.key === 'weight' ? 'kg' : 'cm'}
                                      </div>
                                      {hasChange && (
                                        <span className={`mt-1 text-xs ${
                                          (changeValue || 0) < 0 
                                            ? 'text-green-500' 
                                            : (changeValue || 0) > 0 
                                              ? 'text-red-500' 
                                              : 'text-gray-500'
                                        }`}>
                                          {(changeValue || 0) < 0 ? '↓' : (changeValue || 0) > 0 ? '↑' : ''}
                                          {' '}
                                          {Math.abs(changeValue || 0).toFixed(1)} {type.key === 'weight' ? 'kg' : 'cm'}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                      
                      {/* Detailed measurements table */}
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">Tüm Ölçümler</CardTitle>
                            <Button size="sm" onClick={() => setShowAddDialog(true)}>
                              <i className="fas fa-plus mr-2"></i> Yeni Ölçüm
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead>
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarih</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ağırlık</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Boyun</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Göğüs</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bel</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Karın</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kalça</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kol</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bacak</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Baldır</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlem</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {measurements.map((measurement, index) => (
                                  <tr key={measurement._id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/50'}>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                      {formatDateSafe(measurement.date)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{measurement.weight ? `${measurement.weight} kg` : '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{measurement.neck ? `${measurement.neck} cm` : '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{measurement.chest ? `${measurement.chest} cm` : '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{measurement.waist ? `${measurement.waist} cm` : '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{measurement.abdomen ? `${measurement.abdomen} cm` : '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{measurement.hip ? `${measurement.hip} cm` : '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{measurement.arm ? `${measurement.arm} cm` : '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{measurement.thigh ? `${measurement.thigh} cm` : '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{measurement.calf ? `${measurement.calf} cm` : '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => handleDeleteMeasurement(measurement._id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                        title="Ölçümü Sil"
                                      >
                                        <i className="fas fa-trash"></i>
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
              <i className="fas fa-user-check text-gray-300 dark:text-gray-600 text-5xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Lütfen bir danışan seçin
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Ölçümleri görüntülemek için soldaki listeden bir danışan seçin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fetch error notification */}
      {addMeasurementMutation.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm mb-4">
          <i className="fas fa-exclamation-circle mr-2"></i>
          Ölçüm kaydedilirken bir hata oluştu. Lütfen tüm değerleri kontrol edip tekrar deneyin.
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ölçüm Silme</AlertDialogTitle>
            <AlertDialogDescription>
              Bu ölçümü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteMeasurement}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <i className="fas fa-trash mr-2"></i>
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
