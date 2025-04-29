import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Character, Quest } from '../types/characterTypes';
import { supabase } from '../app/supabase';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { BottomTabParamList } from '../types/navigation';
import { useAuth } from '../app/AuthProvider';
import { SafeAreaView } from 'react-native-safe-area-context'; // Import SafeAreaView if you haven't

type QuestScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Quests'>;
const MOCK_QUESTS: Quest[] = [
  {
    id: '1',
    title: 'The Iron Challenge',
    description: 'Complete an upper body workout to prove your strength to the Guild of Iron.',
    type: 'strength',
    difficulty: 'medium',
    xpReward: 200,
    completed: false,
    accepted: false,
  },
  {
    id: '2',
    title: 'Swift as Wind',
    description: 'Complete a cardio session to earn the respect of the forest spirits.',
    type: 'speed',
    difficulty: 'easy',
    xpReward: 100,
    completed: false,
    accepted: false,
  },
  {
    id: '3',
    title: 'Arcane Flexibility',
    description: 'Complete a yoga session to channel magical energies.',
    type: 'magic',
    difficulty: 'hard',
    xpReward: 300,
    completed: false,
    accepted: false,
  },
];

const MOCK_REWARDS = [
  {
    id: '1',
    title: 'Strength Mastery',
    description: 'Awarded for completing 3 strength-based workouts.',
    condition: (quests: Quest[]) => quests.filter((q) => q.type === 'strength' && q.completed).length >= 3,
  },
  {
    id: '2',
    title: 'Cardio Champion',
    description: 'Awarded for completing 5 cardio sessions.',
    condition: (quests: Quest[]) => quests.filter((q) => q.type === 'speed' && q.completed).length >= 5,
  },
  {
    id: '3',
    title: 'Yoga Guru',
    description: 'Awarded for completing 2 yoga sessions.',
    condition: (quests: Quest[]) => quests.filter((q) => q.type === 'magic' && q.completed).length >= 2,
  },
];

export default function QuestScreen() {
  const navigation = useNavigation<QuestScreenNavigationProp>();
  const [character, setCharacter] = useState<Character | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const { rewards, setRewards } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndQuests = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: characterData } = await supabase
            .from('characters')
            .select('*')
            .eq('id', user.id)
            .single();

          if (characterData) {
            setCharacter(characterData as Character);
          }

          setQuests(MOCK_QUESTS);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndQuests();
  }, []);

  const acceptQuest = (questId: string) => {
    const updatedQuests = quests.map((quest) =>
      quest.id === questId ? { ...quest, accepted: true } : quest
    );
    setQuests(updatedQuests);

    // ✅ Check for new rewards when accepting a quest
    const earnedRewards = MOCK_REWARDS.filter(
      (reward) => reward.condition(updatedQuests) && !rewards.some((r) => r.id === reward.id)
    );

    if (earnedRewards.length > 0) {
      setRewards([...rewards, ...earnedRewards]);
      navigation.navigate("Rewards"); // ✅ Navigate to the Rewards screen
    }
  };

  const completeQuest = (questId: string) => {
    if (!character) return;
  
    const updatedQuests = quests.map((q) =>
      q.id === questId ? { ...q, completed: true } : q
    );
    setQuests(updatedQuests); // ✅ Correctly update
  
    const completedQuest = updatedQuests.find((q) => q.id === questId);
    if (!completedQuest) return;
  
    const updatedCharacter = {
      ...character,
      xp: character.xp + completedQuest.xpReward,
    };
  
    switch (completedQuest.type) {
      case 'strength':
        updatedCharacter.strength += 1;
        break;
      case 'speed':
        updatedCharacter.speed += 1;
        break;
      case 'magic':
        updatedCharacter.magic += 1;
        break;
      case 'willpower':
        updatedCharacter.willpower += 1;
        break;
    }
  
    setCharacter(updatedCharacter);
  
    const earnedRewards = MOCK_REWARDS.filter(
      (reward) => reward.condition(updatedQuests) && !rewards.some((r) => r.id === reward.id)
    );
  
    if (earnedRewards.length > 0) {
      const newRewards = [...rewards, ...earnedRewards];
      setRewards(newRewards);
  
      // ❗️REMOVE THIS:
      // navigation.navigate('Rewards');
  
      // ✅ Instead, you could optionally show a message like:
      // Alert.alert('New Reward!', 'You earned a new reward!');
    }
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
    <View style={styles.container}>
      {/* Fixed title and subtitle */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Text style={styles.title}>🔮 Daily Quests</Text>
        <Text style={styles.subtitle}>Complete quests to earn XP and unlock rewards!</Text>
      </View>

      {/* Scrollable quests list */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
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
                  onPress={() => completeQuest(quest.id)}
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
    </View>
  );
}

function getDifficultyStars(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return '★☆☆';
    case 'medium':
      return '★★☆';
    case 'hard':
      return '★★★';
    default:
      return '★☆☆';
  }
}

function getQuestTypeStyle(type: string) {
  switch (type) {
    case 'strength':
      return { backgroundColor: '#e63946' };
    case 'speed':
      return { backgroundColor: '#f4a261' };
    case 'magic':
      return { backgroundColor: '#6a4c93' };
    case 'willpower':
      return { backgroundColor: '#2a9d8f' };
    default:
      return { backgroundColor: '#4e60d3' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    padding: 0,
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