import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import logoImg from "@/assets/images/Diyetcim Logo - Original.png";

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Sayfa değiştirme ve yenileme fonksiyonu
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  return (
    <aside className="flex flex-col h-full w-64 border-r border-gray-200 dark:border-[#2a3441]/50 bg-white dark:bg-gradient-to-b dark:from-[#1e293b] dark:to-[#111827] shadow-sm dark:shadow-xl">
      <div className="px-4 py-5 border-b border-gray-200 dark:border-[#2a3441]/50 bg-white dark:bg-[#141b28]/80 backdrop-blur">
        <div className="flex flex-col items-center justify-center">
          <img 
            src={logoImg} 
            alt="Diyetcim Logo" 
            className="h-auto w-36 object-contain mb-2 dark:brightness-110 hover:scale-105 transition-transform duration-300" 
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Diyetisyen Müşteri Takip Uygulaması</p>
        </div>
      </div>
      
      <nav className="flex-1 py-5 px-4 bg-white/50 dark:bg-transparent overflow-hidden">
        {/* Scrollbar'ı gizli olan içerik alanı */}
        <div className="h-full overflow-y-auto pr-2 scrollbar-hide">
          <div className="space-y-8">
            {/* Ana Menü */}
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-3 px-2 tracking-wider flex items-center gap-2 after:content-[''] after:h-[1px] after:flex-1 after:ml-2 after:bg-gray-200 dark:after:bg-[#2a3441]/70">
                Ana Menü
              </h3>
              
              <div className="space-y-1">
                <a 
                  onClick={() => navigateTo("/")} 
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                    isActive("/") 
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-semibold shadow-sm border-l-4 border-primary dark:border-primary-light pl-2" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1e293b]/80 hover:text-primary dark:hover:text-primary-light hover:pl-4"
                  }`}
                >
                  <i className="fas fa-tachometer-alt w-5 h-5 mr-3 transition-transform duration-300 group-hover:scale-110"></i>
                  <span>Gösterge Paneli</span>
                </a>
                
                <a 
                  onClick={() => navigateTo("/clients")} 
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                    isActive("/clients") 
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-semibold shadow-sm border-l-4 border-primary dark:border-primary-light pl-2" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1e293b]/80 hover:text-primary dark:hover:text-primary-light hover:pl-4"
                  }`}
                >
                  <i className="fas fa-users w-5 h-5 mr-3"></i>
                  <span>Danışanlar</span>
                </a>
                
                <a 
                  onClick={() => navigateTo("/diet-plans")} 
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                    isActive("/diet-plans") 
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-semibold shadow-sm border-l-4 border-primary dark:border-primary-light pl-2" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1e293b]/80 hover:text-primary dark:hover:text-primary-light hover:pl-4"
                  }`}
                >
                  <i className="fas fa-utensils w-5 h-5 mr-3"></i>
                  <span>Diyet Planları</span>
                </a>
                
                <a 
                  onClick={() => navigateTo("/appointments")} 
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                    isActive("/appointments") 
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-semibold shadow-sm border-l-4 border-primary dark:border-primary-light pl-2" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1e293b]/80 hover:text-primary dark:hover:text-primary-light hover:pl-4"
                  }`}
                >
                  <i className="fas fa-calendar-alt w-5 h-5 mr-3"></i>
                  <span>Randevular</span>
                </a>
                
                <a 
                  onClick={() => navigateTo("/measurements")} 
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                    isActive("/measurements") 
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-semibold shadow-sm border-l-4 border-primary dark:border-primary-light pl-2" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1e293b]/80 hover:text-primary dark:hover:text-primary-light hover:pl-4"
                  }`}
                >
                  <i className="fas fa-weight w-5 h-5 mr-3"></i>
                  <span>Ölçümler</span>
                </a>
                
                <a 
                  onClick={() => navigateTo("/activities")} 
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                    isActive("/activities") 
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-semibold shadow-sm border-l-4 border-primary dark:border-primary-light pl-2" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1e293b]/80 hover:text-primary dark:hover:text-primary-light hover:pl-4"
                  }`}
                >
                  <i className="fas fa-history w-5 h-5 mr-3"></i>
                  <span>Aktiviteler</span>
                </a>
              </div>
            </div>
            
            {/* Entegrasyonlar */}
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-3 px-2 tracking-wider flex items-center gap-2 after:content-[''] after:h-[1px] after:flex-1 after:ml-2 after:bg-gray-200 dark:after:bg-[#2a3441]/70">
                Entegrasyonlar
              </h3>
              
              <div className="space-y-1">
                <a 
                  onClick={() => navigateTo("/telegram-bot")} 
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                    isActive("/telegram-bot") 
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-semibold shadow-sm border-l-4 border-primary dark:border-primary-light pl-2" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1e293b]/80 hover:text-primary dark:hover:text-primary-light hover:pl-4"
                  }`}
                >
                  <i className="fab fa-telegram w-5 h-5 mr-3"></i>
                  <span>Telegram Bot</span>
                </a>
              </div>
            </div>
            
            {/* Ayarlar */}
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-3 px-2 tracking-wider flex items-center gap-2 after:content-[''] after:h-[1px] after:flex-1 after:ml-2 after:bg-gray-200 dark:after:bg-[#2a3441]/70">
                Ayarlar
              </h3>
              
              <div className="space-y-1">
                <a 
                  onClick={() => navigateTo("/settings")} 
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                    isActive("/settings") 
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-semibold shadow-sm border-l-4 border-primary dark:border-primary-light pl-2" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1e293b]/80 hover:text-primary dark:hover:text-primary-light hover:pl-4"
                  }`}
                >
                  <i className="fas fa-cog w-5 h-5 mr-3"></i>
                  <span>Hesap Ayarları</span>
                </a>
              </div>
            </div>
          </div>

          {/* Çıkış Butonu */}
          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-[#2a3441]/80 px-2">
            <button
              onClick={logout}
              className="flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-300 ease-in-out text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:pl-6"
            >
              <i className="fas fa-sign-out-alt w-5 h-5 mr-3"></i>
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      </nav>
    </aside>
  );
}
