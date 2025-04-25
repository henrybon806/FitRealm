export interface Character {
  user_id: string;
  name: string;
  level: number;
  xp: number;
  strength: number;
  speed: number;
  magic: number;
  willpower: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'strength' | 'speed' | 'magic' | 'willpower';
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  completed: boolean;
  accepted: boolean;
  deadline?: Date;
}