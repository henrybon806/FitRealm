// types/navigation.ts
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  Main: { screen?: string };
  GuildStack: undefined;
  CreateGuild: undefined;
  GuildDetails: { guildId: string };
  JoinGuild: undefined;
  GuildChat: { guildId: string };
  GuildEvents: { guildId: string };
  CreateGuildEvent: { guildId: string };
  CreateEvent: { guildId: string };
};

export type MainTabParamList = {
  Character: undefined;
  Quests: undefined;
};
  
export type BottomTabParamList = {
  Character: undefined;
  Quests: undefined;
  Rewards: undefined;
  Guild: undefined; // New tab
};

// This composite type allows navigating from a tab screen while having access to the root stack
export type CharacterScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Character'>,
  NativeStackNavigationProp<RootStackParamList>
>;