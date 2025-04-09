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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { clientSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Client form schema
const clientFormSchema = z.object({
  fullName: z.string().min(3, "Ad Soyad en az 3 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  phone: z.string().min(10, "Telefon numarası en az 10 karakter olmalıdır"),
  gender: z.enum(["male", "female"], {
    required_error: "Cinsiyet seçimi zorunludur",
  }),
  birthDate: z.string().optional().default(""),
  height: z.coerce.number().optional().default(0),
  startingWeight: z.coerce.number().optional().default(0),
  targetWeight: z.coerce.number().optional().default(0),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"], {
    required_error: "Aktivite seviyesi zorunludur",
  }),
  medicalHistory: z.string().optional().default(""),
  dietaryRestrictions: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  profilePicture: z.string().optional().default(""),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

// MongoDB modeline uygun bir Client tipi
interface Client {
  _id: string;
  userId: string;
  name: string;
  fullName?: string; // Uyumluluk için ekledim
  email: string;
  phone?: string;
  birthDate?: string | Date;
  gender?: string;
  height?: number;
  startingWeight?: number;
  targetWeight?: number;
  activityLevel?: string;
  medicalHistory?: string;
  dietaryRestrictions?: string;
  createdAt: string | Date;
  notes?: string;
  profilePicture?: string;
  profileImage?: string; // Uyumluluk için
  status: string;
}

export default function Clients() {
  const { toast } = useToast();
  const { user } = useAuth(); // Kullanıcı bilgilerini alıyoruz
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientIdToDelete, setClientIdToDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Fetch clients
  const { data: clients, isLoading } = useQuery({
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
  
  // Filter clients based on search term
  const filteredClients = React.useMemo(() => {
    if (!clients) return [];
    return clients;
  }, [clients]);
  
  // Add client mutation
  const addClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      // Map the form data to match the server model structure
      // userId, server tarafında zorunlu alan - mevcut kullanıcı ID'si
      const clientData = {
        userId: user?._id, // Mevcut giriş yapmış diyetisyenin ID'si
        name: data.fullName, // Backend veritabanı modeline uyumlu - name alanı gerekli
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        birthDate: data.birthDate,
        height: data.height,
        startingWeight: data.startingWeight,
        targetWeight: data.targetWeight,
        activityLevel: data.activityLevel,
        medicalHistory: data.medicalHistory,
        dietaryRestrictions: data.dietaryRestrictions,
        notes: data.notes,
        profilePicture: data.profilePicture
      };
      
      console.log("Gönderilen veriler:", clientData);
      
      const response = await apiRequest("POST", "/api/clients", clientData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setShowAddDialog(false);
      setProfileImage(null);
      form.reset();
      toast({
        title: "Başarılı",
        description: "Danışan başarıyla eklendi",
      });
    },
    onError: (error: Error) => {
      console.error("Danışan ekleme hatası:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: `Danışan eklenirken bir hata oluştu: ${error.message}`,
      });
    }
  });
  
  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues & { id: string }) => {
      const { id, ...formValues } = data;
      
      // Backende gönderilecek veriyi düzenle - backend şemasına uygun hale getir
      const clientData = {
        userId: user?._id, // Mevcut giriş yapmış diyetisyenin ID'si
        name: formValues.fullName, // Backend veritabanı modeline uyumlu
        email: formValues.email,
        phone: formValues.phone,
        gender: formValues.gender,
        birthDate: formValues.birthDate,
        height: formValues.height,
        startingWeight: formValues.startingWeight,
        targetWeight: formValues.targetWeight,
        activityLevel: formValues.activityLevel,
        medicalHistory: formValues.medicalHistory,
        dietaryRestrictions: formValues.dietaryRestrictions,
        notes: formValues.notes,
        profilePicture: formValues.profilePicture
      };
      
      console.log("Güncellenen veriler:", clientData);
      
      const response = await apiRequest("PUT", `/api/clients/${id}`, clientData);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Güncelleme hatası: ${errorData}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setShowEditDialog(false);
      setSelectedClient(null);
      setProfileImage(null);
      form.reset();
      toast({
        title: "Başarılı",
        description: "Danışan başarıyla güncellendi",
      });
    },
    onError: (error: Error) => {
      console.error("Danışan güncelleme hatası:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: `Danışan güncellenirken bir hata oluştu: ${error.message}`,
      });
    }
  });
  
  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/clients/${id}`);
      return response.status === 204 ? true : response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setShowDeleteDialog(false);
      setClientIdToDelete(null);
      toast({
        title: "Başarılı",
        description: "Danışan başarıyla silindi",
      });
    },
    onError: (error: Error) => {
      console.error("Danışan silme hatası:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: `Danışan silinirken bir hata oluştu: ${error.message}`,
      });
    }
  });
  
  // Client form
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      gender: "female",
      birthDate: "",
      height: 0,
      startingWeight: 0,
      targetWeight: 0,
      activityLevel: "moderate",
      medicalHistory: "",
      dietaryRestrictions: "",
      notes: "",
      profilePicture: "",
    },
  });
  
  // Handle client edit button click
  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    
    // Doğum tarihini kullanılabilir bir formata dönüştür
    let formattedBirthDate = "";
    if (client.birthDate) {
      // String veya Date olabilir, her durumu kontrol et
      const birthDate = typeof client.birthDate === 'string' 
        ? new Date(client.birthDate)
        : client.birthDate;
      
      formattedBirthDate = birthDate.toISOString().split('T')[0];
    }
    
    // Formu mevcut danışan bilgileriyle dolduralım
    form.reset({
      fullName: client.name || client.fullName || "", 
      email: client.email || "",
      phone: client.phone || "",
      gender: client.gender as "male" | "female" || "female",
      birthDate: formattedBirthDate || "",
      height: client.height || 0,
      startingWeight: client.startingWeight || 0,
      targetWeight: client.targetWeight || 0,
      activityLevel: client.activityLevel as any || "moderate",
      medicalHistory: client.medicalHistory || "",
      dietaryRestrictions: client.dietaryRestrictions || "",
      notes: client.notes || "",
      profilePicture: client.profilePicture || client.profileImage || ""
    });
    
    // Profil resmi varsa state'i güncelle
    if (client.profilePicture || client.profileImage) {
      setProfileImage(client.profilePicture || client.profileImage || null);
    } else {
      setProfileImage(null);
    }
    
    setShowEditDialog(true);
  };
  
  // Handle client delete button click
  const handleDeleteClient = (clientId: string) => {
    setClientIdToDelete(clientId);
    setShowDeleteDialog(true);
  };
  
  // Handle delete confirmation
  const confirmDeleteClient = () => {
    if (clientIdToDelete) {
      deleteClientMutation.mutate(clientIdToDelete);
    }
  };
  
  // Form submission - Create or Update
  function onSubmit(values: ClientFormValues) {
    console.log("Form değerleri:", values);
    
    if (selectedClient) {
      // Update existing client
      updateClientMutation.mutate({ ...values, id: selectedClient._id });
    } else {
      // Create new client
      addClientMutation.mutate(values);
    }
  }
  
  // Handle view client (Yeni: Görüntüleme fonksiyonu)
  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setShowViewDialog(true);
  };
  
  // Handle profile image change
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file type
      if (!file.type.match('image.*')) {
        toast({
          variant: "destructive",
          title: "Geçersiz dosya tipi",
          description: "Lütfen bir resim dosyası seçin (jpg, jpeg, png)"
        });
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Dosya boyutu çok büyük",
          description: "Lütfen 5MB'dan küçük bir dosya seçin"
        });
        return;
      }
      
      setUploading(true);
      
      try {
        // Dosya yükleme için FormData oluştur
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'clients');
        
        console.log('Yükleme başlatılıyor, dosya:', file.name, file.type, file.size);
        
        // API'ye dosyayı gönder
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
            // Content-Type header'ı eklemeyin, browser otomatik ayarlar
          },
          body: formData
        });
        
        console.log('Upload response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Upload error response:', errorText);
          throw new Error(`Resim yüklenirken hata oluştu: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Upload success, received data:', data);
        
        // Başarılı yanıt aldık mı?
        if (data.url) {
          // Local state'i güncelle
          setProfileImage(data.url);
          
          // Form değerini güncelle
          form.setValue('profilePicture', data.url);
          
          // Kullanıcıya bildir
          toast({
            title: "Başarılı",
            description: "Profil resmi başarıyla yüklendi",
          });
        } else {
          throw new Error('Yanıt URL içermiyor');
        }
      } catch (error) {
        console.error('Profil resmi yükleme hatası:', error);
        toast({
          variant: "destructive",
          title: "Hata",
          description: `Profil resmi yüklenirken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        });
      } finally {
        setUploading(false);
      }
    }
  };
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Danışanlar</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tüm danışanlarınızı yönetin.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <i className="fas fa-plus mr-2"></i>
                Yeni Danışan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Yeni Danışan Ekle</DialogTitle>
                <DialogDescription>
                  Yeni bir danışan eklemek için aşağıdaki formu doldurun.
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[60vh] pr-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="col-span-1 md:col-span-2 mb-4">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="h-24 w-24 relative group">
                          {profileImage ? (
                            <img 
                              src={profileImage} 
                              alt="Profil Resmi" 
                              className="h-24 w-24 rounded-full object-cover border-2 border-primary"
                            />
                          ) : (
                            <div className="h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                              <i className="fas fa-user text-gray-400 text-3xl"></i>
                            </div>
                          )}
                          {uploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                              <i className="fas fa-spinner fa-spin text-white"></i>
                            </div>
                          )}
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="profilePicture"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel htmlFor="profilePicture" className="cursor-pointer text-primary hover:text-primary-dark transition-colors py-1 px-2 rounded-md bg-primary/10">
                                <i className="fas fa-camera mr-2"></i>
                                {profileImage ? 'Resmi Değiştir' : 'Profil Resmi Yükle'}
                              </FormLabel>
                              <FormControl>
                                <input 
                                  type="file" 
                                  id="profilePicture"
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={handleImageChange}
                                  disabled={uploading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ad Soyad*</FormLabel>
                            <FormControl>
                              <Input placeholder="Ad Soyad" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-posta*</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="ornek@mail.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon*</FormLabel>
                            <FormControl>
                              <Input placeholder="05xx xxx xx xx" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cinsiyet*</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                              >
                                <option value="female">Kadın</option>
                                <option value="male">Erkek</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="birthDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Doğum Tarihi</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Boy (cm)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="170" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="startingWeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Başlangıç Kilosu (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="70" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="targetWeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hedef Kilo (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="60" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="activityLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Aktivite Seviyesi*</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                              >
                                <option value="sedentary">Hareketsiz</option>
                                <option value="light">Hafif Aktif</option>
                                <option value="moderate">Orta Aktif</option>
                                <option value="active">Aktif</option>
                                <option value="very_active">Çok Aktif</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="medicalHistory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tıbbi Geçmiş</FormLabel>
                          <FormControl>
                            <textarea
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Tıbbi geçmiş, kronik hastalıklar, alerjiler, vb."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dietaryRestrictions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diyet Kısıtlamaları</FormLabel>
                          <FormControl>
                            <textarea
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Vejetaryen, vegan, glütensiz, laktoz intoleransı, vb."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notlar</FormLabel>
                          <FormControl>
                            <textarea
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Ek notlar..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={addClientMutation.isPending}>
                        {addClientMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i> Kaydediliyor...
                          </>
                        ) : (
                          "Danışan Ekle"
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
          <span>Danışanlar yükleniyor...</span>
        </div>
      ) : (
        <>
          {filteredClients.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
              <i className="fas fa-users text-gray-300 dark:text-gray-600 text-5xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Henüz danışan eklemediniz
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                İlk danışanınızı eklemek için 'Yeni Danışan' butonuna tıklayın.
              </p>
              
              <Button onClick={() => setShowAddDialog(true)}>
                <i className="fas fa-plus mr-2"></i>
                Yeni Danışan Ekle
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredClients.map((client) => (
                <Card key={client._id} className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-primary bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center overflow-hidden">
                        {client.profilePicture || client.profileImage ? (
                          <img 
                            src={client.profilePicture || client.profileImage} 
                            alt={`${client.name || client.fullName || "İsimsiz Danışan"} profil resmi`} 
                            className="h-12 w-12 rounded-full object-cover"
                            onError={(e) => {
                              // Resim yüklenemezse simge göster
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.classList.add('fallback-icon');
                            }}
                          />
                        ) : (
                          <i className={`fas fa-${client.gender === 'female' ? 'female' : 'male'} text-primary`}></i>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{client.name || client.fullName || "İsimsiz Danışan"}</CardTitle>
                        <CardDescription>{client.email}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-500 dark:text-gray-400">Telefon:</div>
                      <div className="text-gray-700 dark:text-gray-300">{client.phone || "-"}</div>
                      
                      {client.height && (
                        <>
                          <div className="text-gray-500 dark:text-gray-400">Boy:</div>
                          <div className="text-gray-700 dark:text-gray-300">{client.height} cm</div>
                        </>
                      )}
                      
                      {client.startingWeight && (
                        <>
                          <div className="text-gray-500 dark:text-gray-400">Başlangıç:</div>
                          <div className="text-gray-700 dark:text-gray-300">{client.startingWeight} kg</div>
                        </>
                      )}
                      
                      {client.targetWeight && (
                        <>
                          <div className="text-gray-500 dark:text-gray-400">Hedef:</div>
                          <div className="text-gray-700 dark:text-gray-300">{client.targetWeight} kg</div>
                        </>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleViewClient(client);
                      }}
                    >
                      <i className="fas fa-eye mr-2"></i> Görüntüle
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditClient(client);
                      }}
                    >
                      <i className="fas fa-edit mr-2"></i> Düzenle
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteClient(client._id);
                      }}
                    >
                      <i className="fas fa-trash-alt mr-2"></i> Sil
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Silme Onay Dialog'u */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Danışanı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu danışanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz
              ve danışana ait tüm veriler silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteClient}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {deleteClientMutation.isPending ? (
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
      
      {/* Düzenleme Dialog'u */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[550px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Danışan Düzenle</DialogTitle>
            <DialogDescription>
              {selectedClient ? `${selectedClient.name || selectedClient.fullName} adlı danışanın bilgilerini düzenleyin.` : 'Danışan bilgilerini düzenleyin.'}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="col-span-1 md:col-span-2 mb-4">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="h-24 w-24 relative group">
                      {profileImage ? (
                        <img 
                          src={profileImage} 
                          alt="Profil Resmi" 
                          className="h-24 w-24 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <i className="fas fa-user text-gray-400 text-3xl"></i>
                        </div>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                          <i className="fas fa-spinner fa-spin text-white"></i>
                        </div>
                      )}
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="profilePicture"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="profilePictureEdit" className="cursor-pointer text-primary hover:text-primary-dark transition-colors py-1 px-2 rounded-md bg-primary/10">
                            <i className="fas fa-camera mr-2"></i>
                            {profileImage ? 'Resmi Değiştir' : 'Profil Resmi Yükle'}
                          </FormLabel>
                          <FormControl>
                            <input 
                              type="file" 
                              id="profilePictureEdit"
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleImageChange}
                              disabled={uploading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ad Soyad</FormLabel>
                        <FormControl>
                          <Input placeholder="Ad Soyad Giriniz" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-posta</FormLabel>
                          <FormControl>
                            <Input placeholder="E-posta Giriniz" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon</FormLabel>
                          <FormControl>
                            <Input placeholder="Telefon Giriniz" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cinsiyet</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Cinsiyet Seçiniz" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Erkek</SelectItem>
                              <SelectItem value="female">Kadın</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Doğum Tarihi</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Fiziksel Bilgiler */}
                  <div className="space-y-3 border rounded-lg p-4">
                    <h3 className="text-md font-medium">Fiziksel Bilgiler</h3>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Boy (cm)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="startingWeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Başlangıç Kilosu (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="targetWeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hedef Kilo (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="activityLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aktivite Seviyesi</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Aktivite Seviyesi Seçiniz" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sedentary">Hareketsiz</SelectItem>
                              <SelectItem value="light">Hafif Aktif</SelectItem>
                              <SelectItem value="moderate">Orta Aktif</SelectItem>
                              <SelectItem value="active">Aktif</SelectItem>
                              <SelectItem value="very_active">Çok Aktif</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Sağlık Bilgileri */}
                  <div className="space-y-3 border rounded-lg p-4">
                    <h3 className="text-md font-medium">Sağlık Bilgileri</h3>
                    
                    <FormField
                      control={form.control}
                      name="medicalHistory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tıbbi Geçmiş</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Tıbbi geçmiş bilgileri" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dietaryRestrictions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diyet Kısıtlamaları</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Diyet kısıtlamaları" {...field} />
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
                          <Textarea placeholder="Danışan ile ilgili notlar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => setShowEditDialog(false)}
                  >
                    İptal
                  </Button>
                  <Button type="submit" disabled={updateClientMutation.isPending}>
                    {updateClientMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i> Güncelleniyor...
                      </>
                    ) : (
                      "Danışanı Güncelle"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Görüntüleme Diyaloğu (Yeni) */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedClient?.name || selectedClient?.fullName || "Danışan Detayları"}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Danışan bilgilerine göz atın
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedClient && (
              <div className="space-y-5">
                {/* Danışan Profil Bölümü */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {selectedClient.profilePicture || selectedClient.profileImage ? (
                        <img 
                          src={selectedClient.profilePicture || selectedClient.profileImage} 
                          alt={`${selectedClient.name || selectedClient.fullName || "İsimsiz Danışan"}`} 
                          className="h-full w-full object-cover" 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('fallback-icon');
                          }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-primary/10">
                          <i className={`fas fa-${selectedClient.gender === 'female' ? 'female' : 'male'} text-primary text-xl`}></i>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">{selectedClient.name || selectedClient.fullName || "İsimsiz Danışan"}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedClient.email}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {selectedClient.status === 'active' ? 'Aktif' : 'Pasif'}
                  </div>
                </div>
                
                {/* İletişim Bilgileri */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-md font-medium mb-3">İletişim Bilgileri</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-gray-500 dark:text-gray-400">Telefon:</div>
                    <div className="text-gray-700 dark:text-gray-300">{selectedClient.phone || "-"}</div>
                    
                    <div className="text-gray-500 dark:text-gray-400">E-posta:</div>
                    <div className="text-gray-700 dark:text-gray-300">{selectedClient.email}</div>
                    
                    <div className="text-gray-500 dark:text-gray-400">Cinsiyet:</div>
                    <div className="text-gray-700 dark:text-gray-300">
                      {selectedClient.gender === 'female' ? 'Kadın' : selectedClient.gender === 'male' ? 'Erkek' : '-'}
                    </div>
                    
                    <div className="text-gray-500 dark:text-gray-400">Doğum Tarihi:</div>
                    <div className="text-gray-700 dark:text-gray-300">
                      {selectedClient.birthDate 
                        ? new Date(selectedClient.birthDate).toLocaleDateString('tr-TR')
                        : '-'}
                    </div>
                  </div>
                </div>
                
                {/* Kişisel Bilgiler */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-md font-medium mb-3">Kişisel Bilgiler</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-gray-500 dark:text-gray-400">Doğum Tarihi:</div>
                    <div className="text-gray-700 dark:text-gray-300">
                      {selectedClient.birthDate
                        ? new Date(selectedClient.birthDate).toLocaleDateString('tr-TR')
                        : '-'}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Cinsiyet:</div>
                    <div className="text-gray-700 dark:text-gray-300">
                      {selectedClient.gender === 'male' ? 'Erkek' : 
                       selectedClient.gender === 'female' ? 'Kadın' : '-'}
                    </div>
                  </div>
                </div>

                {/* Fiziksel Bilgiler */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mt-3">
                  <h3 className="text-md font-medium mb-3">Fiziksel Bilgiler</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-gray-500 dark:text-gray-400">Boy:</div>
                    <div className="text-gray-700 dark:text-gray-300">{selectedClient.height ? `${selectedClient.height} cm` : "-"}</div>
                    
                    <div className="text-gray-500 dark:text-gray-400">Başlangıç Kilosu:</div>
                    <div className="text-gray-700 dark:text-gray-300">{selectedClient.startingWeight ? `${selectedClient.startingWeight} kg` : "-"}</div>
                    
                    <div className="text-gray-500 dark:text-gray-400">Hedef Kilo:</div>
                    <div className="text-gray-700 dark:text-gray-300">{selectedClient.targetWeight ? `${selectedClient.targetWeight} kg` : "-"}</div>
                    
                    <div className="text-gray-500 dark:text-gray-400">Aktivite Seviyesi:</div>
                    <div className="text-gray-700 dark:text-gray-300">
                      {(() => {
                        switch(selectedClient.activityLevel) {
                          case 'sedentary': return 'Hareketsiz';
                          case 'light': return 'Hafif Aktif';
                          case 'moderate': return 'Orta Aktif';
                          case 'active': return 'Aktif';
                          case 'very_active': return 'Çok Aktif';
                          default: return '-';
                        }
                      })()}
                    </div>
                  </div>
                </div>
                
                {/* Sağlık Bilgileri */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mt-3">
                  <h3 className="text-md font-medium mb-3">Sağlık Bilgileri</h3>
                  
                  <div className="mb-3">
                    <div className="text-gray-500 dark:text-gray-400 mb-1">Tıbbi Geçmiş:</div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-md text-gray-700 dark:text-gray-300">
                      {selectedClient.medicalHistory || "Bilgi yok"}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 mb-1">Diyet Kısıtlamaları:</div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-md text-gray-700 dark:text-gray-300">
                      {selectedClient.dietaryRestrictions || "Bilgi yok"}
                    </div>
                  </div>
                </div>
                
                {/* Notlar */}
                {selectedClient.notes && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-md font-medium mb-3">Notlar</h3>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-md text-gray-700 dark:text-gray-300">
                      {selectedClient.notes}
                    </div>
                  </div>
                )}
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
            {selectedClient && (
              <>
                <Button
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setShowViewDialog(false);
                    handleEditClient(selectedClient);
                  }}
                >
                  <i className="fas fa-edit mr-2"></i> Düzenle
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setShowViewDialog(false);
                    handleDeleteClient(selectedClient._id);
                  }}
                >
                  <i className="fas fa-trash-alt mr-2"></i> Sil
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
