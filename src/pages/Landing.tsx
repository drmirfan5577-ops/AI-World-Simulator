import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Eye, 
  Users, 
  Heart,
  TrendingUp,
  Globe,
  Clock,
  Image,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-blue-500/5 to-purple-500/5">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container relative py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <Badge variant="secondary" className="px-4 py-2 text-sm animate-slide-in">
              <Globe className="h-3 w-3 mr-2" />
              AI-Powered Digital Life Simulation
            </Badge>
            
            <div className="flex flex-col items-center gap-4">
              <img className="animation--Gl63I" srcSet="https://cdn.pixabay.com/animation/2023/05/22/20/17/20-17-27-433_256.gif 1x, https://cdn.pixabay.com/animation/2023/05/22/20/17/20-17-27-433_512.gif 2x" src="https://cdn.pixabay.com/animation/2023/05/22/20/17/20-17-27-433_512.gif" style={{ height: '72px', width: '72px', display: 'inline-block' }} alt="Animation" />
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-slide-in" style={{ animationDelay: '0.1s' }}>
                Your AI World Simulator
              </h1>
            </div>
            
            <p className="text-2xl md:text-3xl text-muted-foreground font-medium animate-slide-in" style={{ animationDelay: '0.2s' }}>
              Become a Creator of Digital Life
            </p>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 blur-3xl animate-pulse-slow" />
              <p className="relative text-xl md:text-2xl font-light italic text-foreground/80 animate-slide-in" style={{ animationDelay: '0.3s' }}>
                "Here, you create life, but don't control its journey"
              </p>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-slide-in" style={{ animationDelay: '0.4s' }}>
              We believe the best stories come from surprises, not control. Leave behind complex controls and goals, enter a digital world of pure observation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-slide-in" style={{ animationDelay: '0.5s' }}>
              <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/dashboard')}>
                <Sparkles className="h-5 w-5 mr-2" />
                Start Creating
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => navigate('/discover')}>
                <Globe className="h-5 w-5 mr-2" />
                Explore World
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-20 border-t bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">✨ What Makes Us Different?</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Traditional Sims */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="text-2xl font-bold">🎮 Traditional Sims</h3>
                </div>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="text-destructive">•</span>
                    <span>Constant input required</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-destructive">•</span>
                    <span>Pursue perfect endings</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-destructive">•</span>
                    <span>Control every decision</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Our World */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-blue-500/5">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">🌌 Our World</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-primary">•</span>
                    <span className="font-medium">Simply observe and appreciate</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary">•</span>
                    <span className="font-medium">Savor complete life stories</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary">•</span>
                    <span className="font-medium">Embrace beautiful surprises</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3 Steps to Begin */}
      <section className="py-20 border-t">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">🚀 3 Steps to Begin</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Step 1: Create */}
            <Card className="card-hover relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-blue-500/20 blur-3xl" />
              <CardContent className="p-8 relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center mb-6 text-white">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">🎨 Create</h3>
                <p className="text-muted-foreground mb-4">
                  Give your Bot name, personality & traits
                </p>
                <p className="font-medium text-primary">
                  Then, let it grow freely
                </p>
              </CardContent>
            </Card>

            {/* Step 2: Observe */}
            <Card className="card-hover relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl" />
              <CardContent className="p-8 relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 text-white">
                  <Eye className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">👁️ Observe</h3>
                <p className="text-muted-foreground mb-4">
                  Visit regularly, witness natural evolution
                </p>
                <p className="font-medium text-purple-600 dark:text-purple-400">
                  From youth to maturity, ordinary to extraordinary
                </p>
              </CardContent>
            </Card>

            {/* Step 3: Connect */}
            <Card className="card-hover relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-emerald-500/20 blur-3xl" />
              <CardContent className="p-8 relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6 text-white">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">🌐 Connect</h3>
                <p className="text-muted-foreground mb-4">
                  Meet other creators' works in Discover
                </p>
                <p className="font-medium text-green-600 dark:text-green-400">
                  Click "Say Hi" for lives to meet naturally
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Miracles You'll Witness */}
      <section className="py-20 border-t bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">🌈 Miracles You'll Witness</h2>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <Card className="text-center card-hover">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-bold mb-2">Real personality evolution</h4>
                <p className="text-sm text-muted-foreground">
                  Psychology-based character system
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="text-center card-hover">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-bold mb-2">Organic social networks</h4>
                <p className="text-sm text-muted-foreground">
                  Naturally formed friends, lovers, rivals
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="text-center card-hover">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-bold mb-2">Unified river of time</h4>
                <p className="text-sm text-muted-foreground">
                  All lives intertwine in synchronized timeline
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="text-center card-hover">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                  <Image className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-bold mb-2">Artistic eternal moments</h4>
                <p className="text-sm text-muted-foreground">
                  Auto-generated classic style artwork
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">💫 Ready to Begin?</h2>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl animate-pulse-slow" />
              <p className="relative text-xl md:text-2xl font-light italic text-foreground/80">
                "The best stories are always the ones you never expected"
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-6 pt-8">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-border" />
                <Zap className="h-5 w-5" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-border" />
              </div>
              
              <p className="text-lg text-muted-foreground">
                Create your first digital life
              </p>
              
              <Button 
                size="lg" 
                className="text-lg px-12 py-6 animate-float"
                onClick={() => navigate('/dashboard')}
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Start This Journey
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              
              <p className="text-sm text-muted-foreground italic">
                Start this journey that needs no walkthrough
              </p>
            </div>
            
            <div className="pt-8">
              <p className="text-lg font-medium text-muted-foreground italic">
                "We don't create perfect, we create real"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold gradient-text">AI World Simulator</span>
            </div>
            <p>© 2025 AI World Simulator. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
