import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Character, Quest } from '../types/characterTypes';
import { supabase } from '../app/supabase'
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../types/navigation';

type QuestScreenNavigationProp = BottomTabNavigationProp<RootStackParamList, 'Quest'>;


// Mock quests for now - later we'll generate these with AI
const MOCK_QUESTS: Quest[] = [
  {
    id: '1',
    title: 'The Iron Challenge',
    description: 'Complete an upper body workout to prove your strength to the Guild of Iron. The elders speak of those who can move mountains...',
    type: 'strength',
    difficulty: 'medium',
    xpReward: 200,
    completed: false,
    accepted: false
  },
  {
    id: '2',
    title: 'Swift as Wind',
    description: 'The forest spirits have challenged you to prove your speed. Complete a cardio session to earn their respect.',
    type: 'speed',
    difficulty: 'easy',
    xpReward: 100,
    completed: false,
    accepted: false
  },
  {
    id: '3',
    title: 'Arcane Flexibility',
    description: 'The ancient scrolls speak of masters who could bend like reeds in the wind. Complete a yoga session to channel magical energies.',
    type: 'magic',
    difficulty: 'hard',
    xpReward: 300,
    completed: false,
    accepted: false
  }
];

export default function QuestScreen() {
  const navigation = useNavigation<QuestScreenNavigationProp>();
  const [character, setCharacter] = useState<Character | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndQuests = async () => {
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Fetch character data
          const { data: characterData } = await supabase
            .from('characters')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (characterData) {
            setCharacter(characterData as Character);
          }
          
          // In the future, fetch quests from your database or generate with AI
          // For now, use mock quests
          setQuests(MOCK_QUESTS);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndQuests();
  }, []);

  const acceptQuest = (questId: string) => {
    // Update the local state for immediate UI feedback
    const updatedQuests = quests.map(quest => 
      quest.id === questId ? { ...quest, accepted: true } : quest
    );
    setQuests(updatedQuests);
    
    // Here you would also update your database
    // In the future, this would send the quest to the user's active quests
  };
  
  const completeQuest = (quest: Quest) => {
    if (!character) return;
    
    // Here you would verify the quest completion (e.g., check workout data)
    // For now, we'll just mark it as completed and award XP
    
    // Update local state
    const updatedQuests = quests.map(q => 
      q.id === quest.id ? { ...q, completed: true } : q
    );
    setQuests(updatedQuests);
    
    // Fix type issues by using explicit type casting and type guards
    const updatedCharacter = {
      ...character,
      xp: character.xp + quest.xpReward
    };
    
    // Safely update the stat based on quest type
    switch(quest.type) {
      case 'strength':
        updatedCharacter.strength = character.strength + 1;
        break;
      case 'speed':
        updatedCharacter.speed = character.speed + 1;
        break;
      case 'magic':
        updatedCharacter.magic = character.magic + 1;
        break;
      case 'willpower':
        updatedCharacter.willpower = character.willpower + 1;
        break;
    }
    
    setCharacter(updatedCharacter);
    
    // Here you would also update your database
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e60d3" />
        <Text style={styles.loadingText}>Loading quests...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔮 Daily Quests</Text>
      <Text style={styles.subtitle}>Complete quests to earn XP and improve your skills</Text>
      
      {quests.map((quest) => (
        <View key={quest.id} style={styles.questCard}>
          <View style={[styles.questTypeIndicator, getQuestTypeStyle(quest.type)]} />
          <View style={styles.questContent}>
            <Text style={styles.questTitle}>{quest.title}</Text>
            <Text style={styles.questDifficulty}>
              {getDifficultyStars(quest.difficulty)} • {quest.type.charAt(0).toUpperCase() + quest.type.slice(1)}
            </Text>
            <Text style={styles.questDescription}>{quest.description}</Text>
            <View style={styles.questReward}>
              <Text style={styles.questRewardText}>Reward: {quest.xpReward} XP</Text>
            </View>
            
            {quest.completed ? (
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>COMPLETED</Text>
              </View>
            ) : quest.accepted ? (
              <TouchableOpacity 
                style={[styles.questButton, styles.completeButton]} 
                onPress={() => completeQuest(quest)}
              >
                <Text style={styles.buttonText}>Mark Completed</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.questButton} 
                onPress={() => acceptQuest(quest.id)}
              >
                <Text style={styles.buttonText}>Accept Quest</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function getDifficultyStars(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return '★☆☆';
    case 'medium': return '★★☆';
    case 'hard': return '★★★';
    default: return '★☆☆';
  }
}

function getQuestTypeStyle(type: string) {
  switch (type) {
    case 'strength': return { backgroundColor: '#e63946' };
    case 'speed': return { backgroundColor: '#f4a261' };
    case 'magic': return { backgroundColor: '#6a4c93' };
    case 'willpower': return { backgroundColor: '#2a9d8f' };
    default: return { backgroundColor: '#4e60d3' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8f8f2',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#bbb',
    textAlign: 'center',
    marginBottom: 24,
  },
  questCard: {
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  questTypeIndicator: {
    width: 8,
    backgroundColor: '#4e60d3',
  },
  questContent: {
    padding: 16,
    flex: 1,
  },
  questTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  questDifficulty: {
    fontSize: 14,
    color: '#bbb',
    marginBottom: 8,
  },
  questDescription: {
    fontSize: 14,
    color: '#ddd',
    marginBottom: 12,
    lineHeight: 20,
  },
  questReward: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questRewardText: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
  questButton: {
    backgroundColor: '#4e60d3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#2a9d8f',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  completedBadge: {
    backgroundColor: 'rgba(42, 157, 143, 0.2)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  completedText: {
    color: '#2a9d8f',
    fontWeight: 'bold',
  },
});