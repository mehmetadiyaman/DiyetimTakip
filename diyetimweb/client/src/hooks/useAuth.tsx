import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "react-hot-toast";

// TypeScript Interfaces
interface User {
  _id: string; // MongoDB _id
  email: string;
  name?: string;
  profilePicture?: string;
  bio?: string;
  phone?: string;
  // Eski alanlar için uyumluluk
  id?: number;
  username?: string;
  fullName?: string;
  profileImage?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginData) => Promise<User | void>;
  register: (userData: RegisterData) => Promise<User | void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface LoginResponse {
  user: User;
  token: string;
}

interface RegisterData {
  username?: string;  // Artık opsiyonel
  password: string;
  email: string;
  fullName: string;
}

// API istekleri için yardımcı fonksiyon
async function apiRequest(method: string, url: string, data?: any) {
  const token = localStorage.getItem("token");
  
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Bir hata oluştu");
  }
  
  return response;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // If token is invalid, clear it
          localStorage.removeItem("token");
        }
      } catch (error) {
        console.error("Error fetching user", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (data: LoginData): Promise<User | void> => {
    try {
      // Backend'in beklediği alan adlarına dönüştür
      const loginData = {
        email: data.email,
        password: data.password
      };
      
      const res = await apiRequest("POST", "/api/auth/login", loginData);
      const responseData: LoginResponse = await res.json();
      
      localStorage.setItem("token", responseData.token);
      setUser(responseData.user);
      
      toast.success(`Hoş geldiniz, ${responseData.user.name || responseData.user.fullName || responseData.user.email}`);
      
      return responseData.user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Giriş sırasında bir hata oluştu";
      toast.error(errorMessage);
      throw error;
    }
  };

  const register = async (userData: RegisterData): Promise<User | void> => {
    try {
      // Backend'in beklediği alan adlarına dönüştür
      const backendUserData = {
        name: userData.fullName, // fullName -> name
        email: userData.email,
        password: userData.password,
        username: userData.username
      };
      
      const res = await apiRequest("POST", "/api/auth/register", backendUserData);
      const data: LoginResponse = await res.json();
      
      localStorage.setItem("token", data.token);
      setUser(data.user);
      
      toast.success(`Hoş geldiniz, ${data.user.name || data.user.fullName || data.user.email}`);
      
      return data.user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Kayıt sırasında bir hata oluştu";
      toast.error(errorMessage);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    
    toast.success("Güvenli bir şekilde çıkış yaptınız.");
  };
  
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};