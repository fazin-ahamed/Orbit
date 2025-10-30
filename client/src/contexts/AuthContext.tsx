import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    tenantId: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        } catch (error) {
          // Invalid stored user data
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, mfaCode?: string) => {
    try {
      setIsLoading(true);
      const response = await api.login(email, password, mfaCode);
      setUser(response.user);

      toast({
        title: 'Welcome back!',
        description: `Hello ${response.user.first_name}!`,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    tenantId: string;
    firstName: string;
    lastName: string;
  }) => {
    try {
      setIsLoading(true);
      const response = await api.register(data);
      setUser(response.user);

      toast({
        title: 'Account created!',
        description: `Welcome ${response.user.first_name}!`,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      toast({
        title: 'Registration failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const updatedUser = await api.updateProfile(data);
      setUser(updatedUser);

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      toast({
        title: 'Update failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
