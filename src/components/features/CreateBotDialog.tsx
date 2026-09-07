import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { ZODIAC_SIGNS, MBTI_TYPES, GENDERS } from '@/constants';
import { CreateBotInput } from '@/types';
import { useBots } from '@/hooks/useBots';

export function CreateBotDialog() {
  const [open, setOpen] = useState(false);
  const { createBot } = useBots();
  const [formData, setFormData] = useState<CreateBotInput>({
    name: '',
    gender: 'male',
    initial_age: 0,
    zodiac_sign: 'Aries',
    mbti_type: 'INTJ',
    additional_traits: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createBot.mutate(formData, {
      onSuccess: () => {
        setOpen(false);
        setFormData({
          name: '',
          gender: 'male',
          initial_age: 0,
          zodiac_sign: 'Aries',
          mbti_type: 'INTJ',
          additional_traits: '',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Create New Bot
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create AI Character</DialogTitle>
          <DialogDescription>
            Design a unique digital life with personality and traits
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter character name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value: any) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Starting Age *</Label>
              <Input
                id="age"
                type="number"
                min="0"
                max="100"
                value={formData.initial_age || ''}
                onChange={(e) => setFormData({ ...formData, initial_age: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zodiac">Zodiac Sign *</Label>
              <Select
                value={formData.zodiac_sign}
                onValueChange={(value) => setFormData({ ...formData, zodiac_sign: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZODIAC_SIGNS.map((sign) => (
                    <SelectItem key={sign} value={sign}>
                      {sign}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mbti">MBTI Type *</Label>
              <Select
                value={formData.mbti_type}
                onValueChange={(value) => setFormData({ ...formData, mbti_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MBTI_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="traits">Additional Traits (Optional)</Label>
            <Textarea
              id="traits"
              value={formData.additional_traits}
              onChange={(e) => setFormData({ ...formData, additional_traits: e.target.value })}
              placeholder="e.g., loves art, afraid of heights, ambitious..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={createBot.isPending}>
            {createBot.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Character
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
