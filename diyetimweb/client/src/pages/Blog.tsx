import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlogArticle } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Blog() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<BlogArticle | null>(null);

  // Fetch blog articles
  const { data: articles, isLoading } = useQuery({
    queryKey: ['/api/blog'],
    queryFn: async () => {
      const response = await fetch('/api/blog');
      if (!response.ok) throw new Error('Blog makaleleri alınamadı');
      return response.json() as Promise<BlogArticle[]>;
    }
  });

  // Sample categories - would come from API in real implementation
  const categories = [
    { id: "all", name: "Tümü" },
    { id: "nutrition", name: "Beslenme" },
    { id: "exercise", name: "Egzersiz" },
    { id: "wellness", name: "Sağlık" },
    { id: "weight-loss", name: "Kilo Verme" }
  ];

  // Filter articles based on search term and category
  const filteredArticles = React.useMemo(() => {
    if (!articles) return [];
    
    let filtered = articles;
    
    // Filter by search term
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(lowerCaseSearchTerm) || 
        article.summary.toLowerCase().includes(lowerCaseSearchTerm) ||
        article.author.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    
    // Filter by category (assuming we would have categories in real implementation)
    if (activeCategory !== "all") {
      // This is a placeholder for category filtering
      // In a real implementation, articles would have a category field
      filtered = filtered;
    }
    
    return filtered;
  }, [articles, searchTerm, activeCategory]);

  // Handle article selection for detailed view
  const handleArticleSelect = (article: BlogArticle) => {
    setSelectedArticle(article);
  };

  // Handle back button from detailed view
  const handleBackToList = () => {
    setSelectedArticle(null);
  };

  // Handle sharing an article
  const handleShareArticle = (article: BlogArticle) => {
    // This would implement actual sharing functionality in a real implementation
    toast({
      title: "Makale Paylaşıldı",
      description: "Makale paylaşım bağlantısı kopyalandı.",
    });
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Blog Makaleleri</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sağlık, beslenme ve diyet konularında güncel makaleler.
          </p>
        </div>
        
        {!selectedArticle && (
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <Input
                type="text"
                placeholder="Makalelerde ara..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {selectedArticle ? (
        <Card>
          <CardContent className="p-0">
            {selectedArticle.imageUrl && (
              <div className="relative h-72 w-full bg-gray-100 dark:bg-gray-800">
                <img 
                  src={selectedArticle.imageUrl} 
                  alt={selectedArticle.title} 
                  className="w-full h-full object-cover"
                />
                <button 
                  className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-full p-2 shadow-md"
                  onClick={handleBackToList}
                >
                  <i className="fas fa-arrow-left text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
            )}
            
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {selectedArticle.title}
              </h1>
              
              <div className="flex items-center mb-6">
                <div className="mr-4 text-gray-500 dark:text-gray-400 text-sm">
                  <i className="fas fa-user mr-1"></i> {selectedArticle.author}
                </div>
                <div className="mr-4 text-gray-500 dark:text-gray-400 text-sm">
                  <i className="fas fa-calendar-alt mr-1"></i> {new Date(selectedArticle.publishedAt).toLocaleDateString('tr-TR')}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  <i className="fas fa-clock mr-1"></i> {selectedArticle.readTime} dk okuma
                </div>
              </div>
              
              <div className="prose dark:prose-invert max-w-none mb-8">
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                  {selectedArticle.summary}
                </p>
                
                <div className="text-gray-600 dark:text-gray-400">
                  {/* This would display the actual content in a real implementation */}
                  <p>
                    Sağlıklı bir yaşam tarzını benimsemek, sadece fiziksel sağlığımız için değil, aynı zamanda zihinsel ve duygusal sağlığımız için de büyük önem taşır. Dengeli ve sağlıklı beslenme, düzenli fiziksel aktivite ve yeterli uyku, genel sağlığımızın temel taşlarıdır.
                  </p>
                  <h2 className="text-xl font-bold mt-6 mb-3 text-gray-800 dark:text-gray-200">
                    Dengeli Beslenmenin Önemi
                  </h2>
                  <p>
                    Vücudumuzun doğru şekilde çalışabilmesi için çeşitli besin gruplarından uygun miktarlarda tüketmemiz gerekir. Protein, karbonhidrat, sağlıklı yağlar, vitaminler ve mineraller, dengeli bir diyetin temel bileşenleridir.
                  </p>
                  <p>
                    Mevsiminde tüketilen sebze ve meyveler, hem besin değeri açısından daha zengindir hem de daha ekonomiktir. Ayrıca, işlenmiş gıdalardan uzak durmak ve ev yapımı yemekleri tercih etmek, sağlığımız açısından faydalıdır.
                  </p>
                  <h2 className="text-xl font-bold mt-6 mb-3 text-gray-800 dark:text-gray-200">
                    Fiziksel Aktivitenin Faydaları
                  </h2>
                  <p>
                    Düzenli fiziksel aktivite, kalp-damar sağlığını destekler, kas ve kemik gücünü artırır, kilo kontrolüne yardımcı olur ve stres seviyesini düşürür. Günde en az 30 dakika orta yoğunlukta egzersiz yapmak, genel sağlık için önerilir.
                  </p>
                  <p>
                    Yürüyüş, koşu, yüzme, bisiklet sürme veya dans gibi sevdiğiniz bir aktiviteyi seçerek, fiziksel aktiviteyi günlük rutininizin bir parçası haline getirebilirsiniz.
                  </p>
                  <h2 className="text-xl font-bold mt-6 mb-3 text-gray-800 dark:text-gray-200">
                    Sonuç
                  </h2>
                  <p>
                    Sağlıklı bir yaşam tarzı, küçük adımlarla başlar. Beslenme alışkanlıklarınızda ve fiziksel aktivite düzeyinizde yapacağınız küçük değişiklikler, zamanla büyük sağlık faydaları sağlayabilir. Unutmayın, sağlık bir yaşam boyu süren bir yolculuktur.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-center sm:justify-start space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => handleShareArticle(selectedArticle)}
                >
                  <i className="fas fa-share-alt mr-2"></i> Paylaş
                </Button>
                <Button onClick={handleBackToList}>
                  <i className="fas fa-arrow-left mr-2"></i> Tüm Makaleler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
            <TabsList className="flex w-full overflow-x-auto">
              {categories.map(category => (
                <TabsTrigger key={category.id} value={category.id}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg"></div>
                  <CardContent className="p-5">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
                    <div className="flex items-center mt-4">
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 mr-2"></div>
                      <div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {filteredArticles.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
                  <i className="far fa-newspaper text-gray-300 dark:text-gray-600 text-5xl mb-4"></i>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {searchTerm ? "Arama sonucu bulunamadı" : "Henüz makale yayınlanmamış"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {searchTerm
                      ? "Farklı bir arama terimi deneyin."
                      : "Yakında sağlık ve beslenme makaleleri burada olacak."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredArticles.map((article) => (
                    <Card 
                      key={article.id} 
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleArticleSelect(article)}
                    >
                      {article.imageUrl && (
                        <div className="h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <img 
                            src={article.imageUrl} 
                            alt={article.title} 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <CardContent className="p-5">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                          {article.summary}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {article.author}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(article.publishedAt).toLocaleDateString('tr-TR')} · {article.readTime} dk
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-gray-50 dark:bg-gray-800 border-t px-5 py-3">
                        <Button variant="ghost" size="sm" className="text-primary dark:text-primary-light ml-auto">
                          Devamını Oku <i className="fas fa-arrow-right ml-1"></i>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
