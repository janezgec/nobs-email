import { useEffect, useState } from 'preact/hooks';
import { getPB } from '../lib/pb';

const pb = getPB();

interface HeaderProps {
  currentPath: string;
}

export default function Header({ currentPath }: HeaderProps) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      try {
        const authData = pb.authStore.record;
        setUser(authData as any);
        if(authData && (window.location.pathname === '/sign-in' || window.location.pathname === '/')) {
          window.location.href = '/app';
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const unsubscribe = pb.authStore.onChange(() => {
      checkAuth();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      pb.authStore.clear();
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (isLoading) {
    return (
      <header className="flex justify-between items-center p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="text-lg sm:text-xl font-bold">NoBS.email</div>
        <div className="bg-transparent text-cyan-600 border-2 border-cyan-600 rounded-lg px-4 py-2 font-medium">
          Loading...
        </div>
      </header>
    );
  }

  return (
    <header className="flex justify-between items-center p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="text-lg sm:text-xl font-bold">NoBS.email</div>
      
      {user ? (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">{user.username}</span>
          <button
            onClick={handleSignOut}
            className="bg-transparent text-gray-500 border-2 border-gray-500 rounded-lg px-4 py-2 font-medium hover:bg-gray-500 hover:text-white hover:cursor-pointer transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <a
          href={currentPath === '/' ? '/sign-in' : '/'}
          className="bg-transparent text-cyan-600 border-2 border-cyan-600 rounded-lg px-4 py-2 font-medium hover:bg-cyan-400 hover:text-white hover:cursor-pointer transition-colors"
        >
          {currentPath === '/' ? 'Sign in' : 'Back to Home'}
        </a>
      )}
    </header>
  );
}