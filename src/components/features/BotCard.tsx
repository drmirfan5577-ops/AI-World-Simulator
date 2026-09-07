import { Bot } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBotAge, useBotLifeStage } from '@/hooks/useBotAge';
import { getLifeStageColor } from '@/lib/utils';

interface BotCardProps {
  bot: Bot;
  onDelete: (id: string) => void;
}

export function BotCard({ bot, onDelete }: BotCardProps) {
  const navigate = useNavigate();
  const currentAge = useBotAge(bot);
  const currentLifeStage = useBotLifeStage(bot);

  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl h-12 w-12 rounded-full border-2 border-primary flex items-center justify-center">
              {bot.avatar_emoji || '🙂'}
            </div>
            <div>
              <CardTitle className="text-lg">{bot.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {bot.zodiac_sign} • {bot.mbti_type}
              </p>
            </div>
          </div>
          <Badge className={getLifeStageColor(currentLifeStage)}>
            {currentLifeStage.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Age:</span>
            <span className="font-medium">{currentAge} years</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gender:</span>
            <span className="font-medium capitalize">{bot.gender}</span>
          </div>
          {bot.emotional_state && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mood:</span>
              <span className="font-medium">{bot.emotional_state}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="gap-2">
        <Button 
          className="flex-1" 
          onClick={() => navigate(`/bot/${bot.id}`)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Life
        </Button>
        <Button 
          variant="destructive" 
          size="icon"
          onClick={() => onDelete(bot.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
