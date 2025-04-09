import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardDescription,  
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { toast } from "react-hot-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Camera, CheckCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Profil form şeması
const profileFormSchema = z.object({
  name: z.string().min(3, "Ad Soyad en az 3 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  profilePicture: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
});

// Şifre form şeması
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre gerekli"),
  newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalıdır"),
  confirmPassword: z.string().min(6, "Şifre onayı en az 6 karakter olmalıdır"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function Settings() {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Kullanıcı verilerini çek
  const { data: userData, isLoading: userDataLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Kullanıcı bilgileri alınamadı');
      return response.json();
    }
  });

  // Profil formu
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      profilePicture: "",
      bio: "",
      phone: "",
    },
  });

  // Şifre formu
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Kullanıcı verisi geldiğinde form alanlarını doldur
  useEffect(() => {
    if (userData) {
      profileForm.reset({
        name: userData.name || "",
        email: userData.email || "",
        profilePicture: userData.profilePicture || "",
        bio: userData.bio || "",
        phone: userData.phone || "",
      });
    }
  }, [userData, profileForm]);

  // Profil güncelleme mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      try {
        // Sadece değişmiş profil verilerini gönder
        const profileUpdateData: Partial<ProfileFormValues> = {};
        if (data.name !== userData?.name) profileUpdateData.name = data.name;
        if (data.email !== userData?.email) profileUpdateData.email = data.email;
        if (data.bio !== userData?.bio) profileUpdateData.bio = data.bio;
        if (data.phone !== userData?.phone) profileUpdateData.phone = data.phone;
        if (data.profilePicture !== userData?.profilePicture) profileUpdateData.profilePicture = data.profilePicture;
        
        // Hiçbir veri değişmemişse işlemi iptal et
        if (Object.keys(profileUpdateData).length === 0) {
          toast.success('Değiştirilecek bilgi bulunmadı.');
          return;
        }
        
        // API isteği gönder
        const response = await apiRequest("PUT", `/api/auth/profile`, profileUpdateData);
        const responseData = await response.json();
        return responseData;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
        toast.error(`Profil güncellenirken bir hata oluştu: ${errorMessage}`);
      }
    },
    onSuccess: (data) => {
      toast.success("Profil bilgileri başarıyla güncellendi");
      
      // Önbelleği tamamen temizle ve yeni verileri çek
      queryClient.resetQueries({ queryKey: ['/api/auth/me'] });
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/auth/me'] });
      }, 100);
    },
    onError: (error: any) => {
      toast.error(`Profil güncellenirken bir hata oluştu: ${error?.message || "Bilinmeyen bir hata oluştu"}`);
    }
  });

  // Şifre değiştirme mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string, newPassword: string }) => {
      try {
        const response = await apiRequest("PUT", `/api/auth/password`, data);
        const responseData = await response.json();
        return responseData;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
        toast.error(`Şifre değiştirilirken bir hata oluştu: ${errorMessage}`);
      }
    },
    onSuccess: () => {
      passwordForm.reset();
      toast.success("Şifreniz başarıyla değiştirildi");
    },
    onError: (error: any) => {
      toast.error(`Şifre değiştirilirken bir hata oluştu: ${error?.message || "Bilinmeyen bir hata oluştu"}`);
    }
  });

  // Profil fotoğrafı yükleme işlevi
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Desteklenen resim formatları
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Lütfen geçerli bir resim formatı yükleyin (JPEG, PNG, WebP)");
      return;
    }

    const uploadToastId = 'uploading-image';
    try {
      setUploading(true);
      toast.loading('Profil fotoğrafı yükleniyor...', { id: uploadToastId });
      
      // Sadece resim dosyaları için izin ver
      if (!file.type.startsWith('image/')) {
        throw new Error('Lütfen sadece resim dosyası yükleyin');
      }
      
      // Dosya boyutu kontrolü (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Dosya boyutu 10MB\'tan küçük olmalıdır');
      }
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'profile_pictures'); // Profil resimleri için özel klasör
      
      // Token'ı al
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }
      
      // Backend API'ye isteği gönder
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Yanıtı işle
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Yükleme başarısız: HTTP ${response.status}`);
        } else {
          const text = await response.text();
          const truncatedText = text.length > 100 ? text.substring(0, 100) + '...' : text;
          throw new Error(`Yükleme başarısız: HTTP ${response.status} (${truncatedText})`);
        }
      }
      
      // Başarılı yanıtı JSON olarak işle
      const data = await response.json();
      
      if (data.url) {
        // Önbelleği atlatmak için URL'e zaman damgası ekle
        const cacheBreaker = `?t=${Date.now()}`;
        const imageUrlWithTimestamp = `${data.url}${cacheBreaker}`;
        
        toast.dismiss(uploadToastId);
        toast.success("Profil fotoğrafı başarıyla yüklendi");
        
        // Form değerini güncelle
        profileForm.setValue('profilePicture', data.url); // Asıl URL'i kaydet
        
        // Profil bilgilerini güncelle
        const profileData = profileForm.getValues();
        
        try {
          await updateProfileMutation.mutateAsync(profileData);
          
          // Güncelleme başarılı olduğunda, önbelleği temizleyip yeniden yükle
          await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
          await queryClient.refetchQueries({ queryKey: ['/api/auth/me'] });
          
          // Yüklenen resmi sayfada göstermek için
          setImageRefreshKey(Date.now());
        } catch (profileError: unknown) {
          const errorMessage = profileError instanceof Error ? profileError.message : "Bilinmeyen bir hata oluştu";
          toast.error(`Profil resmi yüklendi fakat profil güncellenemedi: ${errorMessage}`);
        }
      } else {
        throw new Error('Resim yüklenemedi: Sunucu geçerli bir URL döndürmedi');
      }
    } catch (error: unknown) {
      toast.dismiss(uploadToastId);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
      toast.error(`Resim yüklenirken bir hata oluştu: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  // Profil form gönderimi
  const handleProfileSubmit = async (values: ProfileFormValues) => {
    setIsProfileLoading(true);
    
    // Sadece değişmiş profil verilerini gönder
    const profileUpdateData: Partial<ProfileFormValues> = {};
    if (values.name !== userData?.name) profileUpdateData.name = values.name;
    if (values.email !== userData?.email) profileUpdateData.email = values.email;
    if (values.bio !== userData?.bio) profileUpdateData.bio = values.bio;
    if (values.phone !== userData?.phone) profileUpdateData.phone = values.phone;
    if (values.profilePicture !== userData?.profilePicture) profileUpdateData.profilePicture = values.profilePicture;
    
    // Hiçbir veri değişmemişse işlemi iptal et
    if (Object.keys(profileUpdateData).length === 0) {
      toast.success('Değiştirilecek bilgi bulunmadı.');
      setIsProfileLoading(false);
      return;
    }
    
    try {
      await updateProfileMutation.mutateAsync(values);
      
      toast.success('Profil bilgileri başarıyla güncellendi');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
      toast.error(`Profil güncellenirken bir hata oluştu: ${errorMessage}`);
    } finally {
      setIsProfileLoading(false);
    }
  };

  // Şifre form gönderimi
  function onSubmitPassword(values: PasswordFormValues) {
    const { currentPassword, newPassword } = values;
    changePasswordMutation.mutate({ currentPassword, newPassword });
  }

  if (userDataLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Hesap Ayarları</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Profil bilgilerinizi ve şifrenizi bu sayfadan yönetin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol Taraf - Profil Fotoğrafı ve Bilgiler */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Profil Fotoğrafı</CardTitle>
              <CardDescription>
                Danışanlarınızın sizi tanıyabileceği bir fotoğraf ekleyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-40 w-40">
                  {profileForm.watch("profilePicture") ? (
                    <AvatarImage 
                      src={`${profileForm.watch("profilePicture")}?t=${imageRefreshKey}`} 
                      alt="Profil Resmi" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${userData?.name || 'U'}&size=128`;
                      }}
                    />
                  ) : (
                    <AvatarFallback className="text-2xl">
                      {userData?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="absolute bottom-1 right-1 rounded-full h-9 w-9"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                </Button>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept=".jpg,.jpeg,.png,.webp" 
                  className="hidden" 
                />
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold">{userData?.name}</h3>
                <p className="text-sm text-muted-foreground">{userData?.email}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg w-full">
                <h4 className="font-medium mb-2">Hesap Bilgileri</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Üyelik Tarihi:</span>
                    <span>
                      {userData?.createdAt 
                        ? new Date(userData.createdAt).toLocaleDateString('tr-TR') 
                        : 'Belirtilmemiş'}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Telefon:</span>
                    <span>{userData?.phone || 'Belirtilmemiş'}</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sağ Taraf - Form */}
        <div className="lg:col-span-2">
          {/* Profil Bilgileri Formu */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Profil Bilgileri</CardTitle>
              <CardDescription>
                Kişisel bilgilerinizi güncelleyin. Bu bilgiler danışanlarınız tarafından görülebilir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ad Soyad</FormLabel>
                        <FormControl>
                          <Input placeholder="Ad Soyad" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-posta</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="eposta@ornek.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input placeholder="+90 555 123 4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hakkımda</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Kendinizi kısaca tanıtın..." 
                            className="resize-none min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Bu bilgi danışan profillerinizde görünecektir.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto"
                    disabled={isProfileLoading}
                  >
                    {isProfileLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...
                      </>
                    ) : (
                      "Profili Kaydet"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Şifre Değiştirme Formu */}
          <Card>
            <CardHeader>
              <CardTitle>Şifre Değiştir</CardTitle>
              <CardDescription>
                Güvenliğiniz için şifrenizi düzenli olarak değiştirmenizi öneririz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-6">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mevcut Şifre</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yeni Şifre</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormDescription>
                          Şifreniz en az 6 karakter uzunluğunda olmalıdır.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şifre Tekrar</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Şifre Güvenliği</AlertTitle>
                    <AlertDescription>
                      Güçlü bir şifre seçin. Büyük-küçük harf, rakam ve özel karakter içeren şifreler daha güvenlidir.
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Değiştiriliyor...
                      </>
                    ) : (
                      "Şifreyi Değiştir"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
