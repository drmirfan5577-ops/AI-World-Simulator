import { useEffect, useRef } from 'react';
import { Network } from 'vis-network/standalone';
import { DataSet } from 'vis-data';
import { Bot } from '@/types';
import { User, Users, Briefcase, Heart, UserMinus, UserPlus } from 'lucide-react';

interface NPC {
  id: string;
  name: string;
  relationship_type: string;
  importance_level: number;
  personality_traits?: string;
  is_active: boolean;
  linked_bot_id?: string; // If this NPC is actually another player's bot
}

interface RelationshipGraphProps {
  bot: Bot;
  npcs: NPC[];
}

// Map relationship types to colors and layers
const getRelationshipConfig = (relationshipType: string, importanceLevel: number, isPlayerBot: boolean) => {
  const type = relationshipType.toLowerCase();
  
  // Player bots get distinctive green color
  if (isPlayerBot) {
    return {
      color: '#10B981', // Green - player bot
      layer: 2, // Always in second layer for visibility
    };
  }
  
  // Determine color based on relationship type (NPCs only)
  let color = '#6B7280'; // Gray - neutral
  let layer = 3; // Default to outer layer
  
  if (type.includes('family') || type.includes('parent') || type.includes('sibling')) {
    color = '#EF4444'; // Red - intimate
    layer = 1;
  } else if (type.includes('lover') || type.includes('spouse') || type.includes('partner')) {
    color = '#EF4444'; // Red - intimate
    layer = 1;
  } else if (type.includes('close friend') || type.includes('best friend')) {
    color = '#F59E0B'; // Orange - friendly
    layer = 1;
  } else if (type.includes('friend')) {
    color = '#F59E0B'; // Orange - friendly
    layer = 2;
  } else if (type.includes('colleague') || type.includes('coworker')) {
    color = '#6B7280'; // Gray - neutral
    layer = importanceLevel >= 4 ? 2 : 3;
  } else if (type.includes('rival') || type.includes('enemy')) {
    color = '#374151'; // Dark gray - negative
    layer = 2;
  } else if (type.includes('acquaintance') || type.includes('neighbor')) {
    color = '#6B7280'; // Gray - neutral
    layer = 3;
  }
  
  // Importance level can override layer
  if (importanceLevel >= 5) layer = 1;
  else if (importanceLevel >= 3) layer = Math.min(layer, 2);
  
  return { color, layer };
};

// Get node icon based on relationship type
const getNodeIcon = (relationshipType: string) => {
  const type = relationshipType.toLowerCase();
  
  if (type.includes('family') || type.includes('parent') || type.includes('sibling')) {
    return '\ue001'; // Family icon placeholder
  } else if (type.includes('lover') || type.includes('spouse') || type.includes('partner')) {
    return '♥';
  } else if (type.includes('friend')) {
    return '\ue002'; // Friend icon placeholder
  } else if (type.includes('colleague') || type.includes('coworker')) {
    return '\ue003'; // Briefcase icon placeholder
  } else if (type.includes('rival') || type.includes('enemy')) {
    return '⚔';
  }
  
  return '\ue004'; // Default person icon
};

export function RelationshipGraph({ bot, npcs }: RelationshipGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create nodes
    const nodes = new DataSet([
      // Central node - the bot itself
      {
        id: 'center',
        label: bot.name,
        shape: 'circularImage',
        image: bot.avatar_url || 'https://via.placeholder.com/100?text=' + bot.name[0],
        size: 50,
        borderWidth: 4,
        borderWidthSelected: 6,
        color: {
          border: '#3B82F6',
          background: '#DBEAFE',
          highlight: {
            border: '#2563EB',
            background: '#BFDBFE',
          },
        },
        font: {
          size: 16,
          color: '#1F2937',
          face: 'Inter, sans-serif',
          bold: true,
        },
        fixed: { x: true, y: true },
        x: 0,
        y: 0,
      },
    ]);

    // Create edges
    const edges = new DataSet<any>([]);

    // Add NPC nodes
    npcs.forEach((npc) => {
      if (!npc.is_active) return;

      const isPlayerBot = !!npc.linked_bot_id;
      const { color, layer } = getRelationshipConfig(npc.relationship_type, npc.importance_level, isPlayerBot);
      const icon = getNodeIcon(npc.relationship_type);
      
      // Calculate position based on layer (will be adjusted by physics)
      const angle = Math.random() * 2 * Math.PI;
      const radius = layer * 150;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // Add NPC node (or player bot node)
      nodes.add({
        id: npc.id,
        label: npc.name,
        shape: isPlayerBot ? 'diamond' : 'dot', // Diamond for player bots, dot for NPCs
        size: isPlayerBot ? 30 : (25 - (layer * 3)), // Larger for player bots
        color: {
          border: color,
          background: color + (isPlayerBot ? '60' : '40'), // More solid for player bots
          highlight: {
            border: color,
            background: color + '80',
          },
        },
        borderWidth: isPlayerBot ? 3 : 2, // Thicker border for player bots
        font: {
          size: isPlayerBot ? 14 : 12, // Larger font for player bots
          color: '#1F2937',
          face: 'Inter, sans-serif',
          bold: isPlayerBot, // Bold for player bots
        },
        title: isPlayerBot 
          ? `🤖 Player Bot\n${npc.relationship_type}\n${npc.personality_traits || ''}`
          : `${npc.relationship_type}\n${npc.personality_traits || ''}`,
        x,
        y,
      });

      // Add edge connecting to center
      const edgeWidth = Math.max(1, npc.importance_level);
      const isStable = npc.importance_level >= 3;
      
      edges.add({
        from: 'center',
        to: npc.id,
        width: edgeWidth,
        color: {
          color: color,
          highlight: color,
          opacity: 0.7,
        },
        dashes: !isStable, // Dashed for new/fragile relationships
        smooth: {
          type: 'continuous',
        },
      });
    });

    // Network options
    const options = {
      nodes: {
        font: {
          size: 14,
          color: '#1F2937',
          face: 'Inter, sans-serif',
        },
        scaling: {
          min: 10,
          max: 50,
        },
      },
      edges: {
        smooth: {
          type: 'continuous',
          roundness: 0.5,
        },
        scaling: {
          min: 1,
          max: 5,
        },
      },
      physics: {
        enabled: true,
        stabilization: {
          enabled: true,
          iterations: 200,
          updateInterval: 25,
        },
        barnesHut: {
          gravitationalConstant: -8000,
          centralGravity: 0.3,
          springLength: 150,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.5,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
      },
      layout: {
        improvedLayout: true,
      },
    };

    // Create network
    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;

    // Add event listeners
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        if (nodeId !== 'center') {
          console.log('Clicked NPC:', nodeId);
        }
      }
    });

    // Cleanup
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [bot, npcs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relationship Network</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Explore {bot.name}'s social connections and relationships
          </p>
        </div>
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rotate-45 bg-green-500 border-2 border-green-600" />
            <span className="font-semibold">Player Bots</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500" />
            <span>Intimate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-orange-500" />
            <span>Friendly</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-gray-500" />
            <span>NPCs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-gray-700 border-dashed border-t-2 border-gray-700" />
            <span>Negative</span>
          </div>
        </div>
      </div>

      <div 
        ref={containerRef} 
        className="w-full h-[600px] border border-border rounded-lg bg-background/50"
        style={{ minHeight: '600px' }}
      />

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="font-semibold text-foreground">Inner Circle</span>
          </div>
          <p className="text-muted-foreground">
            {npcs.filter(n => n.is_active && getRelationshipConfig(n.relationship_type, n.importance_level).layer === 1).length} people
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-foreground">Close Contacts</span>
          </div>
          <p className="text-muted-foreground">
            {npcs.filter(n => n.is_active && getRelationshipConfig(n.relationship_type, n.importance_level).layer === 2).length} people
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-foreground">Acquaintances</span>
          </div>
          <p className="text-muted-foreground">
            {npcs.filter(n => n.is_active && getRelationshipConfig(n.relationship_type, n.importance_level).layer === 3).length} people
          </p>
        </div>
      </div>
    </div>
  );
}
