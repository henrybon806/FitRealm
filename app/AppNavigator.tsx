import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native'; // important
import LoginScreen from '../screens/LoginScreen';
import CharacterScreen from '../screens/CharacterScreen';
import QuestScreen from '../screens/QuestScreen';
import RewardsScreen from '../screens/Rewards';
import { RootStackParamList } from '../types/navigation';
import CreateGuildScreen from '../screens/CreateGuildScreen';
import JoinGuildScreen from '../screens/JoinGuildScreen';
import { RouteProp } from '@react-navigation/native';
import GuildHomeScreen from '@/screens/GuildHomeScreen';
import GuildChatScreen from '@/screens/GuildChatScreen';
import GuildDetailsScreen from '@/screens/GuildDetailsScreen';
import GuildEventsScreen from '@/screens/GuildEventsScreen';
import CreateEventScreen from '@/screens/CreateEventScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

type MainTabsProps = {
  route: RouteProp<RootStackParamList, 'Main'>;
};

const TabIcon = ({ name, focused }: { name: string, focused: boolean }) => (
  <Text style={{ 
    fontSize: 20, 
    color: focused ? '#4e60d3' : '#888',
    marginBottom: -3 
  }}>
    {name === 'Character' ? '👤' : name === 'Quests' ? '⚔️' : name === 'Rewards' ? '🏆' : '🛡️'}
  </Text>
);

function MainTabs({ route }: MainTabsProps) {
  const initialRouteName = route.params?.screen ?? 'Character';
  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1e1e2e',
          borderTopColor: '#2a2a40',
        },
        tabBarActiveTintColor: '#4e60d3',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Character" 
        component={CharacterScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Character" focused={focused} />
        }}
      />
      <Tab.Screen 
        name="Quests" 
        component={QuestScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Quests" focused={focused} />
        }}
      />
      <Tab.Screen 
        name="Rewards" 
        component={RewardsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Rewards" focused={focused} />
        }}
      />

      <Tab.Screen 
        name="Guilds" 
        component={GuildHomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Guilds" focused={focused} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="CreateGuild" component={CreateGuildScreen} /> 
        <Stack.Screen name="JoinGuild" component={JoinGuildScreen} /> 
        <Stack.Screen name="GuildChat" component={GuildChatScreen} />
        <Stack.Screen name="GuildDetails" component={GuildDetailsScreen} />  
        <Stack.Screen name="GuildEvents" component={GuildEventsScreen} />
        <Stack.Screen name="CreateEvent" component={CreateEventScreen} />        
      </Stack.Navigator>
  );
}