import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from '../screens/LoginScreen';
import CharacterScreen from '../screens/CharacterScreen';
import QuestScreen from '../screens/QuestScreen';
import { RootStackParamList } from '../types/navigation';
import { RouteProp } from '@react-navigation/native';

type MainTabsProps = {
  route: RouteProp<RootStackParamList, 'Main'>;
};

// For tab icons (you can use a library like react-native-vector-icons later)
const TabIcon = ({ name, focused }: { name: string, focused: boolean }) => (
  <Text style={{ 
    fontSize: 20, 
    color: focused ? '#4e60d3' : '#888',
    marginBottom: -3 
  }}>
    {name === 'Character' ? '👤' : name === 'Quests' ? '⚔️' : '🏆'}
  </Text>
);

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs({ route }: MainTabsProps) {
  const initialRouteName = route.params?.screen ?? 'Character'
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
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
  );
}