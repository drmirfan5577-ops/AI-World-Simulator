import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

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

    const { 
      botId, 
      eventId, 
      eventTitle, 
      eventDescription, 
      botName, 
      age,
      // Optional dual-bot milestone data
      isDualBotMilestone,
      secondBotName,
      secondBotAge,
      firstBotAvatar,
      secondBotAvatar,
      location,
    } = await req.json();

    console.log('Generating milestone image for:', eventTitle, isDualBotMilestone ? '(dual-bot)' : '(single-bot)');

    // Create different prompts for single-bot vs dual-bot milestones
    let prompt: string;
    
    if (isDualBotMilestone) {
      // Dual-bot friendship milestone - include both characters
      prompt = `A Osamu Tezuka-style simple line drawing depicting two friends meeting for the first time. 

Scene: ${eventTitle}. ${eventDescription}
Location: ${location || 'casual meeting place'}

Character 1: ${botName} (${firstBotAvatar}), age ${age}, friendly and welcoming expression
Character 2: ${secondBotName} (${secondBotAvatar}), age ${secondBotAge}, warm and happy expression

Both characters should be clearly visible, facing each other or side-by-side, showing the joy of making a new friend. Black and white with slight grayscale, dynamic lines, expressive faces, heartwarming atmosphere, manga aesthetic. The emojis ${firstBotAvatar} and ${secondBotAvatar} can be incorporated as visual elements or character representations.`;
    } else {
      // Single-bot milestone - original logic
      prompt = `A Osamu Tezuka-style simple line drawing depicting: ${eventTitle}. ${eventDescription}. Character name: ${botName}, age ${age}. Black and white with slight grayscale, dynamic lines, expressive face, manga aesthetic.`;
    }

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        modalities: ['image', 'text'],
        image_config: {
          aspect_ratio: '1:1',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('Image generation response:', JSON.stringify(data).substring(0, 200));

    // Extract base64 image data
    const base64ImageUrl = data.choices[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!base64ImageUrl) {
      throw new Error('No image URL in response');
    }

    // Extract base64 data from data URL (remove "data:image/png;base64," prefix)
    const base64Data = base64ImageUrl.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 image data');
    }

    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const fileName = `${botId}_${eventId}_${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('milestone-images')
      .upload(fileName, bytes, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('milestone-images')
      .getPublicUrl(fileName);
    
    const imageUrl = publicUrlData.publicUrl;

    // Determine milestone type
    let milestoneType = 'achievement';
    if (isDualBotMilestone || eventTitle.toLowerCase().includes('met') || eventTitle.toLowerCase().includes('friend')) {
      milestoneType = 'friendship';
    } else if (eventTitle.toLowerCase().includes('love')) {
      milestoneType = 'romance';
    } else if (eventTitle.toLowerCase().includes('graduation')) {
      milestoneType = 'education';
    } else if (eventTitle.toLowerCase().includes('job') || eventTitle.toLowerCase().includes('career')) {
      milestoneType = 'career';
    } else if (eventTitle.toLowerCase().includes('marriage') || eventTitle.toLowerCase().includes('wedding')) {
      milestoneType = 'marriage';
    }
    
    // Store image record in database
    const { error: insertError } = await supabase
      .from('milestone_images')
      .insert([{
        bot_id: botId,
        event_id: eventId,
        image_url: imageUrl,
        prompt_used: prompt,
        milestone_type: milestoneType,
        simulated_age: age,
      }]);

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log('Image uploaded successfully to storage:', fileName);

    return new Response(JSON.stringify({ success: true, imageUrl }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in generate-milestone-image:', error);
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
