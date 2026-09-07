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

    // Get current world time
    const currentWorldDate = await getCurrentWorldTime(supabase);
    console.log('Current world time:', currentWorldDate.toISOString().split('T')[0]);

    // Check last world news entry
    const { data: lastNews, error: lastNewsError } = await supabase
      .from('world_news')
      .select('simulated_date')
      .order('simulated_date', { ascending: false })
      .limit(1)
      .single();

    let shouldGenerate = true;
    let yearsSinceLastNews = 0;

    if (!lastNewsError && lastNews) {
      const lastNewsDate = new Date(lastNews.simulated_date);
      yearsSinceLastNews = Math.floor(
        (currentWorldDate.getTime() - lastNewsDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      );
      
      console.log(`Last world news: ${lastNews.simulated_date}, Years since: ${yearsSinceLastNews}`);
      
      // Generate new world news every 5-10 years
      if (yearsSinceLastNews < 5) {
        shouldGenerate = false;
      }
    } else {
      console.log('No existing world news found, will generate initial events');
    }

    if (!shouldGenerate) {
      return new Response(JSON.stringify({
        generated: false,
        message: `World news is current. Next generation in ${5 - yearsSinceLastNews} years.`,
        years_since_last: yearsSinceLastNews,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Fetch recent world news for context (last 20 years)
    const twentyYearsAgo = new Date(currentWorldDate);
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
    const { data: recentNews } = await supabase
      .from('world_news')
      .select('*')
      .gte('simulated_date', twentyYearsAgo.toISOString().split('T')[0])
      .order('simulated_date', { ascending: false });

    const newsHistory = recentNews?.length > 0
      ? `\n📰 RECENT WORLD NEWS HISTORY (for context):\n${recentNews.map(n => 
          `- [${n.simulated_date}] ${n.event_title} (${n.event_type})`
        ).join('\n')}\n\n⚠️ Build upon this history, create logical progression of world events.`
      : '\n📰 This is the first generation of world news. Create a foundation for future events.';

    // Determine how many years to generate events for
    const yearsToGenerate = Math.min(yearsSinceLastNews || 10, 15); // Max 15 years per generation
    const numberOfEvents = Math.ceil(yearsToGenerate / 5); // 1 event per 5 years

    console.log(`Generating ${numberOfEvents} world events spanning ${yearsToGenerate} years`);

    const prompt = `You are generating REALISTIC GLOBAL EVENTS for a life simulation world.

🌍 WORLD CONTEXT:
- Current World Date: ${currentWorldDate.toISOString().split('T')[0]}
- Years to cover: ${yearsToGenerate} years
- Generate: ${numberOfEvents} major global events
${newsHistory}

📋 EVENT TYPES & EXAMPLES:

【Economic Events】
- Financial crises, market crashes, economic booms
- New industries emerging (tech bubble, green energy revolution)
- Trade wars, currency fluctuations
- Unemployment waves, inflation surges

【Social Events】
- Major policy changes (healthcare reform, education overhaul)
- Cultural movements (digital revolution, sustainability movement)
- Social justice movements
- Demographic shifts (aging population, urbanization)

【Technological Events】
- Breakthrough inventions (quantum computing, AI revolution)
- Infrastructure changes (high-speed rail networks, 5G/6G)
- Space exploration milestones
- Medical breakthroughs

【Natural Events】
- Pandemics, epidemics
- Climate events (severe droughts, flooding patterns)
- Natural disasters (major earthquakes, volcanic eruptions)
- Environmental policies in response

🎯 GENERATION RULES:

1. **Realism**: Events should feel plausible for the time period
2. **Impact Scope**: 
   - "global" (affects everyone worldwide)
   - "regional" (specific continents/regions)
   - "industry-specific" (affects certain professions/sectors)

3. **Causal Relationships**: 
   - Events should logically flow from previous world news
   - Create consequences and ripple effects

4. **Diversity**: Mix different event types (don't generate 3 economic events in a row)

5. **Career Impact**: Specify which career categories get affected:
   - tech, healthcare, finance, education, manufacturing, agriculture, arts, etc.

6. **Timing**: Spread events across the ${yearsToGenerate} year period
   - Don't cluster all events in one year
   - Use realistic intervals (e.g., economic recovery takes 3-5 years)

Return ONLY a valid JSON array:
[
  {
    "event_title": "clear, impactful title (max 80 chars)",
    "event_description": "2-3 sentences describing the event and its impact on people's lives",
    "event_type": "economic" | "social" | "natural" | "technological",
    "impact_scope": "global" | "regional" | "industry-specific",
    "years_from_now": 0-${yearsToGenerate} (when this event occurs relative to current date),
    "affected_categories": ["career1", "career2", ...] (which professions/life areas affected),
    "severity": 1-10 (1=minor inconvenience, 10=life-changing crisis)
  }
]

Generate ${numberOfEvents} diverse, realistic global events.`;

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
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const events = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(events) || events.length === 0) {
      throw new Error('No events generated by AI');
    }

    // Insert world news into database
    const newsInserts = events.map((event: any) => {
      const eventDate = new Date(currentWorldDate);
      eventDate.setFullYear(eventDate.getFullYear() - (yearsToGenerate - (event.years_from_now || 0)));
      
      return {
        event_title: event.event_title,
        event_description: event.event_description,
        event_type: event.event_type,
        impact_scope: event.impact_scope,
        simulated_date: eventDate.toISOString().split('T')[0],
        affected_categories: event.affected_categories || [],
        metadata: {
          severity: event.severity || 5,
          generated_at: new Date().toISOString(),
        },
      };
    });

    const { data: insertedNews, error: insertError } = await supabase
      .from('world_news')
      .insert(newsInserts)
      .select();

    if (insertError) {
      throw insertError;
    }

    console.log(`Successfully generated ${insertedNews.length} world news events`);

    return new Response(JSON.stringify({
      generated: true,
      count: insertedNews.length,
      years_covered: yearsToGenerate,
      events: insertedNews,
      message: `Generated ${insertedNews.length} world events spanning ${yearsToGenerate} years`,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in generate-world-news:', error);
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
