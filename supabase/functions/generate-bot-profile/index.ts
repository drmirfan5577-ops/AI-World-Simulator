import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCurrentWorldTime } from '../_shared/world-time.ts';

// Language detection helper
function detectLanguage(text: string): string {
  if (!text || text.trim() === '') return 'en';
  
  // Check for Chinese characters
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
  
  // Check for Japanese characters
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
  
  // Check for Korean characters
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  
  // Check for Arabic characters
  if (/[\u0600-\u06ff]/.test(text)) return 'ar';
  
  // Check for Cyrillic characters (Russian, etc.)
  if (/[\u0400-\u04ff]/.test(text)) return 'ru';
  
  // Check for Thai characters
  if (/[\u0e00-\u0e7f]/.test(text)) return 'th';
  
  // Default to English
  return 'en';
}

const OPENAI_API_KEY = Deno.env.get('ONSPACE_AI_API_KEY');
const OPENAI_BASE_URL = Deno.env.get('ONSPACE_AI_BASE_URL');

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { name, gender, initial_age, zodiac_sign, mbti_type, additional_traits, client_id } = await req.json();

    console.log('Generating bot profile for:', name);
    
    // Detect language from additional_traits
    const preferredLanguage = detectLanguage(additional_traits || '');
    console.log('Detected language:', preferredLanguage);

    // Get current world time to calculate birth year
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Use auto-calculated world time
    const currentWorldDate = await getCurrentWorldTime(supabase);
    const birthYear = currentWorldDate.getFullYear() - initial_age;
    
    console.log('Creating bot at world time:', currentWorldDate.toISOString().split('T')[0], 'Birth year:', birthYear);

    const prompt = `You are creating a deep, dramatic personality profile for an AI character in a life simulation game.

Character Details:
- Name: ${name}
- Gender: ${gender}
- Age: ${initial_age}
- Zodiac Sign: ${zodiac_sign}
- MBTI Type: ${mbti_type}
${additional_traits ? `- Additional Traits: ${additional_traits}` : ''}

Generate a detailed personality profile with DRAMATIC DEPTH:

1. Core personality traits (5-7 traits)
2. Strengths and weaknesses
3. Life goals and aspirations
4. Fears and challenges
5. Current emotional state

🎭 DRAMATIC ENHANCEMENTS:

【Core Contradiction】(MANDATORY)
Create ONE deep psychological contradiction:
- Structure: "Desires [something] but fears [related cost]"
- Examples:
  * "Desires love but fears losing independence"
  * "Pursues perfection but fears exposing flaws"
  * "Craves recognition but fears judgment"
  * "Wants adventure but fears instability"
- Make it specific to their personality (MBTI + Zodiac)
- Contradiction should create internal tension

【Hidden Traits】(1-2 traits)
Traits that CONTRAST with surface personality:
- INTJ rational type → secret romantic impulses
- Extrovert social butterfly → moments of deep loneliness
- Conservative planner → occasional wild spontaneity
- Perfectionist → chaotic creative bursts

These hidden traits:
- Only manifest under specific conditions (stress, major life events, special moments)
- Should surprise the character and others
- Add complexity beyond basic MBTI stereotypes

Return ONLY a valid JSON object:
{
  "personality_profile": {
    "traits": ["trait1", "trait2", ...],
    "strengths": ["strength1", "strength2", ...],
    "weaknesses": ["weakness1", "weakness2", ...],
    "goals": ["goal1", "goal2", ...],
    "fears": ["fear1", "fear2", ...],
    "values": ["value1", "value2", ...],
    "core_contradiction": {
      "desires": "what they deeply want",
      "fears": "what cost/consequence they fear",
      "intensity": 50-100 (how strong is this contradiction),
      "description": "one sentence explaining this inner conflict"
    },
    "hidden_traits": [
      {
        "trait": "trait name",
        "trigger_conditions": "when/how this manifests",
        "contrast_with": "which surface trait it contradicts"
      }
    ]
  },
  "emotional_state": "current mood description"
}`;

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI Response:', content);
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ 
      ...result,
      birth_year: birthYear,
      preferred_language: preferredLanguage,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in generate-bot-profile:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
