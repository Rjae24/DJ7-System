import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const initializedRef = useRef(false);

  const fetchProfile = useCallback(async (userId) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profile fetch error, retrying...', error.message);
        // Retry once after a small delay (RLS might need the session to propagate)
        await new Promise(r => setTimeout(r, 500));
        const { data: retryData, error: retryError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (retryError) {
          console.error('Profile fetch failed after retry:', retryError.message);
          setProfile(null);
        } else {
          setProfile(retryData);
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (event === 'SIGNED_IN' && currentUser) {
          fetchProfile(currentUser.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
        }
        // Ignore TOKEN_REFRESHED and other events to prevent loops
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  async function signIn(email, password) {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  }

  async function createUser(email, password, nombreCompleto, rol) {
    // Use the admin's current session to create user via signUp
    // Note: This will sign the admin out and sign in as the new user
    // We need to use a different approach - use the Supabase REST API directly
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`,
      {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          data: {
            nombre_completo: nombreCompleto,
            rol: rol,
          },
        }),
      }
    );

    const data = await response.json();
    if (data.error || data.msg) {
      throw new Error(data.error || data.msg || 'Error al crear usuario');
    }
    return data;
  }

  const isAdmin = profile?.rol === 'admin';
  const isVendedor = profile?.rol === 'vendedor';

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    isVendedor,
    signIn,
    signOut,
    createUser,
    refreshProfile: () => user && fetchProfile(user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
