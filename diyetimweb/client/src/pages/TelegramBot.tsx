import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { toast } from 'react-hot-toast';

// Telegram settings form schema
const telegramSettingsSchema = z.object({
  telegramToken: z.string().min(1, "Telegram Bot Token gereklidir"),
  isActive: z.boolean().default(true),
});

// Message template form schema
const messageTemplateSchema = z.object({
  name: z.string().min(3, "Şablon adı en az 3 karakter olmalıdır"),
  content: z.string().min(10, "Mesaj içeriği en az 10 karakter olmalıdır"),
});

type TelegramSettingsValues = z.infer<typeof telegramSettingsSchema>;
type MessageTemplateValues = z.infer<typeof messageTemplateSchema>;

// Template data type
interface MessageTemplate {
  id: number;
  name: string;
  content: string;
}

// Message history item type
interface MessageHistoryItem {
  id: number;
  clientName: string;
  clientId: string;
  message: string;
  date: string;
  status: "sent" | "failed" | "pending";
}

// Add Client interface
interface Client {
  _id: string;
  name: string;
  profilePicture?: string;
  gender?: string;
  telegramChatId?: string;
  email?: string;
  status?: string;
  referenceCode?: string;
}

export default function TelegramBot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("settings");
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [allClientsSelected, setAllClientsSelected] = useState(false);
  const [messageHistory, setMessageHistory] = useState<MessageHistoryItem[]>([]);

  // Default templates
  const [templates, setTemplates] = useState<MessageTemplate[]>([
    { id: 1, name: "Hoş Geldiniz", content: "Merhaba {{AD_SOYAD}}! Dietçim uygulamasına hoş geldiniz. Sizin için kişiselleştirilmiş diyet planınızı oluşturduk. Herhangi bir sorunuz olursa lütfen bize ulaşın." },
    { id: 2, name: "Ölçüm Hatırlatma", content: "Merhaba {{AD_SOYAD}}! Haftalık ölçümlerinizi yapma zamanı geldi. Lütfen ölçümlerinizi yapıp sonuçları bize iletebilir misiniz?" },
    { id: 3, name: "Randevu Hatırlatma", content: "Merhaba {{AD_SOYAD}}! Yarın saat {{SAAT}}'da randevunuz bulunmaktadır. Hatırlatmak isteriz." }
  ]);

  // Fetch clients from API
  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Danışan listesi alınamadı');
      return response.json();
    }
  });

  // Fetch user data for Telegram settings
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

  // Fetch activity data for message history
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['/api/activities', { type: 'telegram' }],
    queryFn: async () => {
      const response = await fetch('/api/activities?type=telegram&limit=20', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Aktivite geçmişi alınamadı');
      return response.json();
    }
  });

  // Update message history based on activities
  useEffect(() => {
    if (activities && activities.activities) {
      const newHistory: MessageHistoryItem[] = activities.activities.map((activity: any, index: number) => {
        const description = activity.description;
        const clientMatch = description.match(/(\d+) danışana Telegram mesajı gönderildi/);
        const clientCount = clientMatch ? parseInt(clientMatch[1]) : 1;

        return {
          id: index,
          clientName: clientCount > 1 ? `${clientCount} danışan` : "Danışan",
          clientId: "multiple",
          message: description,
          date: activity.createdAt,
          status: "sent"
        };
      });

      setMessageHistory(newHistory);
    }
  }, [activities]);

  // Initialize settings form with user data
  const settingsForm = useForm<TelegramSettingsValues>({
    resolver: zodResolver(telegramSettingsSchema),
    defaultValues: {
      telegramToken: "",
      isActive: true,
    },
  });

  // Update form values when user data is loaded
  useEffect(() => {
    if (userData && userData.telegramToken) {
      settingsForm.setValue('telegramToken', userData.telegramToken);
    }
  }, [userData, settingsForm]);

  // Bot durumu için hesaplanmış değer
  const isBotActive = userData?.telegramToken ? true : false;

  // Seçilen sekmeye göre otomatik bot durum kontrolü
  useEffect(() => {
    if (activeTab === "messages" && !isBotActive) {
      toast.error("Bot aktif değil. Lütfen önce 'Bot Ayarları' sekmesinden botu başlatın.", {
        duration: 5000,
        id: "bot-inactive-warning"
      });
    }
  }, [activeTab, isBotActive]);

  // Template form
  const templateForm = useForm<MessageTemplateValues>({
    resolver: zodResolver(messageTemplateSchema),
    defaultValues: {
      name: "",
      content: "",
    },
  });

  // Message form with selected template
  const messageForm = useForm({
    defaultValues: {
      message: selectedTemplate?.content || "",
    },
  });

  // Update template form when selecting a template
  useEffect(() => {
    if (selectedTemplate) {
      templateForm.reset({
        name: selectedTemplate.name,
        content: selectedTemplate.content,
      });
    } else {
      templateForm.reset({
        name: "",
        content: "",
      });
    }
  }, [selectedTemplate, templateForm]);

  // Update message form when selecting a template
  useEffect(() => {
    if (selectedTemplate) {
      messageForm.setValue("message", selectedTemplate.content);
    } else {
      messageForm.setValue("message", "");
    }
  }, [selectedTemplate, messageForm]);

  // Initialize Telegram bot mutation
  const initializeBotMutation = useMutation({
    mutationFn: async (data: TelegramSettingsValues) => {
      const response = await apiRequest("POST", "/api/telegram/initialize", {
        token: data.telegramToken
      });
      return response.json();
    },
    onSuccess: () => {
      toast.success("Bot başarıyla başlatıldı ve mesaj göndermeye hazır.");
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: Error) => {
      toast.error(`Bot başlatılırken bir hata oluştu: ${error.message}`);
    }
  });

  // Stop Telegram bot mutation
  const stopBotMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/telegram/stop", {});
      return response.json();
    },
    onSuccess: () => {
      toast.success("Telegram botu durduruldu. Mesaj gönderemezsiniz.");
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: Error) => {
      toast.error(`Bot durdurulurken bir hata oluştu: ${error.message}`);
    }
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: MessageTemplateValues) => {
      let updatedTemplates;
      if (selectedTemplate) {
        updatedTemplates = templates.map(t => 
          t.id === selectedTemplate.id 
            ? { ...t, name: data.name, content: data.content }
            : t
        );
      } else {
        const newId = templates.length > 0 
          ? Math.max(...templates.map(t => t.id)) + 1 
          : 1;
        updatedTemplates = [...templates, { 
          id: newId, 
          name: data.name, 
          content: data.content 
        }];
      }
      setTemplates(updatedTemplates);
      return { success: true };
    },
    onSuccess: () => {
      if (selectedTemplate) {
        toast.success("Mesaj şablonu başarıyla güncellendi.");
      } else {
        toast.success("Yeni mesaj şablonu başarıyla oluşturuldu.");
      }
      setSelectedTemplate(null);
      templateForm.reset();
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const updatedTemplates = templates.filter(t => t.id !== id);
      setTemplates(updatedTemplates);
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Mesaj şablonu başarıyla silindi.");
      setSelectedTemplate(null);
      templateForm.reset();
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { clientIds: string[], message: string }) => {
      const response = await apiRequest("POST", "/api/telegram/send-message", data);
      return response.json();
    },
    onSuccess: (data) => {
      const { success, failed, error } = data;
      
      // Eğer bir hata mesajı varsa göster
      if (error) {
        toast.error(error);
        return;
      }
      
      let resultMessage = `${success.length} danışana mesaj başarıyla gönderildi.`;
      if (failed && failed.length > 0) {
        resultMessage += ` ${failed.length} danışana gönderilemedi.`;
      }
      
      toast.success(resultMessage);
      queryClient.invalidateQueries({ queryKey: ['/api/activities', { type: 'telegram' }] });
      
      messageForm.reset();
      setSelectedClients([]);
      setAllClientsSelected(false);
    },
    onError: (error: Error) => {
      toast.error(`Mesaj gönderilirken hata: ${error.message}`);
    }
  });

  // Referans kodu oluşturma mutation'ı
  const generateReferenceMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/telegram-reference`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Referans Kodu: ${data.referenceCode} - Bot: @${data.botName}`);
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
    },
    onError: (error: Error) => {
      toast.error(`Referans kodu oluşturulurken hata: ${error.message}`);
    }
  });

  // Handle settings form submission
  function onSubmitSettings(values: TelegramSettingsValues) {
    initializeBotMutation.mutate(values);
  }

  // Handle template form submission
  function onSubmitTemplate(values: MessageTemplateValues) {
    saveTemplateMutation.mutate(values);
  }

  // Handle message form submission
  function onSubmitMessage(values: { message: string }) {
    if (selectedClients.length === 0) {
      toast.error("Lütfen en az bir danışan seçin.");
      return;
    }

    if (!values.message) {
      toast.error("Mesaj içeriği boş olamaz.");
      return;
    }

    if (!isBotActive) {
      toast.error("Bot aktif değil. Lütfen önce 'Bot Ayarları' sekmesinden botu başlatın.");
      setActiveTab("settings");
      return;
    }

    sendMessageMutation.mutate({
      clientIds: selectedClients,
      message: values.message
    });
  }

  // Toggle client selection
  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Toggle all clients selection
  const toggleAllClients = () => {
    if (allClientsSelected) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients?.map((client: Client) => client._id) || []);
    }
    setAllClientsSelected(!allClientsSelected);
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Telegram Bot</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Telegram botu ile danışanlarınıza otomatik mesajlar gönderin.
        </p>
      </div>

      <Tabs defaultValue="settings" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="settings">Bot Ayarları</TabsTrigger>
          <TabsTrigger value="templates">Mesaj Şablonları</TabsTrigger>
          <TabsTrigger value="messages">Mesaj Gönder</TabsTrigger>
          <TabsTrigger value="history">Mesaj Geçmişi</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Telegram Bot Ayarları</CardTitle>
              <CardDescription>
                Telegram Bot API entegrasyonu için gerekli ayarları yapılandırın.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)} className="space-y-6">
                  <FormField
                    control={settingsForm.control}
                    name="telegramToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telegram Bot Token</FormLabel>
                        <FormControl>
                          <Input placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" {...field} />
                        </FormControl>
                        <FormDescription>
                          BotFather'dan aldığınız bot token'ını girin. 
                          <a 
                            href="https://core.telegram.org/bots#creating-a-new-bot" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline ml-1"
                          >
                            Nasıl oluşturulur?
                          </a>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={settingsForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Telegram Bot Durumu</FormLabel>
                          <FormDescription>
                            Telegram entegrasyonunu etkinleştir veya devre dışı bırak.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                      <i className="fas fa-info-circle mr-2"></i>
                      Kullanım Talimatları
                    </h4>
                    <ol className="list-decimal pl-5 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>BotFather'dan bir Telegram botu oluşturun</li>
                      <li>Aldığınız token'ı yukarıdaki alana yapıştırın</li>
                      <li>"Mesaj Gönder" sekmesinden her danışan için referans kodu oluşturun</li>
                      <li>Danışanlarınızdan botu bulup "/start REFERANS_KODU" ile başlatmalarını isteyin</li>
                      <li>Danışanlar botla eşleştiğinde profilleri yanında "Bot Bağlı" rozeti görünür</li>
                      <li>"Mesaj Gönder" sekmesinden toplu veya bireysel mesajlar gönderin</li>
                    </ol>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button 
                      type="submit" 
                      className="w-auto"
                      disabled={initializeBotMutation.isPending}
                    >
                      {initializeBotMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i> Başlatılıyor...
                        </>
                      ) : (
                        "Botu Başlat"
                      )}
                    </Button>
                    
                    {userData?.telegramToken && (
                      <Button 
                        type="button" 
                        variant="destructive"
                        className="w-auto"
                        disabled={stopBotMutation.isPending}
                        onClick={() => stopBotMutation.mutate()}
                      >
                        {stopBotMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i> Durduruluyor...
                          </>
                        ) : (
                          "Botu Durdur"
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Şablonlar</CardTitle>
                  <CardDescription>
                    Sık kullanılan mesajlar için şablonlar oluşturun.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-full flex flex-col">
                  <div className="space-y-2 flex-grow overflow-auto">
                    {templates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <i className="far fa-file-alt text-3xl mb-2"></i>
                        <p>Henüz şablon oluşturulmamış.</p>
                      </div>
                    ) : (
                      templates.map(template => (
                        <div 
                          key={template.id}
                          className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            selectedTemplate?.id === template.id ? 'bg-primary/10 border-primary' : ''
                          }`}
                          onClick={() => setSelectedTemplate(template)}
                        >
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                            {template.content}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <Button 
                    className="w-full mt-4"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    <i className="fas fa-plus mr-2"></i> Yeni Şablon
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedTemplate ? `Şablonu Düzenle: ${selectedTemplate.name}` : "Yeni Şablon Oluştur"}
                  </CardTitle>
                  <CardDescription>
                    Telegram mesajları için şablon oluşturun veya düzenleyin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...templateForm}>
                    <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-6">
                      <FormField
                        control={templateForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Şablon Adı</FormLabel>
                            <FormControl>
                              <Input placeholder="Şablon adı" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={templateForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mesaj İçeriği</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Mesaj içeriği..." 
                                className="min-h-[200px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Kişiselleştirme için şu değişkenleri kullanabilirsiniz: 
                              <code className="ml-1 text-primary">{'{{AD_SOYAD}}, {{SAAT}}, {{TARİH}}'}</code>
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex gap-3">
                        <Button 
                          type="submit" 
                          disabled={saveTemplateMutation.isPending}
                        >
                          {saveTemplateMutation.isPending ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i> Kaydediliyor...
                            </>
                          ) : (
                            selectedTemplate ? "Şablonu Güncelle" : "Şablonu Kaydet"
                          )}
                        </Button>
                        
                        {selectedTemplate && (
                          <Button 
                            type="button" 
                            variant="destructive"
                            disabled={deleteTemplateMutation.isPending}
                            onClick={() => deleteTemplateMutation.mutate(selectedTemplate.id)}
                          >
                            {deleteTemplateMutation.isPending ? (
                              <>
                                <i className="fas fa-spinner fa-spin mr-2"></i> Siliniyor...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-trash mr-2"></i> Sil
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="messages">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Danışan Seçimi</CardTitle>
                  <CardDescription>
                    Mesaj göndermek istediğiniz danışanları seçin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {clientsLoading ? (
                    <div className="flex justify-center py-8">
                      <i className="fas fa-spinner fa-spin text-primary text-xl"></i>
                    </div>
                  ) : clients && clients.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="selectAll"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={allClientsSelected}
                          onChange={toggleAllClients}
                        />
                        <label htmlFor="selectAll" className="text-sm font-medium">
                          Tümünü Seç ({clients.length} danışan)
                        </label>
                      </div>
                      
                      <div className="border-t pt-4 max-h-[400px] overflow-y-auto">
                        {clients.map((client: Client) => (
                          <div key={client._id} className="flex flex-col space-y-1 mb-3 border-b pb-3">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`client-${client._id}`}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={selectedClients.includes(client._id)}
                                onChange={() => toggleClientSelection(client._id)}
                              />
                              <label htmlFor={`client-${client._id}`} className="flex items-center text-sm">
                                <div className="h-8 w-8 mr-2 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
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
                                {client.name}
                                {client.telegramChatId && (
                                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                    <i className="fas fa-check text-xs mr-1"></i> Bot Bağlı
                                  </Badge>
                                )}
                              </label>
                            </div>
                            
                            {/* Referans kodu bölümü */}
                            <div className="pl-7 flex items-center justify-between">
                              {client.referenceCode ? (
                                <div className="text-xs flex items-center bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                                  <span className="text-gray-500 dark:text-gray-400 mr-1">Kod:</span> 
                                  <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{client.referenceCode}</code>
                                </div>
                              ) : (
                                <div></div>
                              )}
                              
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs h-7 hover:bg-primary/10"
                                onClick={() => generateReferenceMutation.mutate(client._id)}
                                disabled={generateReferenceMutation.isPending}
                              >
                                {generateReferenceMutation.isPending ? (
                                  <i className="fas fa-spinner fa-spin mr-1"></i>
                                ) : (
                                  <i className="fas fa-sync-alt mr-1"></i>
                                )}
                                {client.referenceCode ? "Yenile" : "Kod Oluştur"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
                        {selectedClients.length} danışan seçildi
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <i className="fas fa-users text-3xl mb-2"></i>
                      <p>Henüz danışan eklenmemiş.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Mesaj Gönder</CardTitle>
                  <CardDescription>
                    Seçilen danışanlara Telegram üzerinden mesaj gönderin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Bot durum göstergesi */}
                  <div className={`mb-4 p-3 rounded-lg border ${isBotActive 
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${isBotActive 
                        ? 'bg-green-500 dark:bg-green-400' 
                        : 'bg-red-500 dark:bg-red-400'}`}></div>
                      <span className={`text-sm font-medium ${isBotActive 
                        ? 'text-green-700 dark:text-green-400' 
                        : 'text-red-700 dark:text-red-400'}`}>
                        {isBotActive 
                          ? 'Bot Aktif - Mesaj göndermeye hazır' 
                          : 'Bot Devre Dışı - Mesaj gönderilemez'}
                      </span>
                      {!isBotActive && (
                        <Button 
                          type="button" 
                          variant="link" 
                          size="sm" 
                          className="ml-auto text-red-600 dark:text-red-400"
                          onClick={() => setActiveTab("settings")}
                        >
                          Bot Ayarlarına Git
                        </Button>
                      )}
                    </div>
                  </div>

                  <form onSubmit={messageForm.handleSubmit(onSubmitMessage)} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-1">Şablon Seç</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={selectedTemplate?.id || ""}
                        onChange={(e) => {
                          const templateId = parseInt(e.target.value);
                          const template = templates.find(t => t.id === templateId) || null;
                          setSelectedTemplate(template);
                        }}
                      >
                        <option value="">Şablon seçin...</option>
                        {templates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Mesaj İçeriği</label>
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[200px]"
                        placeholder="Mesaj içeriği..."
                        {...messageForm.register("message")}
                      ></textarea>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Kişiselleştirme için şu değişkenleri kullanabilirsiniz: 
                        <code className="ml-1 text-primary">{'{{AD_SOYAD}}, {{SAAT}}, {{TARİH}}'}</code>
                      </p>
                    </div>
                    
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg space-y-3">
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                        <i className="fas fa-exclamation-triangle mr-2"></i>
                        Önemli Hatırlatmalar
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Mesaj göndermek için danışanların Telegram botunuzu başlatmış olması gerekir.
                        Danışanlar botunuzu başlatmadıysa mesajlar iletilemez.
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Danışanlar botla eşleşmek için <strong>referans kodlarını</strong> kullanmalıdır.
                        Her danışana özel bir referans kodu oluşturun ve botunuzu <code>/start REFERANS_KODU</code> 
                        şeklinde başlatmalarını sağlayın. Sadece <code>/start</code> kullanarak başlatmak yeterli olmaz.
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 font-semibold">
                        <i className="fas fa-info-circle mr-1"></i> Mesaj göndermeden önce "Bot Ayarları" sekmesinden botu başlattığınızdan emin olun. Bot durdurulduysa mesaj gönderemezsiniz.
                      </p>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full md:w-auto"
                      disabled={sendMessageMutation.isPending || selectedClients.length === 0 || !userData?.telegramToken}
                    >
                      {sendMessageMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i> Gönderiliyor...
                        </>
                      ) : !userData?.telegramToken ? (
                        <>
                          <i className="fas fa-exclamation-circle mr-2"></i> Bot Ayarları Gerekli
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane mr-2"></i>
                          {selectedClients.length 
                            ? `${selectedClients.length} Danışana Mesaj Gönder` 
                            : "Danışan Seçilmedi"}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Mesaj Geçmişi</CardTitle>
              <CardDescription>
                Gönderilen tüm Telegram mesajlarının kaydı.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="flex justify-center py-8">
                  <i className="fas fa-spinner fa-spin text-primary text-xl"></i>
                </div>
              ) : messageHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <i className="far fa-comment-dots text-5xl mb-3"></i>
                  <p>Henüz gönderilmiş mesaj bulunmuyor.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarih</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlem</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {messageHistory.map((message) => (
                        <tr key={message.id}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {new Date(message.date).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                            {message.message}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            {message.status === 'sent' && (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <i className="fas fa-check mr-1"></i> Gönderildi
                              </span>
                            )}
                            {message.status === 'failed' && (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                <i className="fas fa-times mr-1"></i> Başarısız
                              </span>
                            )}
                            {message.status === 'pending' && (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                <i className="fas fa-clock mr-1"></i> Beklemede
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
