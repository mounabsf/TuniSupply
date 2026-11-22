import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// const { user, login, register, logout, setUser } = useAuth()
// user : undefined = chargement, null = déconnecté, objet = connecté ({ id, username, role, ... })
export const useAuth = () => useContext(AuthContext);
