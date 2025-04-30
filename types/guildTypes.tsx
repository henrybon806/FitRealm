export interface Guild {
    id: string;
    name: string;
    description: string;
    banner_url?: string;
    emblem?: string;
    motto?: string;
    leader_id: string;
    member_count: number;
    level: number;
    xp: number;
    created_at: string;
  }
  
  export interface GuildMember {
    id: string;
    guild_id: string;
    user_id: string;
    role: 'leader' | 'officer' | 'member';
    joined_at: string;
    contribution_points: number;
    character_name: string;
    character_level: number;
  }
  
  export interface GuildMessage {
    id: string;
    guild_id: string;
    user_id: string;
    character_name: string;
    content: string;
    created_at: string;
  }
  
  export interface GuildEvent {
    id: string;
    guild_id: string;
    title: string;
    description: string;
    event_type: 'challenge' | 'raid' | 'tournament' | 'workout' | 'competition' | 'meetup';
    start_date: string;
    end_date: string;
    reward_description: string;
    xp_reward: number;
    status: 'upcoming' | 'active' | 'completed';
    required_workout_type?: 'strength' | 'speed' | 'magic' | 'willpower';
    goal?: number;
    current_progress?: number;
  }

 
  