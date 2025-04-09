import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ActivityFeed } from "@/components/ActivityFeed";
import { getTimeSince } from "@/utils/formatDate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface Activity {
  _id: string;
  userId: string;
  type: string;
  description: string;
  createdAt: Date;
}

const Activities: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [activityType, setActivityType] = useState<string>("all");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"selected" | "all">("selected");
  const [viewMode, setViewMode] = useState<"table" | "feed">("table");
  
  // Fetch activities with pagination and filters
  const {
    data: activitiesResponse,
    isLoading: activitiesLoading,
    refetch
  } = useQuery({
    queryKey: ['/api/activities', page, limit, searchTerm, activityType],
    queryFn: async () => {
      let url = `/api/activities?page=${page}&limit=${limit}`;
      
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      if (activityType && activityType !== "all") {
        url += `&type=${encodeURIComponent(activityType)}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Aktivite verisi alınamadı');
      
      return response.json() as Promise<{
        activities: Activity[];
        totalCount: number;
        totalPages: number;
      }>;
    }
  });

  // Delete activities mutation
  const deleteActivitiesMutation = useMutation({
    mutationFn: async ({ ids, deleteAll }: { ids?: string[], deleteAll?: boolean }) => {
      return apiRequest("DELETE", "/api/activities", {
        ids,
        deleteAll,
        type: activityType !== "all" ? activityType : undefined,
        search: searchTerm || undefined
      });
    },
    onSuccess: () => {
      toast.success(deleteMode === "selected" 
        ? "Seçili aktiviteler silindi" 
        : "Tüm aktiviteler silindi");
      setSelectedActivities([]);
      setSelectAll(false);
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
    onError: (error: any) => {
      toast.error(`Silme işlemi başarısız: ${error.message || "Bilinmeyen hata"}`);
    },
  });

  // Prepare activities with display data
  const formattedActivities = React.useMemo(() => {
    if (!activitiesResponse?.activities) return [];
    
    return activitiesResponse.activities.map(activity => {
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
  }, [activitiesResponse]);

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to first page on new search
  };

  // Handle activity type filter change
  const handleTypeChange = (value: string) => {
    setActivityType(value);
    setPage(1); // Reset to first page on new filter
  };

  // Handle page changes
  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > (activitiesResponse?.totalPages || 1)) return;
    setPage(newPage);
  };

  // Apply filters
  const applyFilters = () => {
    setPage(1); // Reset to first page
    refetch();
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setActivityType("all");
    setPage(1);
  };

  // Toggle selection of an activity
  const toggleActivitySelection = (activityId: string) => {
    setSelectedActivities(prev => {
      if (prev.includes(activityId)) {
        return prev.filter(id => id !== activityId);
      } else {
        return [...prev, activityId];
      }
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedActivities([]);
    } else {
      if (activitiesResponse?.activities) {
        setSelectedActivities(activitiesResponse.activities.map(activity => activity._id));
      }
    }
    setSelectAll(!selectAll);
  };

  // Handle delete button click
  const handleDeleteClick = (mode: "selected" | "all") => {
    setDeleteMode(mode);
    setIsDeleteDialogOpen(true);
  };

  // Confirm deletion
  const confirmDelete = () => {
    if (deleteMode === "selected") {
      if (selectedActivities.length === 0) {
        toast.error("Lütfen silinecek aktiviteleri seçin");
        return;
      }
      deleteActivitiesMutation.mutate({ ids: selectedActivities });
    } else {
      deleteActivitiesMutation.mutate({ deleteAll: true });
    }
    setIsDeleteDialogOpen(false);
  };

  // Get the type label for display
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'diet_plan': return 'Diyet Planı';
      case 'measurement': return 'Ölçüm';
      case 'appointment': return 'Randevu';
      case 'telegram': return 'Telegram';
      case 'client': return 'Danışan';
      default: return type;
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Aktiviteler</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sistemdeki tüm işlemler ve değişiklikler.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Arama</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-search text-gray-400"></i>
                </div>
                <Input
                  type="text"
                  placeholder="Aktivite ara..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Aktivite Tipi</label>
              <Select 
                value={activityType} 
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tüm Aktiviteler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Aktiviteler</SelectItem>
                  <SelectItem value="diet_plan">Diyet Planları</SelectItem>
                  <SelectItem value="measurement">Ölçümler</SelectItem>
                  <SelectItem value="appointment">Randevular</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="client">Danışanlar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end space-x-2">
              <Button onClick={applyFilters} className="flex-1">
                <i className="fas fa-filter mr-2"></i> Uygula
              </Button>
              <Button 
                onClick={clearFilters} 
                variant="outline" 
                className="flex-1"
              >
                <i className="fas fa-times mr-2"></i> Temizle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setViewMode("table")}
            className={viewMode === "table" ? "bg-primary/10" : ""}
          >
            <i className="fas fa-table mr-2"></i> Tablo
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setViewMode("feed")}
            className={viewMode === "feed" ? "bg-primary/10" : ""}
          >
            <i className="fas fa-stream mr-2"></i> Akış
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => handleDeleteClick("selected")}
            disabled={selectedActivities.length === 0}
          >
            <i className="fas fa-trash-alt mr-2"></i> Seçilenleri Sil
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => handleDeleteClick("all")}
          >
            <i className="fas fa-trash mr-2"></i> Tümünü Sil
          </Button>
        </div>
      </div>

      {/* Activities List */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle>Aktiviteler</CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === "feed" ? (
            <ActivityFeed 
              activities={formattedActivities}
              loading={activitiesLoading}
            />
          ) : (
            // Table View
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-36">Tarih</TableHead>
                    <TableHead className="w-32">Tip</TableHead>
                    <TableHead>Açıklama</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activitiesLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Aktiviteler yükleniyor...</p>
                      </TableCell>
                    </TableRow>
                  ) : formattedActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10">
                        <p className="text-muted-foreground">Hiç aktivite bulunamadı.</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Danışan eklemek, ölçüm kaydetmek veya diyet planı oluşturmak gibi işlemler yaptığınızda burada görünecektir.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    formattedActivities.map((activity) => (
                      <TableRow key={activity._id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedActivities.includes(activity._id)}
                            onCheckedChange={() => toggleActivitySelection(activity._id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Date(activity.createdAt).toLocaleDateString('tr-TR')}
                          <div className="text-xs text-muted-foreground">
                            {new Date(activity.createdAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.iconBg}`}>
                              <i className={`${activity.icon} ${activity.iconColor}`}></i>
                            </div>
                            <span>{getTypeLabel(activity.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{activity.description}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {activitiesResponse && activitiesResponse.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Toplam {activitiesResponse.totalCount} aktivite, 
                Sayfa {page}/{activitiesResponse.totalPages}
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => goToPage(page - 1)} 
                  disabled={page === 1 || activitiesLoading}
                  variant="outline"
                  size="sm"
                >
                  <i className="fas fa-chevron-left mr-2"></i> Önceki
                </Button>
                
                {/* Page numbers */}
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, activitiesResponse.totalPages) }, (_, i) => {
                    let pageNum;
                    if (activitiesResponse.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= activitiesResponse.totalPages - 2) {
                      pageNum = activitiesResponse.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button 
                  onClick={() => goToPage(page + 1)} 
                  disabled={page === activitiesResponse.totalPages || activitiesLoading}
                  variant="outline"
                  size="sm"
                >
                  Sonraki <i className="fas fa-chevron-right ml-2"></i>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteMode === "selected" 
                ? "Seçili aktiviteleri sil" 
                : "Tüm aktiviteleri sil"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "selected" 
                ? `${selectedActivities.length} aktiviteyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.` 
                : "Tüm aktiviteleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Activities; 