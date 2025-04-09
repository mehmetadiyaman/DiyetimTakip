import React, { ReactNode, useState, useEffect, cloneElement } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Link, useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  // Sayfa değişimi için state
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("fadeIn");
  
  // İçeriği cache'leme
  const [cachedChildren, setCachedChildren] = useState(children);
  
  // Location değiştiğinde yeni içeriği sakla, ama hemen gösterme
  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      // Önce eski sayfanın çıkış animasyonunu başlat
      setTransitionStage("fadeOut");
    }
  }, [location, displayLocation]);
  
  // fadeOut tamamlandıktan sonra yeni sayfayı göster
  useEffect(() => {
    if (transitionStage === "fadeOut") {
      const timeout = setTimeout(() => {
        // Şimdi yeni sayfa içeriğini ve lokasyonu ayarla
        setCachedChildren(children);
        setDisplayLocation(location);
        // Sonra giriş animasyonunu başlat
        setTransitionStage("fadeIn");
      }, 300); // transition süresine denk olmalı
      
      return () => clearTimeout(timeout);
    }
  }, [transitionStage, location, children]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#111827] text-gray-800 dark:text-gray-200">
      {/* Sidebar for desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-gray-600 bg-opacity-75 dark:bg-opacity-90" onClick={toggleSidebar}></div>
          <div className="absolute left-0 top-0 bottom-0 flex w-64 flex-col bg-white dark:bg-[#1a2234] z-50 shadow-lg dark:shadow-glow">
            <Sidebar />
          </div>
        </div>
      )}
      
      {/* Main content with transitions */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto pb-10 lg:pb-0 px-2 sm:px-4 md:px-6 lg:px-8 pt-4">
          <div className={`page-transition ${transitionStage} rounded-lg overflow-hidden`}>
            {/* Eski sayfanın çıkış animasyonu (fadeOut) sırasında ve 
                yeni sayfanın giriş animasyonu (fadeIn) sırasında
                daima cachedChildren'ı göster */}
            {cachedChildren}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a2234] border-t border-gray-200 dark:border-gray-700/50 flex justify-around py-2 px-4 z-10 shadow-md dark:shadow-lg">
          <Link to="/" className="text-primary dark:text-primary-light flex flex-col items-center px-1 py-1">
            <i className="fas fa-tachometer-alt text-lg"></i>
            <span className="text-xs mt-1">Panel</span>
          </Link>
          <Link to="/clients" className="text-gray-600 dark:text-gray-300 flex flex-col items-center px-1 py-1">
            <i className="fas fa-users text-lg"></i>
            <span className="text-xs mt-1">Danışanlar</span>
          </Link>
          <Link to="/diet-plans" className="text-gray-600 dark:text-gray-300 flex flex-col items-center px-1 py-1">
            <i className="fas fa-utensils text-lg"></i>
            <span className="text-xs mt-1">Diyetler</span>
          </Link>
          <Link to="/appointments" className="text-gray-600 dark:text-gray-300 flex flex-col items-center px-1 py-1">
            <i className="fas fa-calendar-alt text-lg"></i>
            <span className="text-xs mt-1">Randevular</span>
          </Link>
          <div className="text-gray-600 dark:text-gray-300 flex flex-col items-center px-1 py-1">
            <i className="fas fa-ellipsis-h text-lg"></i>
            <span className="text-xs mt-1">Diğer</span>
          </div>
        </div>
      </div>
    </div>
  );
}
