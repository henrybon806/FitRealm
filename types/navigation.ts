// types/navigation.ts
export type RootStackParamList = {
    Login: undefined;
    Character: undefined;
    Quest: undefined;
    Main: { screen?: 'Character' | 'Quests' };
  };

  export type MainTabParamList = {
    Character: undefined;
    Quests: undefined;
  };
  

