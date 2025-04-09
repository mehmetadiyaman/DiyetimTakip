import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
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
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DietPlan as ServerDietPlan, Client as ServerClient } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateMacros } from "@/utils/calculations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

// Frontend ve backend modelleri arasındaki uyumsuzluğu çözmek için ara tipler
interface Client {
  id: string; // Backend'de _id olarak geliyor
  fullName: string; // Backend'de name olarak geliyor
  email: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  createdAt?: string; // Optional olarak işaretle
  notes?: string;
  profilePicture?: string;
  status?: string; // Optional olarak işaretle
}

// Tüm dosyayı temizlemek yerine, DietPlan tanımını düzeltiyorum ve artık interface yerine type olarak kullanıyorum
type DietPlan = {
  id: string; // Backend'de _id olarak geliyor
  clientId: string; // Backend'de string, frontend'de number olarak kullanılmış
  name: string; // Backend'de title olarak geliyor
  startDate: Date | string;
  endDate?: Date | string;
  content: string; 
  description: string; // Description alanı artık zorunlu olarak tanımlandı
  isActive: boolean; // Backend'de status: "active" | "inactive" olarak geliyor
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  attachments?: string[];
  dailyCalories?: number;
  macroProtein?: number;
  macroCarbs?: number;
  macroFat?: number;
  meals?: Meal[];
};

// Backend ile frontend arasında dönüşüm yapacak yardımcı fonksiyonlar
function serverToClientDietPlan(serverPlan: ServerDietPlan): DietPlan {
  // Backend'den gelen diyet planını frontend için formatla
  return {
    id: serverPlan._id,
    clientId: serverPlan.clientId,
    name: serverPlan.title,
    startDate: new Date(serverPlan.startDate),
    endDate: serverPlan.endDate ? new Date(serverPlan.endDate) : undefined,
    content: serverPlan.content || "",
    description: serverPlan.description || "", // Şimdi backend'de description var
    isActive: serverPlan.status === 'active',
    createdBy: serverPlan.createdBy,
    createdAt: new Date(serverPlan.createdAt),
    updatedAt: new Date(serverPlan.updatedAt),
    attachments: serverPlan.attachments,
    dailyCalories: serverPlan.dailyCalories || 0,
    macroProtein: serverPlan.macroProtein || 0,
    macroCarbs: serverPlan.macroCarbs || 0,
    macroFat: serverPlan.macroFat || 0,
    meals: serverPlan.meals
  };
}

function serverToClientClient(serverClient: ServerClient): Client {
  return {
    id: serverClient._id || "", // Undefined kontrolü
    fullName: serverClient.name || "", // name alanı için fallback
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

// Meal type
interface Meal {
  name: string;
  foods: {
    name: string;
    amount: string;
    calories?: number;
  }[];
}

// Diet plan form schema - Form şemasına isActive alanını ekliyorum
const dietPlanFormSchema = z.object({
  clientId: z.string({
    required_error: "Danışan seçimi zorunludur",
  }),
  name: z.string().min(3, "Plan adı en az 3 karakter olmalıdır"),
  description: z.string().optional(),
  startDate: z.string({
    required_error: "Başlangıç tarihi zorunludur",
  }),
  endDate: z.string().optional(),
  dailyCalories: z.coerce.number().min(1, "Günlük kalori değeri girilmelidir"),
  macroProtein: z.coerce.number().min(0, "Protein değeri 0 veya daha büyük olmalıdır"),
  macroCarbs: z.coerce.number().min(0, "Karbonhidrat değeri 0 veya daha büyük olmalıdır"),
  macroFat: z.coerce.number().min(0, "Yağ değeri 0 veya daha büyük olmalıdır"),
  content: z.string().optional(),
  isActive: z.boolean().default(true),
  meals: z.array(
    z.object({
      name: z.string(),
      foods: z.array(
        z.object({
          name: z.string(),
          amount: z.string(),
          calories: z.number().optional(),
        })
      ),
    })
  ),
});

type DietPlanFormValues = z.infer<typeof dietPlanFormSchema>;

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

export default function DietPlans() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DietPlan | null>(null);
  const [initialMeals, setInitialMeals] = useState<Meal[]>([
    { name: "Kahvaltı", foods: [{ name: "", amount: "", calories: undefined }] },
    { name: "Öğle Yemeği", foods: [{ name: "", amount: "", calories: undefined }] },
    { name: "Akşam Yemeği", foods: [{ name: "", amount: "", calories: undefined }] },
    { name: "Ara Öğün", foods: [{ name: "", amount: "", calories: undefined }] },
  ]);
  
  // Fetch diet plans with conversion
  const { data: dietPlans, isLoading } = useQuery({
    queryKey: ['/api/diet-plans'],
    queryFn: async () => {
      const response = await fetch('/api/diet-plans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Diyet planları alınamadı');
      const serverPlans = await response.json() as ServerDietPlan[];
      return serverPlans.map(serverToClientDietPlan);
    }
  });
  
  // Fetch clients for the select dropdown with conversion
  const { data: clients, isLoading: isClientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Danışan listesi alınamadı');
      const serverClients = await response.json() as ServerClient[];
      return serverClients.map(serverToClientClient);
    }
  });
  
  // Add diet plan mutation
  const addDietPlanMutation = useMutation({
    mutationFn: async (data: DietPlanFormValues) => {
      // Backend'e uyumlu formatta gönderelim
      const backendData = {
        clientId: data.clientId,
        title: data.name,
        content: data.content || JSON.stringify(data.meals),
        description: data.description || "",
        startDate: data.startDate,
        endDate: data.endDate || null,
        dailyCalories: Number(data.dailyCalories || 0),
        macroProtein: Number(data.macroProtein || 0),
        macroCarbs: Number(data.macroCarbs || 0),
        macroFat: Number(data.macroFat || 0),
        meals: data.meals,
        status: data.isActive ? 'active' : 'inactive'
      };
      
      console.log('Gönderilecek veriler:', JSON.stringify(backendData, null, 2));
      
      // clientId MongoDB ObjectId olarak doğru formatta gönderildiğinden emin ol
      const response = await apiRequest("POST", `/api/clients/${data.clientId}/diet-plans`, backendData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diet-plans'] });
      setShowAddDialog(false);
      toast({
        title: "Başarılı",
        description: "Diyet planı başarıyla eklendi",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: `Diyet planı eklenirken bir hata oluştu: ${error.message}`,
      });
    }
  });
  
  // Diet plan form
  const form = useForm<DietPlanFormValues>({
    resolver: zodResolver(dietPlanFormSchema),
    defaultValues: {
      name: "",
      description: "",
      dailyCalories: 0,
      macroProtein: 0,
      macroCarbs: 0,
      macroFat: 0,
      content: "",
      meals: initialMeals,
    },
  });
  
  // Calculate macros based on daily calories
  const calculateMacrosFromCalories = (calories: number) => {
    try {
      const macros = calculateMacros(calories);
      form.setValue("macroProtein", macros.protein);
      form.setValue("macroCarbs", macros.carbs);
      form.setValue("macroFat", macros.fat);
    } catch (error) {
      console.error("Makro hesaplama hatası:", error);
    }
  };
  
  // Watch daily calories to calculate macros
  const dailyCalories = form.watch("dailyCalories");
  
  React.useEffect(() => {
    if (dailyCalories && dailyCalories > 0) {
      calculateMacrosFromCalories(dailyCalories);
    }
  }, [dailyCalories]);
  
  // Form submission
  function onSubmit(values: DietPlanFormValues) {
    addDietPlanMutation.mutate(values);
  }
  
  // Add new food item to a meal
  const addFoodToMeal = (mealIndex: number, formType: "add" | "edit" = "add") => {
    try {
      if (formType === "add") {
        const addFormMeals = [...form.getValues("meals")];
        addFormMeals[mealIndex].foods.push({ name: "", amount: "", calories: undefined });
        form.setValue("meals", addFormMeals, { shouldValidate: true });
        console.log(`Yeni besin eklendi, form değerleri:`, form.getValues("meals")[mealIndex]);
        
        // Ekstra yenileme için
        setTimeout(() => form.trigger("meals"), 0);
      } else {
        const editFormMeals = [...editForm.getValues("meals")];
        editFormMeals[mealIndex].foods.push({ name: "", amount: "", calories: undefined });
        editForm.setValue("meals", editFormMeals, { shouldValidate: true });
        console.log(`Düzenleme formuna yeni besin eklendi, form değerleri:`, editForm.getValues("meals")[mealIndex]);
        
        // Ekstra yenileme için
        setTimeout(() => editForm.trigger("meals"), 0);
      }
    } catch (error) {
      console.error(`Besin eklerken hata oluştu (${formType}):`, error);
    }
  };
  
  // Remove food item from a meal
  const removeFoodFromMeal = (mealIndex: number, foodIndex: number, formType: "add" | "edit" = "add") => {
    try {
      if (formType === "add") {
        const addFormMeals = [...form.getValues("meals")];
        if (!addFormMeals[mealIndex]?.foods) return;
        addFormMeals[mealIndex].foods.splice(foodIndex, 1);
        form.setValue("meals", addFormMeals, { shouldValidate: true });
        console.log(`Besin silindi, form değerleri:`, form.getValues("meals")[mealIndex]);
        
        // Ekstra yenileme için
        setTimeout(() => form.trigger("meals"), 0);
      } else {
        const editFormMeals = [...editForm.getValues("meals")];
        if (!editFormMeals[mealIndex]?.foods) return;
        editFormMeals[mealIndex].foods.splice(foodIndex, 1);
        editForm.setValue("meals", editFormMeals, { shouldValidate: true });
        console.log(`Düzenleme formundan besin silindi, form değerleri:`, editForm.getValues("meals")[mealIndex]);
        
        // Ekstra yenileme için
        setTimeout(() => editForm.trigger("meals"), 0);
      }
    } catch (error) {
      console.error(`Besin silerken hata oluştu (${formType}):`, error);
    }
  };
  
  // Edit form
  const editForm = useForm<DietPlanFormValues>({
    resolver: zodResolver(dietPlanFormSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: "",
      startDate: "",
      endDate: "",
      dailyCalories: 0,
      macroProtein: 0,
      macroCarbs: 0,
      macroFat: 0,
      content: "",
      meals: initialMeals,
    },
    mode: "onChange"
  });
  
  // Reset the edit form
  const resetEditForm = () => {
    editForm.reset({
      name: "",
      description: "",
      clientId: "",
      startDate: "",
      endDate: "",
      dailyCalories: 0,
      macroProtein: 0,
      macroCarbs: 0,
      macroFat: 0,
      content: "",
      meals: initialMeals,
    });
  };
  
  // Filter diet plans based on search term
  const filteredDietPlans = React.useMemo(() => {
    if (!dietPlans) return [];
    
    if (!searchTerm) return dietPlans;
    
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return dietPlans.filter(plan => 
      plan.name.toLowerCase().includes(lowerCaseSearchTerm) || 
      (plan.description && plan.description.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [dietPlans, searchTerm]);
  
  // Get client by ID
  const getClientById = (clientId: string) => {
    if (!clients || !clientId) return null;
    
    // Debug log - sadece geliştirme aşamasında
    console.log("Aranan client ID:", clientId);
    
    const client = clients.find(client => client.id === clientId);
    if (!client) {
      console.warn(`ID'si ${clientId} olan danışan bulunamadı. Mevcut client ID'leri:`, clients.map(c => c.id));
      return null;
    }
    return client;
  };
  
  // Handle view diet plan
  const handleViewPlan = (plan: DietPlan) => {
    setSelectedPlan(plan);
    setShowViewDialog(true);
  };
  
  // Parse meals from content if needed
  const parseMealsFromContent = (plan: DietPlan): Meal[] => {
    if (plan.meals && plan.meals.length > 0) {
      return plan.meals;
    }
    
    // Try to parse meals from content field if it's a JSON string
    if (plan.content) {
      try {
        const parsedContent = JSON.parse(plan.content);
        if (Array.isArray(parsedContent) && parsedContent.length > 0 && parsedContent[0].name) {
          return parsedContent as Meal[];
        }
      } catch (e) {
        console.error("JSON parse error:", e);
      }
    }
    
    return initialMeals;
  };
  
  // Format and display meal content in a human-readable way
  const formatMealContent = (content: string): React.ReactNode => {
    try {
      const parsedContent = JSON.parse(content);
      
      if (Array.isArray(parsedContent) && parsedContent.length > 0 && parsedContent[0].name) {
        return (
          <div>
            {parsedContent.map((meal: Meal, index: number) => (
              <div key={index} className={index > 0 ? "mt-4" : ""}>
                <h4 className="font-medium mb-2">{meal.name}</h4>
                {meal.foods && meal.foods.length > 0 && meal.foods.some((f: {name: string}) => f.name) ? (
                  <ul className="list-disc pl-5">
                    {meal.foods.map((food: { name: string; amount: string; calories?: number }, foodIndex: number) => (
                      food.name ? (
                        <li key={foodIndex}>
                          {food.name} - {food.amount} {food.calories ? `(${food.calories} kcal)` : ''}
                        </li>
                      ) : null
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    Bu öğün için besin eklenmemiş.
                  </p>
                )}
              </div>
            ))}
          </div>
        );
      }
    } catch (e) {
      // Geçerli JSON değil, içeriği olduğu gibi göster
    }
    
    // JSON değilse veya meal formatında değilse, içeriği doğrudan göster
    return <p>{content}</p>;
  };
  
  // Handle edit diet plan
  const handleEditDietPlan = (plan: DietPlan) => {
    setSelectedPlan(plan);
    
    // Convert dates to string format for form fields using our safe formatter
    const startDateStr = dateToInputFormat(plan.startDate);
    const endDateStr = dateToInputFormat(plan.endDate);
    
    // Parse meals from content if needed
    const mealData = parseMealsFromContent(plan);
    
    // Format content for display - if it's JSON, we want to display a human-readable version
    let formattedContent = plan.content || "";
    try {
      // Check if content is a JSON array of meals - if so, we don't want to show it in the content field
      const parsedContent = JSON.parse(plan.content || "");
      if (Array.isArray(parsedContent) && parsedContent.length > 0 && parsedContent[0].name) {
        // This is meal data, don't show it as content
        formattedContent = ""; // Clear content field as it's just meal data
      }
    } catch (e) {
      // Not valid JSON, keep original content
      console.log("JSON parse hatası (normal bir durum olabilir):", e);
    }
    
    console.log("Düzenleme formuna yüklenen veriler:", {
      name: plan.name || "",
      description: plan.description || "",
      startDate: startDateStr,
      endDate: endDateStr,
      clientId: plan.clientId || ""
    });
    
    // Set form values
    editForm.reset({
      name: plan.name || "",
      content: formattedContent,
      description: plan.description || "",
      clientId: plan.clientId || "",
      startDate: startDateStr,
      endDate: endDateStr,
      dailyCalories: plan.dailyCalories || 0,
      macroProtein: plan.macroProtein || 0,
      macroCarbs: plan.macroCarbs || 0,
      macroFat: plan.macroFat || 0,
      isActive: plan.isActive,
      meals: mealData,
    });
    
    setShowEditDialog(true);
  };
  
  // Handle delete diet plan
  const handleDeleteDietPlan = (planId: string) => {
    const plan = dietPlans?.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setShowDeleteDialog(true);
    } else {
      console.error("Silinecek plan bulunamadı:", planId);
      toast({
        title: "Hata",
        description: "Silinecek diyet planı bulunamadı",
        variant: "destructive",
      });
    }
  };
  
  // Update diet plan mutation
  const updateDietPlanMutation = useMutation({
    mutationFn: async (data: DietPlanFormValues) => {
      if (!selectedPlan?.id) {
        throw new Error("Plan bilgisi bulunamadı");
      }
      
      console.log("Güncellenecek plan bilgisi:", selectedPlan);
      
      // Prepare meals data as JSON string if we have meal data
      let content = data.content || "";
      const hasMealData = data.meals && data.meals.some(meal => 
        meal.foods && meal.foods.some(food => food.name && food.name.trim() !== "")
      );
      
      if (hasMealData) {
        // If form has content but we also have meal data, prioritize meal data
        content = JSON.stringify(data.meals);
      }
      
      // Prepare data for API submission - backend formatında
      const backendData = {
        clientId: data.clientId,
        title: data.name,
        content: content,
        description: data.description || "", // Boş değer yerine string gönder
        startDate: data.startDate,
        endDate: data.endDate || null, // Null değeri açıkça belirt
        status: data.isActive ? 'active' : 'inactive',
        dailyCalories: Number(data.dailyCalories || 0),
        macroProtein: Number(data.macroProtein || 0),
        macroCarbs: Number(data.macroCarbs || 0),
        macroFat: Number(data.macroFat || 0),
        meals: data.meals
      };
      
      console.log('Gönderilecek veriler:', JSON.stringify(backendData, null, 2));
      
      try {
        // Backend API'ye istek gönder - MongoDB ObjectId olarak doğru format
        const response = await apiRequest("PUT", `/api/diet-plans/${selectedPlan.id}`, backendData);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API yanıt hatası:", response.status, errorText);
          throw new Error(`Diyet planı güncellenirken hata: (${response.status}) ${errorText || response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('Sunucudan gelen cevap:', responseData);
        return responseData;
      } catch (error: any) {
        console.error("API isteği hatası:", error.message || error);
        throw error; // Hatayı yukarıya ilet
      }
    },
    onSuccess: (data) => {
      console.log("Güncelleme başarılı:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/diet-plans'] });
      setShowEditDialog(false);
      resetEditForm();
      setSelectedPlan(null);
      toast({
        title: "Diyet planı güncellendi",
        description: "Diyet planı başarıyla güncellendi.",
      });
    },
    onError: (error: any) => {
      console.error("Güncelleme hatası:", error);
      toast({
        title: "Hata",
        description: error.message || "Diyet planı güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  });
  
  // Delete diet plan mutation
  const deleteDietPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Silinecek diyet planı ID:", id);
      const response = await apiRequest("DELETE", `/api/diet-plans/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Diyet planı silme hatası:", response.status, errorData);
        throw new Error(errorData?.message || "Diyet planı silinirken bir hata oluştu");
      }
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diet-plans'] });
      setShowDeleteDialog(false);
      setSelectedPlan(null);
      toast({
        title: "Diyet planı silindi",
        description: "Diyet planı başarıyla silindi.",
      });
    },
    onError: (error: Error) => {
      console.error("Diyet planı silme hatası:", error);
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // İlgili dietPlans ve clients verilerinin yüklenmesini bekleyen bir yükleme durumu
  const isDataLoading = isLoading || isClientsLoading;
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Diyet Planları</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tüm diyet planlarını yönetin.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <i className="fas fa-plus mr-2"></i>
                Yeni Diyet Planı
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Yeni Diyet Planı Oluştur</DialogTitle>
                <DialogDescription>
                  Danışan için yeni bir diyet planı oluşturun.
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
                                <option key={client.id} value={client.id}>{client.fullName}</option>
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
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan Adı*</FormLabel>
                            <FormControl>
                              <Input placeholder="Örn: Kilo Verme Diyeti" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="dailyCalories"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Günlük Kalori*</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="1800" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Başlangıç Tarihi*</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bitiş Tarihi</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Açıklama</FormLabel>
                          <FormControl>
                            <textarea
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Diyet planı hakkında açıklama..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-4 border rounded-md">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Diyet Planı Durumu</FormLabel>
                            <FormDescription>
                              Bu diyet planının aktif olup olmadığını belirtin.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                      <h4 className="font-medium mb-2">Makro Besinler</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="macroProtein"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Protein (g)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="macroCarbs"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Karbonhidrat (g)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="macroFat"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Yağ (g)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                      <h4 className="font-medium mb-4">Öğünler</h4>
                      
                      {form.getValues("meals").map((meal, mealIndex) => (
                        <div key={mealIndex} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-medium">{meal.name}</h5>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                console.log("Besin ekle butonuna tıklandı, öğün indeksi:", mealIndex);
                                addFoodToMeal(mealIndex, "add");
                              }}
                            >
                              <i className="fas fa-plus mr-2"></i> Besin Ekle
                            </Button>
                          </div>
                          
                          {meal.foods.map((food: { name: string; amount: string; calories?: number }, foodIndex: number) => (
                            <div key={foodIndex} className="grid grid-cols-12 gap-2 mb-2 items-end">
                              <div className="col-span-5">
                                <FormField
                                  control={form.control}
                                  name={`meals.${mealIndex}.foods.${foodIndex}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className={foodIndex > 0 ? "sr-only" : ""}>Besin</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Besin adı" {...field} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <div className="col-span-4">
                                <FormField
                                  control={form.control}
                                  name={`meals.${mealIndex}.foods.${foodIndex}.amount`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className={foodIndex > 0 ? "sr-only" : ""}>Miktar</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Miktar" {...field} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <div className="col-span-2">
                                <FormField
                                  control={form.control}
                                  name={`meals.${mealIndex}.foods.${foodIndex}.calories`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className={foodIndex > 0 ? "sr-only" : ""}>Kal</FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="number" 
                                          placeholder="Kal" 
                                          {...field} 
                                          value={field.value || ""}
                                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <div className="col-span-1">
                                {meal.foods.length > 1 && (
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm"
                                    className="w-full h-10"
                                    onClick={() => {
                                      console.log("Besin sil butonuna tıklandı, öğün indeksi:", mealIndex, "besin indeksi:", foodIndex);
                                      removeFoodFromMeal(mealIndex, foodIndex, "add");
                                    }}
                                  >
                                    <i className="fas fa-trash text-red-500"></i>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    
                    <DialogFooter>
                      <Button type="submit" disabled={addDietPlanMutation.isPending}>
                        {addDietPlanMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i> Kaydediliyor...
                          </>
                        ) : (
                          "Diyet Planı Oluştur"
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
      
      {isDataLoading ? (
        <div className="flex justify-center items-center p-12">
          <i className="fas fa-spinner fa-spin text-primary text-2xl mr-2"></i>
          <span>Diyet planları ve danışan verileri yükleniyor...</span>
        </div>
      ) : (
        <>
          {filteredDietPlans.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
              <i className="fas fa-utensils text-gray-300 dark:text-gray-600 text-5xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? "Arama sonucu bulunamadı" : "Henüz diyet planı oluşturmadınız"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {searchTerm
                  ? "Farklı bir arama terimi deneyin veya yeni bir diyet planı oluşturun."
                  : "İlk diyet planınızı oluşturmak için 'Yeni Diyet Planı' butonuna tıklayın."}
              </p>
              
              {!searchTerm && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <i className="fas fa-plus mr-2"></i>
                  Yeni Diyet Planı Oluştur
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDietPlans.map((plan) => {
                const client = getClientById(plan.clientId);
                
                return (
                  <Card key={plan.id} className="h-full hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                            {client?.profilePicture ? (
                              <img 
                                src={client.profilePicture} 
                                alt={client.fullName || "Danışan"} 
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  // Resim yüklenemezse simge göster
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.classList.add('fallback-icon');
                                }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-primary/10">
                                <i className="fas fa-user text-primary"></i>
                              </div>
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            {client && (
                              <CardDescription>
                                {client.fullName || "İsimsiz Danışan"}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${plan.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {plan.isActive ? 'Aktif' : 'Pasif'}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      {plan.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-500 dark:text-gray-400">Başlangıç:</div>
                        <div className="text-gray-700 dark:text-gray-300">
                          {formatDateSafe(plan.startDate)}
                        </div>
                        
                        {plan.endDate && (
                          <>
                            <div className="text-gray-500 dark:text-gray-400">Bitiş:</div>
                            <div className="text-gray-700 dark:text-gray-300">
                              {formatDateSafe(plan.endDate)}
                            </div>
                          </>
                        )}
                        
                        <div className="text-gray-500 dark:text-gray-400">Kalori:</div>
                        <div className="text-gray-700 dark:text-gray-300">
                          {plan.dailyCalories || 0} kcal/gün
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-center">
                          <span className="block text-blue-700 dark:text-blue-300 font-medium">{plan.macroProtein || 0}g</span>
                          <span className="text-gray-500 dark:text-gray-400">Protein</span>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded text-center">
                          <span className="block text-amber-700 dark:text-amber-300 font-medium">{plan.macroCarbs || 0}g</span>
                          <span className="text-gray-500 dark:text-gray-400">Karb</span>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/30 p-2 rounded text-center">
                          <span className="block text-red-700 dark:text-red-300 font-medium">{plan.macroFat || 0}g</span>
                          <span className="text-gray-500 dark:text-gray-400">Yağ</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewPlan(plan)}
                      >
                        <i className="fas fa-eye mr-2"></i> Görüntüle
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditDietPlan(plan)}
                      >
                        <i className="fas fa-edit mr-2"></i> Düzenle
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteDietPlan(plan.id)}
                      >
                        <i className="fas fa-trash-alt mr-2"></i> Sil
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
      
      {/* View Diet Plan Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedPlan?.name || "Diyet Planı Detayları"}
            </DialogTitle>
            {selectedPlan?.description && (
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                {selectedPlan.description}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedPlan && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {getClientById(selectedPlan.clientId)?.profilePicture ? (
                        <img 
                          src={getClientById(selectedPlan.clientId)?.profilePicture} 
                          alt={getClientById(selectedPlan.clientId)?.fullName || "Danışan"} 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-primary/10">
                          <i className="fas fa-user text-primary"></i>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{getClientById(selectedPlan.clientId)?.fullName || "Danışan Bulunamadı"}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDateSafe(selectedPlan.startDate)}
                        {selectedPlan.endDate && ` - ${formatDateSafe(selectedPlan.endDate)}`}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedPlan.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {selectedPlan.isActive ? 'Aktif' : 'Pasif'}
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-md font-medium mb-3">Makro Besinler</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-md p-3 text-center">
                      <p className="text-lg font-semibold text-primary">{selectedPlan.dailyCalories || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">kcal/gün</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-md p-3 text-center">
                      <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{selectedPlan.macroProtein || 0}g</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Protein</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-md p-3 text-center">
                      <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{selectedPlan.macroCarbs || 0}g</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Karbonhidrat</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-md p-3 text-center">
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400">{selectedPlan.macroFat || 0}g</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Yağ</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-md font-medium mb-3">Öğünler ve Besinler</h3>
                  <div className="bg-white dark:bg-gray-800 shadow-sm rounded-md p-4">
                    {selectedPlan.content ? (
                      formatMealContent(selectedPlan.content)
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 italic text-center py-4">
                        Bu diyet planı için öğün detayları girilmemiş.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          
          <DialogFooter className="gap-2 mt-3">
            <Button 
              variant="outline" 
              onClick={() => setShowViewDialog(false)}
            >
              Kapat
            </Button>
            {selectedPlan && (
              <>
                <Button
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setShowViewDialog(false);
                    handleEditDietPlan(selectedPlan);
                  }}
                >
                  <i className="fas fa-edit mr-2"></i> Düzenle
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setShowViewDialog(false);
                    handleDeleteDietPlan(selectedPlan.id);
                  }}
                >
                  <i className="fas fa-trash-alt mr-2"></i> Sil
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Diet Plan Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Diyet Planını Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu diyet planını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (selectedPlan) {
                  console.log("Diyet planı siliniyor:", selectedPlan.id);
                  deleteDietPlanMutation.mutate(selectedPlan.id);
                }
              }}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {deleteDietPlanMutation.isPending ? (
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
      
      {/* Edit Diet Plan Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Diyet Planı Düzenle</DialogTitle>
            <DialogDescription>
              {selectedPlan ? `${selectedPlan.name} planını düzenliyorsunuz.` : 'Diyet planını düzenleyin.'}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((values) => {
                console.log("Form değerleri gönderiliyor:", values);
                updateDietPlanMutation.mutate(values);
              })} className="space-y-4">
                <FormField
                  control={editForm.control}
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
                            <option key={client.id} value={client.id}>{client.fullName}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Adı*</FormLabel>
                        <FormControl>
                          <Input placeholder="Örn: Kilo Verme Diyeti" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="dailyCalories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Günlük Kalori*</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1800" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlangıç Tarihi*</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bitiş Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Açıklama</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Diyet planı hakkında açıklama..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 border rounded-md">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Diyet Planı Durumu</FormLabel>
                        <FormDescription>
                          Bu diyet planının aktif olup olmadığını belirtin.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                  <h4 className="font-medium mb-2">Makro Besinler</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={editForm.control}
                      name="macroProtein"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Protein (g)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="macroCarbs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Karbonhidrat (g)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="macroFat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yağ (g)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                  <h4 className="font-medium mb-4">Öğünler</h4>
                  
                  {editForm.getValues("meals").map((meal, mealIndex) => (
                    <div key={mealIndex} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-medium">{meal.name}</h5>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            console.log("Düzenleme formunda besin ekle butonuna tıklandı, öğün indeksi:", mealIndex);
                            addFoodToMeal(mealIndex, "edit");
                          }}
                        >
                          <i className="fas fa-plus mr-2"></i> Besin Ekle
                        </Button>
                      </div>
                      
                      {meal.foods.map((food: { name: string; amount: string; calories?: number }, foodIndex: number) => (
                        <div key={foodIndex} className="grid grid-cols-12 gap-2 mb-2 items-end">
                          <div className="col-span-5">
                            <FormField
                              control={editForm.control}
                              name={`meals.${mealIndex}.foods.${foodIndex}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={foodIndex > 0 ? "sr-only" : ""}>Besin</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Besin adı" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="col-span-4">
                            <FormField
                              control={editForm.control}
                              name={`meals.${mealIndex}.foods.${foodIndex}.amount`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={foodIndex > 0 ? "sr-only" : ""}>Miktar</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Miktar" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <FormField
                              control={editForm.control}
                              name={`meals.${mealIndex}.foods.${foodIndex}.calories`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={foodIndex > 0 ? "sr-only" : ""}>Kal</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="Kal" 
                                      {...field} 
                                      value={field.value || ""}
                                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="col-span-1">
                            {meal.foods.length > 1 && (
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                className="w-full h-10"
                                onClick={() => {
                                  console.log("Düzenleme formunda besin sil butonuna tıklandı, öğün indeksi:", mealIndex, "besin indeksi:", foodIndex);
                                  removeFoodFromMeal(mealIndex, foodIndex, "edit");
                                }}
                              >
                                <i className="fas fa-trash text-red-500"></i>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => setShowEditDialog(false)}
                  >
                    İptal
                  </Button>
                  <Button type="submit" disabled={updateDietPlanMutation.isPending}>
                    {updateDietPlanMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i> Güncelleniyor...
                      </>
                    ) : (
                      "Diyet Planını Güncelle"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
