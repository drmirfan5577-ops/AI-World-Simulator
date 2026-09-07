import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCurrentWorldTime } from '../_shared/world-time.ts';

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
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { fromBotId, toBotId } = await req.json();

    console.log('Establishing connection between:', fromBotId, 'and', toBotId);

    // Fetch both bots
    const { data: fromBot, error: fromBotError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', fromBotId)
      .single();

    const { data: toBot, error: toBotError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', toBotId)
      .single();

    if (fromBotError || toBotError) {
      throw new Error('Failed to fetch bot data');
    }

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('npcs')
      .select('id')
      .eq('bot_id', fromBotId)
      .eq('linked_bot_id', toBotId)
      .single();

    if (existingConnection) {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Connection already exists' 
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get current world time (auto-calculated)
    const currentWorldDate = await getCurrentWorldTime(supabase);
    
    console.log('Encounter at world time:', currentWorldDate.toISOString().split('T')[0]);

    // Generate encounter event using AI
    const prompt = `Generate an initial encounter event between two AI characters meeting for the first time.

Character A:
- Name: ${fromBot.name}
- Age: ${Math.floor(fromBot.current_age)}
- Personality: ${fromBot.zodiac_sign}, ${fromBot.mbti_type}
- Life Stage: ${fromBot.current_life_stage}

Character B:
- Name: ${toBot.name}
- Age: ${Math.floor(toBot.current_age)}
- Personality: ${toBot.zodiac_sign}, ${toBot.mbti_type}
- Life Stage: ${toBot.current_life_stage}

Create a realistic encounter scenario. Consider their personalities and life stages. The meeting should feel natural and organic.

Return ONLY valid JSON:
{
  "location": "where they met (e.g., café, workplace, park)",
  "reason": "why they started talking",
  "common_interest": "what they discovered they have in common",
  "first_impression_a": "A's impression of B (brief)",
  "first_impression_b": "B's impression of A (brief)",
  "relationship_type": "acquaintance|friend|colleague",
  "importance_level": 1-3
}`;

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI Response:', content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const encounterData = JSON.parse(jsonMatch[0]);

    // Use current world time for encounter event
    const encounterDate = currentWorldDate;
    
    // Calculate ages for both bots at this world date
    const fromBotBirthYear = fromBot.birth_year || (currentWorldDate.getFullYear() - Math.floor(fromBot.current_age));
    const toBotBirthYear = toBot.birth_year || (currentWorldDate.getFullYear() - Math.floor(toBot.current_age));
    
    const fromBotAge = currentWorldDate.getFullYear() - fromBotBirthYear;
    const toBotAge = currentWorldDate.getFullYear() - toBotBirthYear;
    
    // Update birth years if not set
    if (!fromBot.birth_year) {
      await supabase.from('bots').update({ birth_year: fromBotBirthYear }).eq('id', fromBotId);
    }
    if (!toBot.birth_year) {
      await supabase.from('bots').update({ birth_year: toBotBirthYear }).eq('id', toBotId);
    }

    // Create encounter events for both bots
    const fromBotEventTitle = `Met ${toBot.name}`;
    const fromBotEventDesc = `Met ${toBot.name} at ${encounterData.location}. We started talking because ${encounterData.reason}, and discovered we both ${encounterData.common_interest}. ${encounterData.first_impression_a}`;

    const toBotEventTitle = `Met ${fromBot.name}`;
    const toBotEventDesc = `Met ${fromBot.name} at ${encounterData.location}. We started talking because ${encounterData.reason}, and discovered we both ${encounterData.common_interest}. ${encounterData.first_impression_b}`;

    // Insert events for both bots using world time
    const { data: fromBotEvent, error: fromEventError } = await supabase
      .from('life_events')
      .insert([{
        bot_id: fromBotId,
        event_type: 'turning_point',
        event_category: 'friendship',
        title: fromBotEventTitle,
        description: fromBotEventDesc,
        simulated_age: fromBotAge,
        simulated_date: encounterDate.toISOString().split('T')[0],
        emotional_impact: 3,
        metadata: {
          encounter_location: encounterData.location,
          connected_bot_id: toBotId,
        },
      }])
      .select()
      .single();

    const { data: toBotEvent, error: toEventError } = await supabase
      .from('life_events')
      .insert([{
        bot_id: toBotId,
        event_type: 'turning_point',
        event_category: 'friendship',
        title: toBotEventTitle,
        description: toBotEventDesc,
        simulated_age: toBotAge,
        simulated_date: encounterDate.toISOString().split('T')[0],
        emotional_impact: 3,
        metadata: {
          encounter_location: encounterData.location,
          connected_bot_id: fromBotId,
        },
      }])
      .select()
      .single();

    if (fromEventError || toEventError) {
      console.error('Event creation error:', fromEventError || toEventError);
    }

    // Create NPC entries for both bots (bidirectional connection)
    const { error: fromNpcError } = await supabase
      .from('npcs')
      .insert([{
        bot_id: fromBotId,
        linked_bot_id: toBotId,
        name: toBot.name,
        relationship_type: encounterData.relationship_type,
        personality_traits: `${toBot.zodiac_sign}, ${toBot.mbti_type}`,
        importance_level: encounterData.importance_level,
        first_met_at: fromBotAge,
        relationship_history: [{
          event: 'first_meeting',
          description: fromBotEventDesc,
          timestamp: new Date().toISOString(),
        }],
      }]);

    const { error: toNpcError } = await supabase
      .from('npcs')
      .insert([{
        bot_id: toBotId,
        linked_bot_id: fromBotId,
        name: fromBot.name,
        relationship_type: encounterData.relationship_type,
        personality_traits: `${fromBot.zodiac_sign}, ${fromBot.mbti_type}`,
        importance_level: encounterData.importance_level,
        first_met_at: toBotAge,
        relationship_history: [{
          event: 'first_meeting',
          description: toBotEventDesc,
          timestamp: new Date().toISOString(),
        }],
      }]);

    if (fromNpcError || toNpcError) {
      console.error('NPC creation error:', fromNpcError || toNpcError);
    }

    // Update last_event_at for both bots
    await supabase
      .from('bots')
      .update({ last_event_at: new Date().toISOString() })
      .in('id', [fromBotId, toBotId]);

    // Generate milestone image for this connection (dual-bot friendship commemoration)
    if (fromBotEvent && toBotEvent) {
      console.log('Generating friendship milestone image for connection');
      
      // Fire and forget - don't wait for image generation
      supabase.functions.invoke('generate-milestone-image', {
        body: {
          botId: fromBotId,
          eventId: fromBotEvent.id,
          eventTitle: fromBotEventTitle,
          eventDescription: fromBotEventDesc,
          botName: fromBot.name,
          age: fromBotAge,
          // Dual-bot data for connection milestone
          isDualBotMilestone: true,
          secondBotName: toBot.name,
          secondBotAge: toBotAge,
          secondBotAvatar: toBot.avatar_emoji || '🙂',
          firstBotAvatar: fromBot.avatar_emoji || '🙂',
          location: encounterData.location,
        },
      }).catch(err => console.error('Milestone image generation error:', err));
      
      // Also create milestone for the second bot
      supabase.functions.invoke('generate-milestone-image', {
        body: {
          botId: toBotId,
          eventId: toBotEvent.id,
          eventTitle: toBotEventTitle,
          eventDescription: toBotEventDesc,
          botName: toBot.name,
          age: toBotAge,
          // Dual-bot data for connection milestone
          isDualBotMilestone: true,
          secondBotName: fromBot.name,
          secondBotAge: fromBotAge,
          secondBotAvatar: fromBot.avatar_emoji || '🙂',
          firstBotAvatar: toBot.avatar_emoji || '🙂',
          location: encounterData.location,
        },
      }).catch(err => console.error('Milestone image generation error:', err));
    }

    return new Response(JSON.stringify({ 
      success: true,
      encounter: encounterData,
      events: {
        fromBot: fromBotEvent,
        toBot: toBotEvent,
      },
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in establish-connection:', error);
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
