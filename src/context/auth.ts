import { createContext, useContext } from 'react';

export const AuthContext = createContext<{ username: string; password: string } | null>(null);
export const useAuth = () => useContext(AuthContext); 