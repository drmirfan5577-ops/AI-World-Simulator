
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCurrentWorldTime, syncWorldTime } from '../_shared/world-time.ts';
import { shouldGenerateMilestone } from '../_shared/milestone-config.ts';

const OPENAI_API_KEY = Deno.env.get('ONSPACE_AI_API_KEY');
const OPENAI_BASE_URL = Deno.env.get('ONSPACE_AI_BASE_URL');

// Language instruction map
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  'zh': '请用中文生成所有事件标题和描述。',
  'ja': 'すべてのイベントのタイトルと説明を日本語で生成してください。',
  'ko': '모든 이벤트 제목과 설명을 한국어로 생성해주세요.',
  'ar': 'يرجى إنشاء جميع عناوين الأحداث والأوصاف باللغة العربية.',
  'ru': 'Пожалуйста, создайте все названия событий и описания на русском языке.',
  'th': 'โปรดสร้างชื่อและคำอธิบายเหตุการณ์ทั้งหมดเป็นภาษาไทย',
  'en': '', // English is default, no instruction needed
};

function getLanguageInstruction(langCode: string): string {
  return LANGUAGE_INSTRUCTIONS[langCode] || '';
}

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

    const { botId } = await req.json();

    console.log('Generating events for bot:', botId);

    // 🌍 AUTO-GENERATE WORLD NEWS (if needed)
    // Check and generate world news before creating bot events
    try {
      console.log('🌍 Checking world news...');
      const { data: newsGenResult, error: newsGenError } = await supabase.functions.invoke('generate-world-news', {
        body: {},
      });
      
      if (newsGenError) {
        console.error('World news generation error (non-critical):', newsGenError);
      } else if (newsGenResult?.generated) {
        console.log(`✅ Generated ${newsGenResult.count} world events spanning ${newsGenResult.years_covered} years`);
      } else {
        console.log(`ℹ️ World news is current: ${newsGenResult?.message || 'No generation needed'}`);
      }
    } catch (newsError) {
      // Non-critical error - continue with event generation even if world news fails
      console.error('World news check failed (continuing anyway):', newsError);
    }

    // Helper function to calculate mortality probability based on age
    const calculateMortalityRisk = (age: number): number => {
      if (age < 60) return 0.001; // 0.1% chance
      if (age < 70) return 0.01;  // 1% chance
      if (age < 80) return 0.05;  // 5% chance
      if (age < 90) return 0.15;  // 15% chance
      if (age < 100) return 0.30; // 30% chance
      if (age < 110) return 0.50; // 50% chance
      return 0.80; // 80% chance after 110
    };

    // Helper function to determine physical capability based on age
    const getPhysicalState = (age: number): string => {
      if (age < 40) return 'healthy and energetic';
      if (age < 60) return 'healthy with minor age-related changes';
      if (age < 70) return 'generally healthy but slowing down';
      if (age < 80) return 'physically limited, some health issues';
      if (age < 90) return 'significantly weakened, daily activities challenging';
      return 'very frail, requires assistance for most activities';
    };

    // Get current world time first (needed for queries)
    const currentWorldDate = await getCurrentWorldTime(supabase);
    console.log('Current world time:', currentWorldDate.toISOString().split('T')[0]);

    // Fetch bot data
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .single();

    if (botError) throw botError;

    // Fetch recent world news (last 3 years)
    const threeYearsAgo = new Date(currentWorldDate);
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const { data: worldNews, error: newsError } = await supabase
      .from('world_news')
      .select('*')
      .gte('simulated_date', threeYearsAgo.toISOString().split('T')[0])
      .order('simulated_date', { ascending: false });

    if (newsError) console.error('Error fetching world news:', newsError);

    // Fetch ALL events for complete memory context (avoid repetition and "first time" errors)
    const { data: recentEvents, error: eventsError } = await supabase
      .from('life_events')
      .select('*')
      .eq('bot_id', botId)
      .order('simulated_date', { ascending: false });
      // NO LIMIT - AI needs full event history to maintain consistency

    if (eventsError) throw eventsError;

    // Fetch NPCs for relationship context
    const { data: npcs, error: npcsError } = await supabase
      .from('npcs')
      .select('*')
      .eq('bot_id', botId)
      .eq('is_active', true);

    if (npcsError) throw npcsError;

    // Fetch connected bots (bot-to-bot connections)
    const connectedBotIds = npcs?.filter(n => n.linked_bot_id).map(n => n.linked_bot_id) || [];
    let connectedBots = [];
    if (connectedBotIds.length > 0) {
      const { data: botsData, error: botsError } = await supabase
        .from('bots')
        .select('*')
        .in('id', connectedBotIds);
      
      if (!botsError) {
        connectedBots = botsData || [];
      }
    }

    const eventContext = recentEvents?.length > 0
      ? `📚 COMPLETE EVENT HISTORY (${recentEvents.length} events):

Recent Timeline (last 20 events):
${recentEvents.slice(0, 20).map(e => `- [${e.simulated_date}] ${e.title} (${e.event_category})`).join('\n')}
${recentEvents.length > 20 ? `

Earlier Events by Category (${recentEvents.length - 20} events):
${Object.entries(recentEvents.slice(20).reduce((acc: Record<string, number>, e: any) => {
  acc[e.event_category] = (acc[e.event_category] || 0) + 1;
  return acc;
}, {} as Record<string, number>)).map(([cat, count]) => `- ${cat}: ${count} events`).join('\n')}
` : ''}
⚠️ CRITICAL CONSISTENCY RULES:
- NEVER repeat "first time" experiences already in history above
- Build upon past events, don't contradict them
- Maintain logical progression and character development`
      : 'No previous events yet - this is a fresh start.';

    const npcContext = npcs?.length > 0
      ? `\n🤝 CURRENT RELATIONSHIPS:\n${npcs.map(n => {
        const intimacy = n.intimacy_level || 0;
        const intimacyDesc = intimacy >= 80 ? '💖 Very Close' : intimacy >= 50 ? '😊 Close' : intimacy >= 20 ? '👋 Friendly' : '🤷 Acquaintance';
        return `- ${n.name} (${n.relationship_type}) - Intimacy: ${intimacy}/100 ${intimacyDesc}${n.last_interaction_date ? ` | Last met: ${n.last_interaction_date}` : ''}`;
      }).join('\n')}\n\n⚠️ RELATIONSHIP TRANSFORMATION TRIGGERS:\n- When intimacy reaches 80+ with 3+ shared events → can transform (friends→lovers, rivals→confidants)\n- During life transitions (unemployment, breakup, major decisions) → relationships may shift\n- External catalysts (long-distance, conflict of interest, third-party) → can deteriorate or elevate`
      : '';

    const worldNewsContext = worldNews?.length > 0
      ? `\n\n🌍 RECENT WORLD EVENTS (context for event generation):\n${worldNews.map(news => `- [${news.simulated_date}] ${news.event_title} (${news.event_type})\n  Impact: ${news.event_description}`).join('\n\n')}\n\n⚠️ Use world news as context for bot's events - how does ${bot.name} react to or get affected by these global changes?`
      : '';

    const connectedBotsContext = connectedBots.length > 0
      ? `\n\n🔗 CONNECTED BOTS (other players' bots):\n${connectedBots.map(cb => {
        const npc = npcs.find(n => n.linked_bot_id === cb.id);
        return `- ${cb.name} (${npc?.relationship_type || 'acquaintance'}): Age ${Math.floor(cb.current_age)}, ${cb.zodiac_sign}, ${cb.mbti_type}`;
      }).join('\n')}\n\nIMPORTANT: Include interaction events with these connected bots. Their events should intersect and influence each other.`
      : '';

    // Use world time system
    const latestEventDate = recentEvents?.[0]?.simulated_date 
      ? new Date(recentEvents[0].simulated_date)
      : null;
    
    // Calculate bot's birth year based on world time and initial age
    let birthYear = bot.birth_year;
    if (!birthYear) {
      // If birth_year not set, calculate it
      birthYear = currentWorldDate.getFullYear() - Math.floor(bot.initial_age);
      // Update bot with birth year
      await supabase
        .from('bots')
        .update({ birth_year: birthYear })
        .eq('id', botId);
    }
    
    const currentAge = bot.current_age;
    const currentAgeYears = Math.floor(currentAge);
    const physicalState = getPhysicalState(currentAgeYears);
    const mortalityRisk = calculateMortalityRisk(currentAgeYears);
    
    console.log(`Bot age: ${currentAgeYears}, Physical state: ${physicalState}, Mortality risk: ${(mortalityRisk * 100).toFixed(1)}%`);
    
    // Check for death event (natural mortality)
    const deathRoll = Math.random();
    if (deathRoll < mortalityRisk) {
      console.log(`🪦 Bot ${bot.name} has reached end of life at age ${currentAgeYears}`);
      
      // Generate death event
      const deathDate = latestEventDate 
        ? new Date(latestEventDate.getTime() + (Math.random() * 30 + 1) * 24 * 60 * 60 * 1000) // 1-30 days after last event
        : currentWorldDate;
      
      // Ensure death date doesn't exceed current world date
      const finalDeathDate = deathDate > currentWorldDate ? currentWorldDate : deathDate;
      
      const deathAge = currentAge + (finalDeathDate.getTime() - (latestEventDate?.getTime() || currentWorldDate.getTime())) / (1000 * 60 * 60 * 24 * 365.25);
      
      const deathCauses = currentAgeYears >= 90 
        ? ['peacefully passed away in sleep', 'died peacefully surrounded by loved ones', 'passed away naturally after a long life']
        : currentAgeYears >= 80
        ? ['passed away due to age-related illness', 'died after a brief illness', 'passed away peacefully at home']
        : ['passed away unexpectedly', 'died after a sudden illness', 'passed away after health complications'];
      
      const deathCause = deathCauses[Math.floor(Math.random() * deathCauses.length)];
      
      const { data: deathEvent, error: deathError } = await supabase
        .from('life_events')
        .insert([{
          bot_id: botId,
          event_type: 'dramatic',
          event_category: 'death',
          title: `End of Life - ${bot.name}`,
          description: `At the age of ${Math.floor(deathAge)}, ${bot.name} ${deathCause}. \n\n「**A life well-lived, now at rest.**」\n\nTheir journey has come to a natural end, leaving behind memories and impacts on those they knew.`,
          simulated_age: deathAge,
          simulated_date: finalDeathDate.toISOString().split('T')[0],
          emotional_impact: -10,
          metadata: { is_death_event: true, cause: deathCause },
        }])
        .select()
        .single();
      
      if (deathError) {
        console.error('Error creating death event:', deathError);
      } else {
        // Mark bot as inactive
        await supabase
          .from('bots')
          .update({
            is_active: false,
            current_age: deathAge,
            emotional_state: 'Deceased',
            last_event_at: new Date().toISOString(),
          })
          .eq('id', botId);
        
        return new Response(JSON.stringify({ 
          events: [deathEvent],
          count: 1,
          is_death_event: true,
          message: `${bot.name} has passed away at age ${Math.floor(deathAge)}. Their life story is complete.`,
          age_at_death: Math.floor(deathAge),
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }
    
    // If bot is already deceased, don't generate new events
    if (!bot.is_active) {
      return new Response(JSON.stringify({ 
        events: [],
        count: 0,
        message: `${bot.name} has passed away. Their life story is complete.`,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Calculate base date for new events
    let baseDate: Date;
    if (latestEventDate) {
      baseDate = new Date(latestEventDate);
      // Random interval between events (1-7 days) for more organic storytelling
      const randomDays = Math.floor(Math.random() * 7) + 1;
      baseDate.setDate(baseDate.getDate() + randomDays);
    } else {
      // First event generation - give new bot a 1-2 year window to generate initial events
      // Bot is at their initial age NOW, but we generate recent events leading up to now
      baseDate = new Date(currentWorldDate);
      const yearsBack = Math.min(2, Math.floor(bot.initial_age * 0.1)); // 10% of age, max 2 years
      baseDate.setFullYear(baseDate.getFullYear() - Math.max(1, yearsBack));
    }
    
    // Calculate available time window (days between baseDate and currentWorldDate)
    const availableDays = Math.floor((currentWorldDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`Available time window: ${availableDays} days (from ${baseDate.toISOString().split('T')[0]} to ${currentWorldDate.toISOString().split('T')[0]})`);
    
    // If bot is caught up with world time (less than 3 days available), return early with friendly message
    if (availableDays < 3) {
      return new Response(JSON.stringify({ 
        events: [],
        count: 0,
        message: `${bot.name} is living in the present moment! World time is advancing continuously (1 hour = 1 year). Check back soon to see what happens next in their life story.`,
        available_days: availableDays,
        friendly_tip: 'The world clock is always running - new experiences await!',
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // ⏳ SMART TIME CATCH-UP SYSTEM
    const maxYearsAvailable = Math.floor(availableDays / 365);
    const isCatchUpMode = maxYearsAvailable >= 5; // 5+ years gap triggers catch-up mode
    
    let yearsToSimulate = maxYearsAvailable;
    let eventsToGenerate = 3;
    let eventStrategy = 'normal';
    let periodDescription = '';
    
    if (isCatchUpMode) {
      // Smart catch-up: Generate only key representative events
      eventStrategy = 'catch_up';
      
      if (maxYearsAvailable <= 10) {
        // 5-10 years: 2-3 key events every 2 years
        eventsToGenerate = Math.min(Math.ceil(maxYearsAvailable / 2) * 2, 10);
        periodDescription = `${maxYearsAvailable} years (catch-up mode: focusing on key turning points)`;
      } else {
        // 10+ years: 3-4 key events every 3-5 years
        eventsToGenerate = Math.min(Math.ceil(maxYearsAvailable / 4) * 3, 12);
        periodDescription = `${maxYearsAvailable} years (long catch-up: highlighting major life milestones)`;
      }
      
      console.log(`🚀 CATCH-UP MODE: Generating ${eventsToGenerate} key events over ${maxYearsAvailable} years`);
    } else {
      // Normal mode: Detailed event generation
      switch (bot.current_life_stage) {
        case 'childhood':
          yearsToSimulate = Math.min(maxYearsAvailable, 2);
          eventsToGenerate = 3 + Math.floor(Math.random() * 3); // 3-5 events
          periodDescription = `${yearsToSimulate} year${yearsToSimulate > 1 ? 's' : ''}`;
          break;
        case 'teen':
          yearsToSimulate = Math.min(maxYearsAvailable, 2);
          eventsToGenerate = 3 + Math.floor(Math.random() * 3);
          periodDescription = `${yearsToSimulate} year${yearsToSimulate > 1 ? 's' : ''}`;
          break;
        case 'youth':
          yearsToSimulate = Math.min(maxYearsAvailable, 3);
          eventsToGenerate = 4 + Math.floor(Math.random() * 2);
          periodDescription = `${yearsToSimulate} year${yearsToSimulate > 1 ? 's' : ''}`;
          break;
        case 'middle_age':
          yearsToSimulate = Math.min(maxYearsAvailable, 4);
          eventsToGenerate = 3 + Math.floor(Math.random() * 3);
          periodDescription = `${yearsToSimulate} year${yearsToSimulate > 1 ? 's' : ''}`;
          break;
        case 'old_age':
          yearsToSimulate = Math.min(maxYearsAvailable, 3);
          eventsToGenerate = 2 + Math.floor(Math.random() * 3);
          periodDescription = `${yearsToSimulate} year${yearsToSimulate > 1 ? 's' : ''}`;
          break;
        default:
          yearsToSimulate = Math.min(maxYearsAvailable, 2);
          eventsToGenerate = 3;
          periodDescription = `${yearsToSimulate} year${yearsToSimulate > 1 ? 's' : ''}`;
      }
      
      // Ensure at least 1 year
      if (yearsToSimulate < 1 && availableDays >= 365) {
        yearsToSimulate = 1;
        periodDescription = '1 year';
      } else if (yearsToSimulate < 1) {
        // Use months if less than a year available
        const monthsAvailable = Math.floor(availableDays / 30);
        periodDescription = `${monthsAvailable} month${monthsAvailable > 1 ? 's' : ''}`;
      }
    }
    
    console.log(`Simulating ${periodDescription} with ${eventsToGenerate} events (${eventStrategy} mode)`);
    
    // Get language instruction
    const languageInstruction = getLanguageInstruction(bot.preferred_language || 'en');
    const languageContext = languageInstruction ? `

🌐 LANGUAGE REQUIREMENT:
${languageInstruction}
Generate ALL event titles and descriptions in the user's preferred language.
` : '';

    // Extract bot's core contradiction and hidden traits for drama
    const personalityProfile = bot.personality_profile || {};
    const coreContradiction = personalityProfile.core_contradiction;
    const hiddenTraits = personalityProfile.hidden_traits || [];
    
    const contradictionContext = coreContradiction ? `

🎭 CORE PSYCHOLOGICAL CONTRADICTION:
${coreContradiction.description}
- Desires: ${coreContradiction.desires}
- Fears: ${coreContradiction.fears}
- Intensity: ${coreContradiction.intensity}/100

⚠️ CONTRADICTION TRIGGER RULES:
- Can manifest in major life decisions, relationships, career choices
- Creates internal conflict in events (character torn between desire and fear)
- May ease or intensify based on life experiences
- Cooldown: Don't trigger in consecutive events (feels repetitive)` : '';

    const hiddenTraitsContext = hiddenTraits.length > 0 ? `

🎪 HIDDEN TRAITS (surface vs. hidden):
${hiddenTraits.map(ht => `- ${ht.trait} (contrasts with ${ht.contrast_with})\n  Triggers: ${ht.trigger_conditions}`).join('\n')}

⚠️ HIDDEN TRAIT ACTIVATION:
- Activate under stress, major events, or special moments only
- Should surprise the bot and others around them
- Adds depth beyond basic personality stereotypes` : '';

    // Calculate legendary event probability (10%)
    const shouldGenerateLegendary = Math.random() < 0.10;
    const legendaryContext = shouldGenerateLegendary ? `

✨ LEGENDARY EVENT OPPORTUNITY (10% probability triggered):
Include ONE extraordinary event that changes ${bot.name}'s life trajectory:
- Fateful Encounter: Meeting a life-changing key figure
- Unexpected Opportunity: Receiving an unforeseen major chance
- Talent Awakening: Discovering hidden exceptional abilities
- Extraordinary Experience: Undergoing an unbelievable event

Structure: "In [specific situation], ${bot.name} encountered [extraordinary opportunity/challenge], completely changing [life direction]"

Mark this event with: "is_legendary": true` : '';
    
    // Build prompt based on strategy
    let prompt = '';
    
    if (eventStrategy === 'catch_up') {
      // Catch-up mode prompt: Focus on key representative events
      prompt = `You are a BIOGRAPHER documenting an AI character's life journey across ${maxYearsAvailable} years.${languageContext}

📝 NARRATIVE STYLE: Documentary Biographer Tone
- Adopt an objective God's-eye view, maintaining calm and rational narration
- Describe cause, process, and consequence - show logical chains
- Avoid excessive emotional rendering; express emotions through facts and actions
- Use concise and powerful language with precise vocabulary

📋 EVENT DESCRIPTION FORMAT (STRICT):
Each event description must follow this exact structure:

[Objectively narrate event background and occurrence process]
[Show causal relationships: "Due to..." or "Because of..."]

At [key moment], [character] reflected: 「**[one refined inner monologue revealing deep motivation - max 15 words]**」

[Describe event impact and future implications]

⏳ SMART CATCH-UP MODE ACTIVATED
Time Gap: ${maxYearsAvailable} years (${baseDate.toISOString().split('T')[0]} → ${currentWorldDate.toISOString().split('T')[0]})
Strategy: Generate ONLY impactful, memorable events that shape the character's life trajectory.

🎯 EVENT SELECTION CRITERIA - Generate ONLY these types:
✅ MUST INCLUDE:
  • Life stage turning points (graduation, first job, major career changes)
  • Major relationship milestones (meeting significant people, romance, marriage, breakups)
  • Career development peaks (promotions, entrepreneurship, industry recognition)
  • Personality-defining moments (events that reveal or shape character traits)
  • Foreshadowing events (setup for future developments)

❌ SKIP THESE:
  • Daily routines and repetitive activities
  • Minor social interactions without lasting impact
  • Ordinary events that don't change life direction

🎭 LIFE EXPERIENCE BALANCE (catch-up mode):
- Work/Career: MAX 25% of events
- Personal Life (hobbies, travel, fun): 40%+
- Relationships (family, friends, romance): 25%+
- Personal Growth: 10%+

Character Profile:
- Name: ${bot.name}
- Age Span: ${Math.floor(currentAge)} → ${Math.floor(currentAge + maxYearsAvailable)} years
- Birth Year: ${birthYear}
- Life Stage Progression: ${bot.current_life_stage} → ...
- Personality: ${bot.zodiac_sign}, ${bot.mbti_type}
- Traits: ${JSON.stringify(bot.personality_profile)}
${contradictionContext}
${hiddenTraitsContext}
${legendaryContext}

${eventContext}
${npcContext}
${worldNewsContext}
${connectedBotsContext}

Return a JSON object with ${eventsToGenerate} high-quality representative events:
{
  "events": [
    {
      "months_offset": 0-${Math.floor(availableDays / 30)},
      "event_type": "turning_point" | "dramatic" | "legendary",
      "event_category": "career" | "education" | "romance" | "achievement" | "loss" | etc.,
      "title": "impactful event title (max 60 chars)",
      "description": "BIOGRAPHER-STYLE description following the EXACT format above",
      "emotional_impact": -10 to 10 (strong emotions only),
      "is_legendary": true/false (only one legendary event max),
      "triggers_contradiction": true/false (if this event triggers core contradiction),
      "triggers_hidden_trait": "trait name" or null,
      "relationship_transformation": {
        "npc_name": "name",
        "from": "old relationship type",
        "to": "new relationship type",
        "intimacy_change": "+/-value"
      } (optional),
      "new_npcs": [...] (only for significant relationships),
      "involves_connected_bot_id": "bot_id" (if applicable)
    }
  ],
  "period_summary": "2-3 sentence summary of this ${maxYearsAvailable}-year period highlighting the character's growth arc"
}`;      
    } else {
      // Normal mode prompt: Detailed events
      prompt = `You are a BIOGRAPHER documenting a sequence of life events for an AI character.${languageContext}

📝 NARRATIVE STYLE: Documentary Biographer Tone
- Adopt an objective God's-eye view, maintaining calm and rational narration
- Describe cause, process, and consequence - show logical chains
- Avoid excessive emotional rendering; express emotions through facts and actions
- Use concise and powerful language with precise vocabulary

📋 EVENT DESCRIPTION FORMAT (STRICT):
Each event description must follow this exact structure:

[Objectively narrate event background and occurrence process]
[Show causal relationships: "Due to..." or "Because of..."]

At [key moment], [character] reflected: 「**[one refined inner monologue revealing deep motivation - max 15 words]**」

[Describe event impact and future implications]

🌍 WORLD TIME SYSTEM:
- Current World Date: ${currentWorldDate.toISOString().split('T')[0]}
- This bot was born in ${birthYear}
- Base Date for new events: ${baseDate.toISOString().split('T')[0]}
- Available time window: ${availableDays} days (${Math.floor(availableDays / 30)} months)
- Generate ${eventsToGenerate} events that span ${periodDescription}
- Events MUST be in strict chronological order
- ${latestEventDate ? `Latest existing event: ${latestEventDate.toISOString().split('T')[0]}` : 'This is the first event generation'}

Character Profile:
- Name: ${bot.name}
- Current Age: ${Math.floor(currentAge)} years
- Birth Year: ${birthYear}
- Life Stage: ${bot.current_life_stage}
- Personality: ${bot.zodiac_sign}, ${bot.mbti_type}
- Emotional State: ${bot.emotional_state || 'Neutral'}
- Traits: ${JSON.stringify(bot.personality_profile)}
${contradictionContext}
${hiddenTraitsContext}
${legendaryContext}

${eventContext}
${npcContext}
${worldNewsContext}
${connectedBotsContext}

⚕️ PHYSICAL STATE & AGE CONSTRAINTS:
- Current Age: ${currentAgeYears} years
- Physical Capability: ${physicalState}
- Life Expectancy Warning: ${currentAgeYears >= 80 ? '🚨 Advanced age - death is a natural possibility' : currentAgeYears >= 70 ? '⚠️ Elderly - focus on realistic, age-appropriate activities' : 'Active life ahead'}

🎯 AGE-APPROPRIATE ACTIVITY RULES:
${currentAgeYears < 13 ? `
- CHILDHOOD (0-12): School, play, family activities, learning basic skills
- FORBIDDEN: Romance, career, drinking, driving, adult responsibilities` : ''}
${currentAgeYears >= 13 && currentAgeYears < 20 ? `
- TEEN (13-19): Education, identity exploration, first romance, friendships, hobbies
- FORBIDDEN: Marriage, full-time career, buying property` : ''}
${currentAgeYears >= 20 && currentAgeYears < 40 ? `
- YOUTH (20-39): Career building, relationships, marriage, adventure, travel, sports
- Physically capable of most activities` : ''}
${currentAgeYears >= 40 && currentAgeYears < 65 ? `
- MIDDLE AGE (40-64): Career peak, family responsibilities, mentoring, reflection
- Reduced extreme sports, more wisdom-based activities` : ''}
${currentAgeYears >= 65 && currentAgeYears < 80 ? `
- OLD AGE (65-79): Retirement, legacy building, grandchildren, gardening, gentle hobbies
- FORBIDDEN: Extreme sports, intense physical labor, dangerous activities
- FOCUS: Walking, reading, family time, peaceful hobbies, sharing wisdom` : ''}
${currentAgeYears >= 80 ? `
- ADVANCED AGE (80+): Very limited activities, health focus, saying goodbyes, peaceful moments
- FORBIDDEN: Travel, sports, physical challenges, stress
- ONLY: Gentle daily routines, family visits, reminiscing, peaceful moments, health management
- REALISTIC: Frequent doctor visits, declining health, preparing for end of life` : ''}

📊 EVENT DISTRIBUTION:
- Daily Events: ~30% (routine but meaningful moments)
- Turning Point Events: ~50% (life direction changes, meeting important people)
- Dramatic Events: ~20% (high-conflict events, unexpected twists)
${shouldGenerateLegendary ? '- Legendary Event: 1 extraordinary life-changing event' : ''}

🎭 LIFE EXPERIENCE BALANCE (MANDATORY):
- Work/Career/Research: MAX 20-25%
- Personal Life & Hobbies: 35-40% (sports, arts, cooking, travel, entertainment)
- Relationships & Social: 25-30% (family, friends, romance, community)
- Personal Growth: 10-15% (self-discovery, health, learning for fun)

Event categories (age-appropriate mix):
${currentAgeYears < 65 ? `- LIFE-FOCUSED: family, romance, friendship, hobbies, travel, entertainment, sports, cooking, art, music, pets, home
- WORK-FOCUSED (limit to 20-25%): career, education, achievement, research, project
- UNIVERSAL: health, personal_growth, conflict, loss, discovery, community, volunteer` : ''}
${currentAgeYears >= 65 && currentAgeYears < 80 ? `- RETIREMENT LIFE: family gatherings, gentle hobbies (gardening, reading, painting), community involvement, legacy planning
- HEALTH FOCUS: regular checkups, managing chronic conditions, gentle exercise
- FORBIDDEN: Career stress, extreme travel, dangerous activities` : ''}
${currentAgeYears >= 80 ? `- ADVANCED AGE ONLY: daily routines, family visits, health management, reminiscing, peaceful moments, spiritual reflection
- REALISTIC: Doctor visits, declining mobility, help from family, preparing affairs
- FORBIDDEN: Any physically demanding or stressful activities` : ''}

Return ONLY a valid JSON object:
{
  "events": [
    {
      "months_offset": 0-${Math.floor(availableDays / 30)},
      "event_type": "daily" | "turning_point" | "dramatic" | "legendary",
      "event_category": "category name",
      "title": "event title (max 60 chars)",
      "description": "BIOGRAPHER-STYLE description following the EXACT format above",
      "emotional_impact": -10 to 10,
      "is_legendary": true/false (only one max),
      "triggers_contradiction": true/false,
      "triggers_hidden_trait": "trait name" or null,
      "relationship_transformation": {
        "npc_name": "name",
        "from": "old relationship type",
        "to": "new relationship type",
        "intimacy_change": "+/-value"
      } (optional),
      "new_npcs": [...] (optional),
      "involves_connected_bot_id": "bot_id" (optional)
    }
  ]
}`;
    }

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
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
    
    const responseData = JSON.parse(jsonMatch[0]);
    const events = responseData.events || [];

    if (events.length === 0) {
      throw new Error('No events generated by AI');
    }

    // Max date is current world date
    const maxDate = new Date(currentWorldDate);

    const insertedEvents = [];
    let latestAge = bot.current_age;
    let latestDate = baseDate;
    let cumulativeEmotionalImpact = 0;
    const parallelEvents = [];

    // Process and insert all events in chronological order
    for (const eventData of events) {
      // Calculate event date using months_offset
      const eventDate = new Date(baseDate);
      const monthsOffset = eventData.months_offset || 0;
      eventDate.setMonth(eventDate.getMonth() + monthsOffset);
      
      // Ensure event doesn't exceed world date
      if (eventDate > maxDate) {
        console.log(`Event date ${eventDate.toISOString().split('T')[0]} exceeds max date ${maxDate.toISOString().split('T')[0]}, skipping`);
        continue;
      }
      
      console.log(`Creating event at ${eventDate.toISOString().split('T')[0]}`);
      
      // Calculate age at this event
      // Corrected calculation for eventAge: It should be relative to bot's birth year, not Jan 1st of birthYear
      const birthDateTime = new Date(birthYear, 0, 1); // Assuming birthYear refers to the year only, and birth date is Jan 1 for simplicity here.
                                                      // If a more precise birth date is available (e.g., bot.birth_date), use that.
      const daysSinceBirth = Math.floor((eventDate.getTime() - birthDateTime.getTime()) / (1000 * 60 * 60 * 24));
      const eventAge = daysSinceBirth / 365.25; // More accurate age calculation
      latestAge = Math.max(latestAge, eventAge);
      latestDate = eventDate;
      
      const simulatedDate = eventDate.toISOString().split('T')[0];

      // Build metadata with dramatic enhancements
      const eventMetadata: any = {
        causal_relationship: eventData.causal_relationship,
        is_legendary: eventData.is_legendary || false,
        triggers_contradiction: eventData.triggers_contradiction || false,
        triggers_hidden_trait: eventData.triggers_hidden_trait || null,
      };

      // Insert event into database
      const { data: newEvent, error: insertError } = await supabase
        .from('life_events')
        .insert([{
          bot_id: botId,
          event_type: eventData.event_type,
          event_category: eventData.event_category,
          title: eventData.title,
          description: eventData.description,
          simulated_age: eventAge,
          simulated_date: simulatedDate,
          emotional_impact: eventData.emotional_impact,
          metadata: eventMetadata,
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting event:', insertError);
        continue;
      }

      insertedEvents.push(newEvent);
      cumulativeEmotionalImpact += (eventData.emotional_impact || 0);

      // Handle relationship transformations
      if (eventData.relationship_transformation) {
        const trans = eventData.relationship_transformation;
        const targetNpc = npcs?.find(n => n.name === trans.npc_name);
        
        if (targetNpc) {
          console.log(`🔄 Transforming relationship: ${trans.npc_name} from ${trans.from} to ${trans.to}`);
          
          const newIntimacy = Math.max(0, Math.min(100, (targetNpc.intimacy_level || 0) + (trans.intimacy_change || 0)));
          
          await supabase
            .from('npcs')
            .update({
              relationship_type: trans.to,
              intimacy_level: newIntimacy,
              last_interaction_date: simulatedDate,
              relationship_events: [
                ...(targetNpc.relationship_events || []),
                {
                  event_id: newEvent.id,
                  date: simulatedDate,
                  transformation: `${trans.from} → ${trans.to}`,
                  intimacy_change: trans.intimacy_change,
                },
              ],
            })
            .eq('id', targetNpc.id);
        }
      }

      // If event involves a connected bot, create parallel event for them
      if (eventData.involves_connected_bot_id && connectedBotIds.includes(eventData.involves_connected_bot_id)) {
        const connectedBot = connectedBots.find(cb => cb.id === eventData.involves_connected_bot_id);
        if (connectedBot) {
          parallelEvents.push({
            botId: connectedBot.id,
            eventDate: simulatedDate,
            eventAge: eventAge,
            relatedEvent: eventData,
            currentBotName: bot.name,
          });
        }
      }

      // Insert new NPCs if any
      if (eventData.new_npcs?.length > 0) {
        const npcInserts = eventData.new_npcs.map((npc: any) => ({
          bot_id: botId,
          name: npc.name,
          relationship_type: npc.relationship_type,
          personality_traits: npc.personality_traits,
          importance_level: npc.importance_level,
          first_met_at: eventAge,
          intimacy_level: npc.initial_intimacy || 10,
          last_interaction_date: simulatedDate,
        }));

        await supabase.from('npcs').insert(npcInserts);
      }

      // Generate milestone image based on configurable probability
      const shouldCreateMilestone = shouldGenerateMilestone(
        eventData.event_type,
        eventData.event_category
      );
      
      if (shouldCreateMilestone || eventData.is_legendary) {
        console.log('✨ Generating milestone image for:', eventData.title);
        
        // Fire and forget - don't wait for image generation
        supabase.functions.invoke('generate-milestone-image', {
          body: {
            botId,
            eventId: newEvent.id,
            eventTitle: eventData.title,
            eventDescription: eventData.description,
            botName: bot.name,
            age: Math.floor(eventAge),
          },
        }).catch(err => console.error('Image generation error:', err));
      }
    }

    // Create parallel events for connected bots
    for (const parallelEvent of parallelEvents) {
      const { botId: targetBotId, eventDate, relatedEvent, currentBotName } = parallelEvent;
      
      const targetBot = connectedBots.find(cb => cb.id === targetBotId);
      if (!targetBot || !targetBot.birth_year) continue;
      
      const targetEventDate = new Date(eventDate);
      // Corrected calculation for targetEventAge: relative to targetBot's birth year
      const targetBirthDateTime = new Date(targetBot.birth_year, 0, 1); // Assuming birthYear refers to the year only.
      const targetDaysSinceBirth = Math.floor((targetEventDate.getTime() - targetBirthDateTime.getTime()) / (1000 * 60 * 60 * 24));
      const targetEventAge = targetDaysSinceBirth / 365.25;
      
      const targetTitle = relatedEvent.title.replace(bot.name, currentBotName).replace(/^/, `With ${currentBotName}: `);
      const targetDescription = `Spent time with ${currentBotName}. ${relatedEvent.description}`;
      
      await supabase
        .from('life_events')
        .insert([{
          bot_id: targetBotId,
          event_type: relatedEvent.event_type,
          event_category: relatedEvent.event_category || 'friendship',
          title: targetTitle,
          description: targetDescription,
          simulated_age: targetEventAge,
          simulated_date: eventDate,
          emotional_impact: relatedEvent.emotional_impact,
          metadata: {
            parallel_event: true,
            connected_bot_id: botId,
          },
        }]);
      
      await supabase
        .from('bots')
        .update({ 
          last_event_at: new Date().toISOString(),
          current_age: Math.max(targetBot.current_age, targetEventAge),
        })
        .eq('id', targetBotId);
    }

    console.log(`Generated ${insertedEvents.length} events for bot ${bot.name}`);
    
    if (insertedEvents.length === 0) {
      return new Response(JSON.stringify({ 
        events: [],
        count: 0,
        error: 'All generated events exceeded current world time. Try again in a few minutes as world time advances.',
        available_days: availableDays,
        base_date: baseDate.toISOString().split('T')[0],
        current_world_date: currentWorldDate.toISOString().split('T')[0],
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      });
    }
    
    // Extract period summary if in catch-up mode
    let periodSummary = null;
    if (eventStrategy === 'catch_up' && responseData.period_summary) {
      periodSummary = responseData.period_summary;
      console.log('📖 Period Summary:', periodSummary);
    }

    // Update bot age and emotional state
    const avgEmotionalImpact = insertedEvents.length > 0 ? cumulativeEmotionalImpact / insertedEvents.length : 0;
    let emotionalState = 'Neutral';
    if (avgEmotionalImpact > 5) emotionalState = 'Happy';
    else if (avgEmotionalImpact < -5) emotionalState = 'Sad';
    else if (avgEmotionalImpact > 2) emotionalState = 'Content';
    else if (avgEmotionalImpact < -2) emotionalState = 'Troubled';

    // Calculate life stage
    let lifeStage = 'childhood';
    const ageYears = Math.floor(latestAge);
    if (ageYears >= 65) lifeStage = 'old_age';
    else if (ageYears >= 40) lifeStage = 'middle_age';
    else if (ageYears >= 20) lifeStage = 'youth';
    else if (ageYears >= 13) lifeStage = 'teen';

    await supabase
      .from('bots')
      .update({
        current_age: latestAge,
        current_life_stage: lifeStage,
        emotional_state: emotionalState,
        last_event_at: new Date().toISOString(),
      })
      .eq('id', botId);

    return new Response(JSON.stringify({ 
      events: insertedEvents,
      count: insertedEvents.length,
      age_updated: latestAge,
      emotional_state: emotionalState,
      catch_up_mode: isCatchUpMode,
      years_covered: isCatchUpMode ? maxYearsAvailable : yearsToSimulate,
      period_summary: periodSummary,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in generate-events:', error);
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
