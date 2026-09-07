export interface Bot {
  id: string;
  client_id: string;
  name: string;
  gender: 'male' | 'female' | 'non-binary';
  initial_age: number;
  current_age: number;
  zodiac_sign: string;
  mbti_type: string;
  additional_traits?: string;
  personality_profile: Record<string, any>;
  current_life_stage: string;
  emotional_state?: string;
  simulation_speed: number;
  is_active: boolean;
  created_at: string;
  last_event_at?: string;
  avatar_url?: string;
  avatar_emoji?: string;
  birth_year?: number;
  preferred_language?: string;
}

export interface WorldState {
  id: string;
  current_world_date: string;
  world_created_at: string;
  time_ratio_hours_to_weeks: number;
  real_time_last_synced: string;
  updated_at: string;
}

export interface LifeEvent {
  id: string;
  bot_id: string;
  event_type: 'daily' | 'turning_point' | 'dramatic';
  event_category: string;
  title: string;
  description: string;
  simulated_age: number;
  simulated_date: string;
  emotional_impact?: number;
  related_npc_ids?: string[];
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Narrative {
  id: string;
  bot_id: string;
  event_id?: string;
  time_period: string;
  content: string;
  narrative_type: string;
  created_at: string;
}

export interface MilestoneImage {
  id: string;
  bot_id: string;
  event_id: string;
  image_url: string;
  prompt_used: string;
  milestone_type: string;
  simulated_age: number;
  created_at: string;
}

export interface NPC {
  id: string;
  bot_id: string;
  name: string;
  relationship_type: string;
  personality_traits?: string;
  age_difference?: number;
  importance_level: number;
  first_met_at?: number;
  relationship_history: any[];
  is_active: boolean;
  created_at: string;
  linked_bot_id?: string;
}

export interface CreateBotInput {
  name: string;
  gender: 'male' | 'female' | 'non-binary';
  initial_age: number;
  zodiac_sign: string;
  mbti_type: string;
  additional_traits?: string;
}
