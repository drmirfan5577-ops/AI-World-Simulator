import { Header } from '@/components/layout/Header';
import { BotCard } from '@/components/features/BotCard';
import { CreateBotDialog } from '@/components/features/CreateBotDialog';
import { useBots } from '@/hooks/useBots';
import { Sparkles, Loader2 } from 'lucide-react';

export function Dashboard() {
  const { bots, isLoading, deleteBot } = useBots();

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your AI Characters</h1>
            <p className="text-muted-foreground">
              Manage and observe your digital lives
            </p>
          </div>
          <CreateBotDialog />
        </div>

        {bots.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No Characters Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first AI character and watch their unique life journey unfold
            </p>
            <CreateBotDialog />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
              <BotCard 
                key={bot.id} 
                bot={bot}
                onDelete={(id) => {
                  if (confirm('Are you sure you want to delete this character?')) {
                    deleteBot.mutate(id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
