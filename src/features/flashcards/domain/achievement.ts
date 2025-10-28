export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  category: 'cards' | 'sessions' | 'streaks' | 'mastery';
  progress: {
    current: number;
    required: number;
    description: string;
  };
}
