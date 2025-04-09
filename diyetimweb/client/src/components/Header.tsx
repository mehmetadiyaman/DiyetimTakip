import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import iconImg from "@/assets/images/Diyetcim Icon Original.png";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Dışarı tıklandığında sonuçları kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Danışanları getir
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setClients(data);
        }
      } catch (error) {
        console.error("Danışanlar getirilemedi:", error);
      }
    };
    
    fetchClients();
    
    // Component unmount olduğunda isLoading'i sıfırla
    return () => {
      setIsLoading(false);
    };
  }, []);
  
  // Arama terimini değiştirince filtreleme yap
  useEffect(() => {
    // Önceki timeout'u temizle
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (searchTerm.trim() === "") {
      setFilteredClients([]);
      setShowResults(false);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    // Anlık filtreleme için küçük bir gecikme
    searchTimeoutRef.current = setTimeout(() => {
      try {
        const filtered = clients.filter(client => {
          const searchLower = searchTerm.toLowerCase();
          const name = client.name?.toLowerCase() || client.fullName?.toLowerCase() || "";
          const email = client.email?.toLowerCase() || "";
          const phone = client.phone?.toLowerCase() || "";
          
          return name.includes(searchLower) || 
                 email.includes(searchLower) || 
                 phone.includes(searchLower);
        });
        
        setFilteredClients(filtered);
        setShowResults(true);
      } catch (error) {
        console.error("Filtreleme hatası:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, clients]);
  
  // Danışan seçildiğinde detay sayfasına yönlendir
  const handleClientSelect = (clientId: string) => {
    setShowResults(false);
    setSearchTerm("");
    setIsLoading(false);
    navigate(`/clients/${clientId}`);
  };
  
  return (
    <header className="bg-white dark:bg-[#1a2234] shadow-sm z-10 relative border-b border-gray-200 dark:border-[#2a3441]">
      <div className="flex justify-between items-center px-4 py-3 lg:px-6">
        <div className="flex items-center lg:hidden">
          <button 
            type="button" 
            className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-primary-light transition-colors duration-200"
            onClick={toggleSidebar}
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
          <div className="flex items-center ml-3">
            <img 
              src={iconImg} 
              alt="Diyetcim Icon" 
              className="h-8 w-8 mr-2 dark:brightness-110"
            />
            <h1 className="text-lg font-bold font-heading text-primary dark:text-primary-light">Diyetcim</h1>
          </div>
        </div>
        
        <div className="flex-1 mx-4 lg:mx-6 hidden lg:block" ref={searchRef}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {isLoading ? (
                <i className="fas fa-spinner fa-spin text-gray-400 dark:text-gray-500"></i>
              ) : (
                <i className="fas fa-search text-gray-400 dark:text-gray-500"></i>
              )}
            </div>
            <input
              type="search"
              placeholder="Danışan ara..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-[#2a3441] rounded-md bg-white dark:bg-[#141b28] placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light sm:text-sm transition-all duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (searchTerm.trim() !== "") {
                  setShowResults(true);
                }
              }}
            />
            
            {/* Arama Sonuçları Dropdown */}
            {showResults && (
              <div className="absolute mt-1 w-full bg-white dark:bg-[#1a2234] shadow-lg rounded-md border border-gray-200 dark:border-[#2a3441] z-10 max-h-80 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {isLoading ? 
                      <span>Aranıyor...</span> : 
                      <span>"{searchTerm}" ile eşleşen danışan bulunamadı</span>
                    }
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredClients.map((client) => (
                      <li 
                        key={client._id} 
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#141b28] cursor-pointer"
                        onClick={() => handleClientSelect(client._id)}
                      >
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 overflow-hidden flex-shrink-0 mr-3">
                            {client.profilePicture ? (
                              <img 
                                src={client.profilePicture} 
                                alt={client.name || client.fullName}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null;
                                  target.src = '';
                                  target.parentElement!.innerHTML = '<i class="fas fa-user text-primary/70 flex justify-center items-center h-full"></i>';
                                }}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <i className="fas fa-user text-primary/70"></i>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              {client.name || client.fullName || "İsimsiz Danışan"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {client.email}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center">
          <ThemeToggle />
          <div className="ml-4 relative">
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{user?.name || user?.fullName || "Kullanıcı"}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Diyetisyen</span>
              </div>
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-[#223422] overflow-hidden border-2 border-white dark:border-[#2a3441] shadow-sm">
                {user?.profileImage || user?.profilePicture ? (
                  <img 
                    src={user.profileImage || user.profilePicture} 
                    alt="Kullanıcı profil resmi" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <i className="fas fa-user text-gray-400 dark:text-primary-light"></i>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
