import { Sparkles, Globe } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Header() {
  const location = useLocation();
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl gradient-text">AI World Simulator</span>
        </Link>
        
        <nav className="flex items-center gap-2">
          <Button 
            variant={location.pathname === '/' ? 'default' : 'ghost'}
            asChild
          >
            <Link to="/">Home</Link>
          </Button>
          <Button 
            variant={location.pathname === '/dashboard' ? 'default' : 'ghost'}
            asChild
          >
            <Link to="/dashboard">My Bots</Link>
          </Button>
          <Button 
            variant={location.pathname === '/discover' ? 'default' : 'ghost'}
            asChild
          >
            <Link to="/discover">
              <Globe className="w-4 h-4 mr-2" />
              Discover
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
