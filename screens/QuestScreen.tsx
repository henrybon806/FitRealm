import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Image, Animated
} from 'react-native';
import { supabase } from '../app/supabase';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { BottomTabParamList } from '../types/navigation';
import { useAuth } from '../app/AuthProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OPENAI_KEY } from '@env';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type QuestType = 'strength' | 'speed' | 'magic' | 'willpower';
type QuestDifficulty = 'easy' | 'medium' | 'hard';

interface Character {
  id: string;
  user_id: string;
  name: string;
  class: string;
  xp: number;
  level: number;
  strength: number;
  speed: number;
  magic: number;
  willpower: number;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  difficulty: QuestDifficulty;
  xpReward: number;
  completed: boolean;
  accepted: boolean;
  user_id?: string;
  created_at?: string;
}

// Database Tables:
// 1. characters - Stores user character data
// 2. quests - Stores all quests (active and completed)
// 3. users - Auth users table from Supabase

const QUEST_TYPES: QuestType[] = ['strength', 'speed', 'magic', 'willpower'];
const QUEST_DIFFICULTIES = [
  { name: 'easy', xpRange: [50, 150] },
  { name: 'medium', xpRange: [150, 250] },
  { name: 'hard', xpRange: [250, 400] },
];

const QUEST_TYPE_ICONS = {
  strength: 'arm-flex',
  speed: 'run-fast',
  magic: 'magic-staff',
  willpower: 'meditation'
};

const QUEST_DIFFICULTY_COLORS = {
  easy: ['#4CAF50', '#388E3C'],
  medium: ['#FFA000', '#FF8F00'],
  hard: ['#F44336', '#D32F2F']
};

export default function QuestScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<BottomTabParamList, 'Quests'>>();
  const [character, setCharacter] = useState<Character | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [completionStats, setCompletionStats] = useState<Record<QuestType, number>>({
    strength: 0,
    speed: 0,
    magic: 0,
    willpower: 0
  });
  const { rewards, setRewards } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generatingQuest, setGeneratingQuest] = useState(false);
  const [xpAnimation] = useState(new Animated.Value(0));
  
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  useEffect(() => {
    // Auto-generate new quests if we have fewer than 3
    if (!loading && quests.length < 3) {
      generateNewQuests(3 - quests.length);
    }
  }, [quests, loading]);
  
  useEffect(() => {
    // Update completion stats whenever completedQuests changes
    if (completedQuests.length > 0) {
      const stats = completedQuests.reduce((acc, quest) => {
        acc[quest.type] = (acc[quest.type] || 0) + 1;
        return acc;
      }, { strength: 0, speed: 0, magic: 0, willpower: 0 } as Record<QuestType, number>);
      setCompletionStats(stats);
    }
  }, [completedQuests]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log("Fetching character data...");
      const { data: characterData, error: characterError } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (characterError) {
        console.error("Error fetching character:", characterError);
      }

      if (characterData) {
        console.log("Character data retrieved:", characterData);
        setCharacter(characterData);
      }

      console.log("Fetching quests data...");
      const { data: questsData, error: questsError } = await supabase
        .from('quests')
        .select('*')
        .eq('user_id', user.id);

      if (questsError) {
        console.error("Error fetching quests:", questsError);
      }

      if (!questsData || questsData.length === 0) {
        console.log("No quests found, generating initial quests...");
        const initialQuests = await Promise.all([generateQuest(), generateQuest(), generateQuest()]);
        const questsWithUserId = initialQuests.map(q => ({ ...q, user_id: user.id }));
        
        const { error: insertError } = await supabase
          .from('quests')
          .insert(questsWithUserId);
          
        if (insertError) {
          console.error("Error inserting initial quests:", insertError);
        } else {
          console.log("Initial quests created successfully!");
        }
        
        setQuests(questsWithUserId);
      } else {
        console.log(`Found ${questsData.length} quests, filtering active and completed...`);
        const active = questsData.filter(q => !q.completed);
        const done = questsData.filter(q => q.completed);
        setQuests(active);
        setCompletedQuests(done);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load your quest data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateNewQuests = async (count: number) => {
    if (generatingQuest) return;
    setGeneratingQuest(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      console.log(`Generating ${count} new quests...`);
      const newQuests = [];
      for (let i = 0; i < count; i++) {
        const quest = await generateQuest();
        newQuests.push({ ...quest, user_id: user.id });
      }
      
      const { error: insertError } = await supabase
        .from('quests')
        .insert(newQuests);
        
      if (insertError) {
        console.error("Error inserting new quests:", insertError);
      } else {
        console.log("New quests created successfully!");
        setQuests(prev => [...prev, ...newQuests]);
      }
    } catch (error) {
      console.error('Error generating quests:', error);
      Alert.alert('Error', 'Failed to generate new quests. Please try again.');
    } finally {
      setGeneratingQuest(false);
    }
  };

  const generateQuest = async (): Promise<Quest> => {
    const type = QUEST_TYPES[Math.floor(Math.random() * QUEST_TYPES.length)];
    const difficulty = QUEST_DIFFICULTIES[Math.floor(Math.random() * QUEST_DIFFICULTIES.length)];
    const prompt = `Create a 5-word fantasy fitness quest title and 20-word description. Type: ${type}, Difficulty: ${difficulty.name}. Return as JSON with title and description properties.`;

    try {
      console.log("Generating quest with OpenAI...");
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a quest generator for a fantasy-themed fitness RPG.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      const data = await res.json();
      const raw = data.choices[0].message.content;
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : {
        title: `Epic ${type} Challenge`,
        description: `Complete a ${difficulty.name} ${type} workout.`
      };

      console.log("Generated quest:", parsed);
      return {
        id: uuidv4(),
        title: parsed.title,
        description: parsed.description,
        type,
        difficulty: difficulty.name,
        xpReward: Math.floor(Math.random() * (difficulty.xpRange[1] - difficulty.xpRange[0])) + difficulty.xpRange[0],
        accepted: false,
        completed: false,
        created_at: new Date().toISOString(),
      };
    } catch (err) {
      console.error('OpenAI error:', err);
      return {
        id: uuidv4(),
        title: `Fallback ${type} Quest`,
        description: `Complete a ${difficulty.name} ${type} workout.`,
        type,
        difficulty: difficulty.name,
        xpReward: 100,
        accepted: false,
        completed: false,
        created_at: new Date().toISOString(),
      };
    }
  };

  const acceptQuest = async (questId: string) => {
    try {
      console.log(`Accepting quest ${questId}...`);
      const updated = quests.map(q => q.id === questId ? { ...q, accepted: true } : q);
      setQuests(updated);
      
      const quest = updated.find(q => q.id === questId);
      if (character && quest) {
        const { error } = await supabase
          .from('quests')
          .update({ accepted: true })
          .eq('id', quest.id);
          
        if (error) {
          console.error("Error accepting quest:", error);
          Alert.alert('Error', 'Failed to accept quest. Please try again.');
        } else {
          console.log("Quest accepted successfully!");
        }
      }
    } catch (error) {
      console.error("Error in acceptQuest:", error);
      Alert.alert('Error', 'Failed to accept quest. Please try again.');
    }
  };

  const completeQuest = async (questId: string) => {
    if (!character) return;
    
    try {
      console.log(`Completing quest ${questId}...`);
      const quest = quests.find(q => q.id === questId);
      if (!quest) return;
      
      // Calculate XP based on character class bonus (same as CharacterScreen)
      const isClassSpecialty = quest.type === getClassSpecialty(character.class);
      const xpGain = isClassSpecialty ? Math.floor(quest.xpReward * 1.2) : quest.xpReward;
      
      console.log(`XP Gain: ${xpGain} (${isClassSpecialty ? '20% class bonus applied' : 'no bonus'})`);
      const newXP = character.xp + xpGain;
      
      // Calculate level using same formula as CharacterScreen
      const xpForNextLevel = character.level * 1000;
      const currentLevel = character.level;
      const newLevel = Math.floor(newXP / 1000) + 1;
      const didLevelUp = newLevel > currentLevel;
      
      // Create updates object for character
      const characterUpdates: Partial<Character> = {
        xp: newXP,
        level: newLevel,
      };
      
      // If level up, increase the stat based on quest type
      if (didLevelUp) {
        characterUpdates[quest.type] = character[quest.type] + 1;
      }
      
      // Animate XP gain
      Animated.timing(xpAnimation, {
        toValue: Math.min(1, newXP / xpForNextLevel),
        duration: 1000,
        useNativeDriver: false,
      }).start();
      
      // Update UI state
      const updatedQuests = quests.filter(q => q.id !== questId);
      setQuests(updatedQuests);
      setCompletedQuests([...completedQuests, { ...quest, completed: true }]);
      
      // Update database: mark quest as completed
      console.log("Updating quest in database...");
      const { error: questError } = await supabase
        .from('quests')
        .update({ completed: true })
        .eq('id', questId);
        
      if (questError) {
        console.error("Error updating quest:", questError);
        Alert.alert('Error', 'Failed to complete quest. Please try again.');
        return;
      }
      
      // Update database: update character
      console.log("Updating character in database...");
      const { data: updatedCharacter, error: characterError } = await supabase
        .from('characters')
        .update(characterUpdates)
        .eq('user_id', character.user_id)
        .select();
        
      if (characterError) {
        console.error("Error updating character:", characterError);
        Alert.alert('Error', 'Failed to update character. Please try again.');
        return;
      }
      
      // Update local character state with returned data
      if (updatedCharacter && updatedCharacter.length > 0) {
        console.log("Character updated successfully:", updatedCharacter[0]);
        setCharacter(updatedCharacter[0]);
      } else {
        // Fallback to local update if no data returned
        const localCharacterUpdate = { ...character, ...characterUpdates };
        setCharacter(localCharacterUpdate);
      }
      
      // Show level up notification
      if (didLevelUp) {
        Alert.alert(
          'Level Up!', 
          `Congratulations! You are now level ${newLevel}! Your ${quest.type} increased by 1.`,
          [{ text: 'Awesome!', style: 'default' }]
        );
      } else {
        const remaining = xpForNextLevel - newXP;
        Alert.alert(
          'Quest Completed!', 
          `+${xpGain} XP ${isClassSpecialty ? '(includes class bonus)' : ''}\n\n${remaining} XP until level ${currentLevel + 1}`,
          [{ text: 'Continue!', style: 'default' }]
        );
      }
    } catch (error) {
      console.error("Error in completeQuest:", error);
      Alert.alert('Error', 'Failed to complete quest. Please try again.');
    }
  };

  // Helper function to get class specialty stat
  const getClassSpecialty = (className: string): QuestType => {
    switch (className) {
      case 'Warrior': return 'strength';
      case 'Rogue': return 'speed';
      case 'Mage': return 'magic';
      case 'Monk': return 'willpower';
      default: return 'strength';
    }
  };

  const xpToNextLevel = (level: number) => level * 1000;
  
  const getQuestIconName = (type: QuestType) => {
    return QUEST_TYPE_ICONS[type] || 'help-circle';
  };
  
  const getCompletionPercentage = () => {
    if (!character) return 0;
    
    // Calculate percentage using the same formula as CharacterScreen
    const xpForCurrentLevel = (character.level - 1) * 1000;
    const xpForNextLevel = character.level * 1000;
    const xpInCurrentLevel = character.xp - xpForCurrentLevel;
    const xpPercentage = (xpInCurrentLevel / 1000) * 100;
    
    return xpPercentage;
  };

  if (loading) {
    return (
      <LinearGradient 
        colors={['#1e1e2e', '#2a2a40']} 
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#ffd700" />
        <Text style={styles.loadingText}>Summoning quests...</Text>
      </LinearGradient>
    );
  }

  // Calculate XP info for display (matching CharacterScreen)
  const xpForCurrentLevel = (character.level - 1) * 1000;
  const xpForNextLevel = character.level * 1000;
  const xpInCurrentLevel = character.xp - xpForCurrentLevel;
  const remaining = xpForNextLevel - character.xp;

  return (
      <LinearGradient 
        colors={['#1e1e2e', '#2a2a40']} 
        style={styles.gradientBackground}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Character Card */}
          <LinearGradient 
            colors={['#2a2a40', '#3a3a55']} 
            style={styles.characterCard}
          >
            <View style={styles.characterHeader}>
              <View>
                <Text style={styles.characterName}>{character.name}</Text>
                <Text style={styles.characterClass}>{character.class}</Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>LVL {character.level}</Text>
              </View>
            </View>
            
            <View style={styles.xpContainer}>
              <Text style={styles.xpText}>
                {xpInCurrentLevel} / 1000 XP • {remaining} until next level
              </Text>
              <View style={styles.barOuter}>
                <Animated.View 
                  style={[
                    styles.barInner, 
                    {width: `${getCompletionPercentage()}%`}
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="arm-flex" size={20} color="#ff9e80" />
                <Text style={styles.statValue}>{character.strength}</Text>
                <Text style={styles.statLabel}>STR</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="run-fast" size={20} color="#80d8ff" />
                <Text style={styles.statValue}>{character.speed}</Text>
                <Text style={styles.statLabel}>SPD</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="magic-staff" size={20} color="#b388ff" />
                <Text style={styles.statValue}>{character.magic}</Text>
                <Text style={styles.statLabel}>MAG</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="meditation" size={20} color="#ea80fc" />
                <Text style={styles.statValue}>{character.willpower}</Text>
                <Text style={styles.statLabel}>WILL</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Quests Section */}
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="sword" size={22} color="#ffd700" />
            <Text style={styles.sectionTitle}>Active Quests</Text>
          </View>
          
          {generatingQuest && (
            <View style={styles.generatingIndicator}>
              <ActivityIndicator size="small" color="#ffd700" />
              <Text style={styles.generatingText}>Summoning new quest...</Text>
            </View>
          )}
          
          {quests.map(quest => (
            <LinearGradient 
              key={quest.id} 
              colors={QUEST_DIFFICULTY_COLORS[quest.difficulty]} 
              start={{x: 0, y: 0}} 
              end={{x: 1, y: 0}}
              style={styles.questBorder}
            >
              <View style={styles.questCard}>
                <View style={styles.questHeader}>
                  <View style={styles.questTitleContainer}>
                    <MaterialCommunityIcons 
                      name={getQuestIconName(quest.type)} 
                      size={20} 
                      color={QUEST_DIFFICULTY_COLORS[quest.difficulty][0]} 
                    />
                    <Text style={styles.questTitle}>{quest.title}</Text>
                  </View>
                  <View style={styles.xpBadge}>
                    <Text style={styles.xpBadgeText}>
                      +{quest.type === getClassSpecialty(character.class) ? 
                        Math.floor(quest.xpReward * 1.2) : 
                        quest.xpReward} XP
                      {quest.type === getClassSpecialty(character.class) && 
                        <Text style={styles.bonusIndicator}> ★</Text>}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.questText}>{quest.description}</Text>
                
                <View style={styles.questFooter}>
                  <View style={styles.questMetaContainer}>
                    <View style={[styles.difficultyBadge, { backgroundColor: QUEST_DIFFICULTY_COLORS[quest.difficulty][0] }]}>
                      <Text style={styles.difficultyText}>{quest.difficulty}</Text>
                    </View>
                    <Text style={styles.questType}>{quest.type}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.button, quest.accepted ? styles.complete : styles.accept]}
                    onPress={() => quest.accepted ? completeQuest(quest.id) : acceptQuest(quest.id)}
                  >
                    <Text style={styles.buttonText}>
                      {quest.accepted ? 'Complete' : 'Accept'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          ))}

          <TouchableOpacity 
            style={styles.generateButton} 
            onPress={() => generateNewQuests(1)}
            disabled={generatingQuest}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.buttonText}>Generate New Quest</Text>
          </TouchableOpacity>

          {/* Completion Stats Section */}
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="trophy" size={22} color="#ffd700" />
            <Text style={styles.sectionTitle}>Quest Completions</Text>
          </View>
          
          <View style={styles.statsCard}>
            <View style={styles.completionStat}>
              <MaterialCommunityIcons name="arm-flex" size={20} color="#ff9e80" />
              <Text style={styles.statLabel}>Strength</Text>
              <Text style={styles.statCount}>{completionStats.strength}</Text>
            </View>
            <View style={styles.completionStat}>
              <MaterialCommunityIcons name="run-fast" size={20} color="#80d8ff" />
              <Text style={styles.statLabel}>Speed</Text>
              <Text style={styles.statCount}>{completionStats.speed}</Text>
            </View>
            <View style={styles.completionStat}>
              <MaterialCommunityIcons name="magic-staff" size={20} color="#b388ff" />
              <Text style={styles.statLabel}>Magic</Text>
              <Text style={styles.statCount}>{completionStats.magic}</Text>
            </View>
            <View style={styles.completionStat}>
              <MaterialCommunityIcons name="meditation" size={20} color="#ea80fc" />
              <Text style={styles.statLabel}>Willpower</Text>
              <Text style={styles.statCount}>{completionStats.willpower}</Text>
            </View>
          </View>
          
          {character.class && (
            <View style={styles.classBonus}>
              <MaterialCommunityIcons 
                name={QUEST_TYPE_ICONS[getClassSpecialty(character.class)]} 
                size={20} 
                color="#ffd700" 
              />
              <Text style={styles.classBonusText}>
                {character.class} Bonus: +20% XP for {getClassSpecialty(character.class)} quests
              </Text>
            </View>
          )}
          
          <Text style={styles.totalCompletions}>
            Total Quests Completed: {completedQuests.length}
          </Text>
        </ScrollView>
      </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#1e1e2e',
  },
  gradientBackground: {
    flex: 1,
  },
  scroll: { 
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  loadingText: { 
    color: '#fff', 
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'System',
  },
  
  // Character Card
  characterCard: { 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  characterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  characterName: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff', 
  },
  characterClass: {
    fontSize: 16,
    color: '#bbb',
    fontStyle: 'italic',
  },
  levelBadge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelText: {
    color: '#1e1e2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
  xpContainer: {
    marginBottom: 16,
  },
  xpText: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'right',
  },
  barOuter: { 
    height: 12, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 6,
    overflow: 'hidden',
  },
  barInner: { 
    height: 12, 
    backgroundColor: '#ffd700', 
    borderRadius: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Quest Cards
  questBorder: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 2,
  },
  questCard: { 
    backgroundColor: '#2a2a40', 
    padding: 16, 
    borderRadius: 10,
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  questTitle: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold',
    marginLeft: 8,
  },
  xpBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpBadgeText: {
    color: '#ffd700',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bonusIndicator: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
  questText: { 
    color: '#ddd', 
    marginVertical: 8,
    lineHeight: 20,
  },
  questFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  questMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  questType: { 
    color: '#aaa', 
    fontSize: 14,
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  button: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    alignItems: 'center',
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 14,
  },
  accept: { 
    backgroundColor: '#4e60d3',
    flexDirection: 'row',
    alignItems: 'center',
  },
  complete: { 
    backgroundColor: '#2a9d8f',
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Generate Button
  generateButton: { 
    backgroundColor: '#6a4c93', 
    marginTop: 8,
    marginBottom: 24,
    padding: 16, 
    borderRadius: 24, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Generating Indicator
  generatingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  generatingText: {
    color: '#ddd',
    marginLeft: 8,
    fontSize: 14,
  },
  
  // Completion Stats
  statsCard: {
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  completionStat: {
    alignItems: 'center',
    flex: 1,
  },
  statCount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  totalCompletions: {
    color: '#bbb',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  
  // Class Bonus
  classBonus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 64, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ffd700',
  },
  classBonusText: {
    color: '#ddd',
    marginLeft: 8,
    fontSize: 14,
  }
});

// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
// import { supabase } from '../app/supabase';
// import { useNavigation } from '@react-navigation/native';
// import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
// import { BottomTabParamList } from '../types/navigation';
// import { useAuth } from '../app/AuthProvider';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { OPENAI_KEY } from '@env';
// import { v4 as uuidv4 } from 'uuid'; // install with: npm install uuid

// const normalizeItems = (items: any[]): Quest[] => {
//   return items.map((item, index) => ({
//     ...item,
//     id: item.id || uuidv4(), // fallback to UUID if no id
//   }));
// };


// // Define proper types to resolve TypeScript errors
// type QuestType = 'strength' | 'speed' | 'magic' | 'willpower';
// type QuestDifficulty = 'easy' | 'medium' | 'hard';

// interface Character {
//   id: string;
//   user_id: string;
//   name: string;
//   class: string;
//   xp: number;
//   level: number;
//   strength: number;
//   speed: number;
//   magic: number;
//   willpower: number;
// }

// interface Quest {
//   id: string;
//   title: string;
//   description: string;
//   type: QuestType;
//   difficulty: QuestDifficulty;
//   xpReward: number;
//   completed: boolean;
//   accepted: boolean;
//   user_id?: string;
// }

// type QuestScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Quests'>;

// const QUEST_TYPES: QuestType[] = ['strength', 'speed', 'magic', 'willpower'];
// const QUEST_DIFFICULTIES: { name: QuestDifficulty, xpRange: [number, number] }[] = [
//   { name: 'easy', xpRange: [50, 150] },
//   { name: 'medium', xpRange: [150, 250] },
//   { name: 'hard', xpRange: [250, 400] },
// ];

// // Define reward interface
// interface Reward {
//   id: string;
//   title: string;
//   description: string;
//   condition: (quests: Quest[]) => boolean;
// }

// const MOCK_REWARDS: Reward[] = [
//   {
//     id: '1',
//     title: 'Strength Mastery',
//     description: 'Awarded for completing 3 strength-based workouts.',
//     condition: (quests) => quests.filter((q) => q.type === 'strength' && q.completed).length >= 3,
//   },
//   {
//     id: '2',
//     title: 'Cardio Champion',
//     description: 'Awarded for completing 5 cardio sessions.',
//     condition: (quests) => quests.filter((q) => q.type === 'speed' && q.completed).length >= 5,
//   },
//   {
//     id: '3',
//     title: 'Yoga Guru',
//     description: 'Awarded for completing 2 yoga sessions.',
//     condition: (quests) => quests.filter((q) => q.type === 'magic' && q.completed).length >= 2,
//   },
//   {
//     id: '4',
//     title: 'Endurance Master',
//     description: 'Awarded for completing 3 willpower-based challenges.',
//     condition: (quests) => quests.filter((q) => q.type === 'willpower' && q.completed).length >= 3,
//   },
// ];

// export default function QuestScreen() {
//   const navigation = useNavigation<QuestScreenNavigationProp>();
//   const [character, setCharacter] = useState<Character | null>(null);
//   const [quests, setQuests] = useState<Quest[]>([]);
//   const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
//   const { rewards, setRewards } = useAuth();
//   const [loading, setLoading] = useState(true);
//   const [generatingQuest, setGeneratingQuest] = useState(false);

//   // Function to generate a quest using OpenAI
//   const generateQuest = async (): Promise<Quest> => {
//     try {
//       setGeneratingQuest(true);
      
//       // Select random type and difficulty
//       const type = QUEST_TYPES[Math.floor(Math.random() * QUEST_TYPES.length)];
//       const difficulty = QUEST_DIFFICULTIES[Math.floor(Math.random() * QUEST_DIFFICULTIES.length)];
      
//       // Prepare prompt for OpenAI
//       const prompt = `Create a fantasy-themed fitness quest with the following parameters:
//       - Type: ${type} (${getQuestTypeDescription(type)})
//       - Difficulty: ${difficulty.name}
//       - Format: Return only a JSON object with two fields: "title" (max 5 words) and "description" (max 20 words)
//       - Style: Medieval fantasy, heroic adventure
//       - Make it unique and creative`;
      
//       // Call OpenAI API
//       const response = await fetch('https://api.openai.com/v1/chat/completions', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${OPENAI_KEY || 'your-openai-key-here'}`
//         },
//         body: JSON.stringify({
//           model: "gpt-3.5-turbo",
//           messages: [
//             { 
//               role: "system", 
//               content: "You are a quest generator for a fantasy fitness RPG app. Create unique, creative quests that motivate users to exercise." 
//             },
//             { 
//               role: "user", 
//               content: prompt 
//             }
//           ],
//           temperature: 0.8
//         })
//       });
      
//       const data = await response.json();
//       let questData: { title: string, description: string };
      
//       try {
//         // Extract JSON from response (different format for chat completions)
//         const content = data.choices[0].message.content;
//         const jsonMatch = content.match(/\{[\s\S]*\}/);
        
//         if (jsonMatch) {
//           questData = JSON.parse(jsonMatch[0]);
//         } else {
//           // Try to extract title and description from non-JSON format
//           const lines = content.split('\n');
//           let title = '', description = '';
          
//           for (const line of lines) {
//             if (line.toLowerCase().includes('title') && !title) {
//               title = line.split(':')[1]?.trim() || `${type.charAt(0).toUpperCase() + type.slice(1)} Challenge`;
//             } else if (line.toLowerCase().includes('description') && !description) {
//               description = line.split(':')[1]?.trim() || `Complete a ${difficulty.name} ${type} workout to earn rewards.`;
//             }
//           }
          
//           questData = {
//             title: title || `${type.charAt(0).toUpperCase() + type.slice(1)} Challenge`,
//             description: description || `Complete a ${difficulty.name} ${type} workout to earn rewards.`
//           };
//         }
        
//         // Ensure title and description aren't too long
//         if (questData.title.length > 30) {
//           questData.title = questData.title.substring(0, 30);
//         }
//         if (questData.description.length > 100) {
//           questData.description = questData.description.substring(0, 100);
//         }
//       } catch (e) {
//         // Create a unique quest even if parsing fails
//         const adjectives = ['Mystical', 'Heroic', 'Epic', 'Ancient', 'Mighty', 'Arcane', 'Legendary'];
//         const nouns = ['Challenge', 'Trial', 'Quest', 'Journey', 'Adventure', 'Path', 'Conquest'];
        
//         const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
//         const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        
//         const actions = ['Complete', 'Conquer', 'Master', 'Overcome', 'Triumph in'];
//         const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
//         questData = {
//           title: `${randomAdj} ${type.charAt(0).toUpperCase() + type.slice(1)} ${randomNoun}`,
//           description: `${randomAction} a ${difficulty.name} ${type} challenge to unlock ancient power.`
//         };
//       }
      
//       // Generate XP reward based on difficulty
//       const xpReward = Math.floor(
//         Math.random() * (difficulty.xpRange[1] - difficulty.xpRange[0] + 1) + difficulty.xpRange[0]
//       );
      
//       // Create new quest object
//       const newQuest: Quest = {
//         id: Date.now().toString(),
//         title: questData.title,
//         description: questData.description,
//         type,
//         difficulty: difficulty.name,
//         xpReward,
//         completed: false,
//         accepted: false,
//       };
      
//       return newQuest;
//     } catch (error) {
//       console.error('Error generating quest:', error);

//       const newQuests = normalizeItems([await generateQuest()]);
//       setQuests(prev => [...prev, ...newQuests]);
      
      
//       // Create a unique fallback quest if API fails
//       const type = QUEST_TYPES[Math.floor(Math.random() * QUEST_TYPES.length)];
//       const difficulty = QUEST_DIFFICULTIES[Math.floor(Math.random() * QUEST_DIFFICULTIES.length)];
      
//       // Generate a more creative fallback quest using predefined elements
//       const adjectives = ['Mystical', 'Heroic', 'Epic', 'Ancient', 'Mighty', 'Arcane', 'Legendary'];
//       const nouns = ['Challenge', 'Trial', 'Quest', 'Journey', 'Adventure', 'Path', 'Conquest'];
//       const actions = ['Conquer', 'Master', 'Overcome', 'Complete', 'Triumph in', 'Dominate'];
//       const rewards = ['strength', 'wisdom', 'agility', 'power', 'endurance'];
      
//       const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
//       const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
//       const randomAction = actions[Math.floor(Math.random() * actions.length)];
//       const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
      
//       const xpReward = Math.floor(
//         Math.random() * (difficulty.xpRange[1] - difficulty.xpRange[0] + 1) + difficulty.xpRange[0]
//       );
      
//       return {
//         id: Date.now().toString(),
//         title: `${randomAdj} ${type.charAt(0).toUpperCase() + type.slice(1)} ${randomNoun}`,
//         description: `${randomAction} a ${difficulty.name} ${type} workout to gain ${randomReward}.`,
//         type,
//         difficulty: difficulty.name,
//         xpReward,
//         completed: false,
//         accepted: false,
//       };
//     } finally {
//       setGeneratingQuest(false);
//     }
//   };

//   // Function to check if we need to generate more quests
//   // const ensureMinimumQuests = async () => {
//   //   // Count available quests (not completed)
//   //   const availableQuests = quests.filter(q => !q.completed);
    
//   //   if (availableQuests.length < 3) {
//   //     // Generate enough quests to reach minimum of 3
//   //     const questsNeeded = 3 - availableQuests.length;
//   //     const newQuestsPromises = [];
      
//   //     for (let i = 0; i < questsNeeded; i++) {
//   //       newQuestsPromises.push(generateQuest());
//   //     }
      
//   //     try {
//   //       const newQuests = await Promise.all(newQuestsPromises);
//   //       setQuests(currentQuests => [...currentQuests, ...newQuests]);
//   //     } catch (error) {
//   //       console.error('Error ensuring minimum quests:', error);
//   //     }
//   //   }
//   // };


//   function getQuestTypeDescription(type: string): string {
//     switch (type) {
//       case 'strength': return 'weight training, resistance exercises';
//       case 'speed': return 'cardio, running, agility training';
//       case 'magic': return 'flexibility, yoga, stretching';
//       case 'willpower': return 'endurance, mental challenges, meditation';
//       default: return 'general fitness';
//     }
//   }

//   // Initial fetch of character and quests
//   useEffect(() => {
//     const fetchUserAndQuests = async () => {
//       try {
//         const { data: { user } } = await supabase.auth.getUser();

//         if (user) {
//           // Fetch character data
//           const { data: characterData } = await supabase
//             .from('characters')
//             .select('*')
//             .eq('user_id', user.id)
//             .single();

//           if (characterData) {
//             setCharacter(characterData as Character);
//           }

//           // Fetch quests from database or initialize with empty array
//           const { data: questsData, error } = await supabase
//             .from('quests')
//             .select('*')
//             .eq('user_id', user.id);

//           if (error || !questsData || questsData.length === 0) {
//             // No quests found, generate initial set
//             const initialQuestsPromises = [];
//             for (let i = 0; i < 3; i++) {
//               initialQuestsPromises.push(generateQuest());
//             }
            
//             const initialQuests = await Promise.all(initialQuestsPromises);
//             setQuests(initialQuests);
            
//             // Save initial quests to database
//             if (initialQuests.length > 0) {
//               const questsWithUserId = initialQuests.map(q => ({
//                 ...q,
//                 user_id: user.id
//               }));
              
//               await supabase.from('quests').insert(questsWithUserId);
//             }
//           } else {
//             // Process and validate quests from database
//             const validatedQuests = questsData.map(q => {
//               // Ensure type and difficulty are valid enum values
//               const type: QuestType = QUEST_TYPES.includes(q.type as QuestType) 
//                 ? (q.type as QuestType) 
//                 : 'strength';
              
//               const difficulty: QuestDifficulty = QUEST_DIFFICULTIES.find(d => d.name === q.difficulty)
//                 ? (q.difficulty as QuestDifficulty)
//                 : 'medium';
              
//               return {
//                 ...q,
//                 type,
//                 difficulty
//               } as Quest;
//             });
            
//             // Sort quests - completed ones to separate array
//             const activeQuests = validatedQuests.filter(q => !q.completed);
//             const finished = validatedQuests.filter(q => q.completed);
            
//             setQuests(activeQuests);
//             setCompletedQuests(finished);
            
//             // Ensure we have enough quests
//             if (activeQuests.length < 3) {
//               ensureMinimumQuests();
//             }
//           }
//         }
//       } catch (error) {
//         console.error('Error fetching data:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUserAndQuests();
//   }, []);

//   // Check for minimum quests whenever the quests state changes
//   useEffect(() => {
//     if (!loading) {
//       ensureMinimumQuests();
//     }
//   }, [quests, loading]);

//   // Accept quest
//   const acceptQuest = async (questId: string) => {
//     const updatedQuests = quests.map((quest) =>
//       quest.id === questId ? { ...quest, accepted: true } : quest
//     );
//     setQuests(updatedQuests);

//     // Update quest in database
//     if (character) {
//       try {
//         await supabase
//           .from('quests')
//           .update({ accepted: true })
//           .eq('id', questId)
//           .eq('user_id', character.user_id);
//       } catch (error) {
//         console.error('Error updating quest:', error);
//       }
//     }

//     // Check for new rewards
//     const earnedRewards = MOCK_REWARDS.filter(
//       (reward) => reward.condition(updatedQuests) && !rewards.some((r) => r.id === reward.id)
//     );

//     if (earnedRewards.length > 0) {
//       setRewards([...rewards, ...earnedRewards]);
//       navigation.navigate("Rewards");
//     }
//   };

//   // Complete quest
//   const completeQuest = async (questId: string) => {
//     if (!character) {
//       console.log('No character found');
//       return;
//     }
  
//     // Update quests state
//     const updatedQuests = quests.map((q) =>
//       q.id === questId ? { ...q, completed: true } : q
//     );
    
//     const completedQuest = quests.find((q) => q.id === questId);
//     if (!completedQuest) return;
    
//     // Move completed quest to completedQuests array
//     setQuests(updatedQuests.filter(q => !q.completed));
//     setCompletedQuests([...completedQuests, {...completedQuest, completed: true}]);
  
//     // Update character stats
//     const updatedCharacter = {
//       ...character,
//       xp: character.xp + completedQuest.xpReward,
//     };
  
//     switch (completedQuest.type) {
//       case 'strength':
//         updatedCharacter.strength += 1;
//         break;
//       case 'speed':
//         updatedCharacter.speed += 1;
//         break;
//       case 'magic':
//         updatedCharacter.magic += 1;
//         break;
//       case 'willpower':
//         updatedCharacter.willpower += 1;
//         break;
//     }
  
//     setCharacter(updatedCharacter);
    
//     // Update database
//     try {
//       // Update quest in database
//       await supabase
//         .from('quests')
//         .update({ completed: true })
//         .eq('id', questId)
//         .eq('user_id', character.user_id);
      
//       // Update character stats
//       await supabase
//         .from('characters')
//         .update({
//           xp: updatedCharacter.xp,
//           strength: updatedCharacter.strength,
//           speed: updatedCharacter.speed,
//           magic: updatedCharacter.magic,
//           willpower: updatedCharacter.willpower
//         })
//         .eq('id', character.user_id); // Fixed: using user_id instead of id
//     } catch (error) {
//       console.error('Error updating after quest completion:', error);
//     }
  
//     // Check for rewards
//     const earnedRewards = MOCK_REWARDS.filter(
//       (reward) => reward.condition([...updatedQuests, ...completedQuests]) && 
//                   !rewards.some((r) => r.id === reward.id)
//     );
  
//     if (earnedRewards.length > 0) {
//       const newRewards = [...rewards, ...earnedRewards];
//       setRewards(newRewards);
      
//       Alert.alert('New Reward!', 'You earned a new reward!');
//     }
    
//     // Ensure we maintain minimum quests
//     ensureMinimumQuests();
//   };

//   // Generate a new quest manually (user-triggered)
//   const handleGenerateNewQuest = async () => {
//     setGeneratingQuest(true);
//     try {
//       const newQuest = await generateQuest();
//       setQuests(currentQuests => [...currentQuests, newQuest]);
      
//       // Save to database if character exists
//       if (character) {
//         await supabase
//           .from('quests')
//           .insert([{...newQuest, user_id: character.user_id}]);
//       }
      
//       Alert.alert('New Quest', 'A new quest has appeared!');
//     } catch (error) {
//       console.error('Error generating new quest:', error);
//       Alert.alert('Error', 'Failed to generate new quest. Please try again.');
//     } finally {
//       setGeneratingQuest(false);
//     }
//   };
  
//   // Function to check if we need to generate more quests
//   const ensureMinimumQuests = async () => {
//     // Count available quests (not completed)
//     const availableQuests = quests.filter(q => !q.completed);
    
//     if (availableQuests.length < 3) {
//       // Generate enough quests to reach minimum of 3
//       const questsNeeded = 3 - availableQuests.length;
//       const newQuestsPromises: Promise<Quest>[] = [];
      
//       for (let i = 0; i < questsNeeded; i++) {
//         newQuestsPromises.push(generateQuest());
//       }
      
//       try {
//         const newQuests = await Promise.all(newQuestsPromises);
        
//         // Save to database if character exists
//         if (character && newQuests.length > 0) {
//           const questsWithUserId = newQuests.map(q => ({
//             ...q,
//             user_id: character.user_id
//           }));
          
//           await supabase.from('quests').insert(questsWithUserId);
//         }
        
//         setQuests(currentQuests => [...currentQuests, ...newQuests]);
//       } catch (error) {
//         console.error('Error ensuring minimum quests:', error);
//       }
//     }
//   };

//   if (loading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#4e60d3" />
//         <Text style={styles.loadingText}>Loading quests...</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
//         <Text style={styles.title}>🔮 Daily Quests</Text>
//         <Text style={styles.subtitle}>Complete quests to earn XP and unlock rewards!</Text>
//       </View>

//       {/* Active Quests */}
//       <Text style={styles.sectionTitle}>Active Quests</Text>
//       <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}>
//         {quests.map((quest) => (
//           <View key={quest.id} style={styles.questCard}>
//             <View style={[styles.questTypeIndicator, getQuestTypeStyle(quest.type)]} />
//             <View style={styles.questContent}>
//               <Text style={styles.questTitle}>{quest.title}</Text>
//               <Text style={styles.questDifficulty}>
//                 {getDifficultyStars(quest.difficulty)} • {quest.type.charAt(0).toUpperCase() + quest.type.slice(1)}
//               </Text>
//               <Text style={styles.questDescription}>{quest.description}</Text>
//               <View style={styles.questReward}>
//                 <Text style={styles.questRewardText}>Reward: {quest.xpReward} XP</Text>
//               </View>

//               {quest.accepted ? (
//                 <TouchableOpacity
//                   style={[styles.questButton, styles.completeButton]}
//                   onPress={() => completeQuest(quest.id)}
//                 >
//                   <Text style={styles.buttonText}>Mark Completed</Text>
//                 </TouchableOpacity>
//               ) : (
//                 <TouchableOpacity
//                   style={styles.questButton}
//                   onPress={() => acceptQuest(quest.id)}
//                 >
//                   <Text style={styles.buttonText}>Accept Quest</Text>
//                 </TouchableOpacity>
//               )}
//             </View>
//           </View>
//         ))}

//         {/* Generate New Quest Button */}
//         <TouchableOpacity
//           style={styles.generateButton}
//           onPress={handleGenerateNewQuest}
//           disabled={generatingQuest}
//         >
//           {generatingQuest ? (
//             <ActivityIndicator size="small" color="#fff" />
//           ) : (
//             <Text style={styles.generateButtonText}>Generate New Quest</Text>
//           )}
//         </TouchableOpacity>
//       </ScrollView>

//       {/* Completed Quests Section */}
//       {completedQuests.length > 0 && (
//         <>
//           <Text style={styles.sectionTitle}>Completed Quests</Text>
//           <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
//             {completedQuests.map((quest) => (
//               <View key={quest.id} style={[styles.questCard, styles.completedQuestCard]}>
//                 <View style={[styles.questTypeIndicator, getQuestTypeStyle(quest.type)]} />
//                 <View style={styles.questContent}>
//                   <Text style={[styles.questTitle, styles.completedQuestTitle]}>{quest.title}</Text>
//                   <Text style={styles.questDifficulty}>
//                     {getDifficultyStars(quest.difficulty)} • {quest.type.charAt(0).toUpperCase() + quest.type.slice(1)}
//                   </Text>
//                   <Text style={[styles.questDescription, styles.completedQuestText]}>{quest.description}</Text>
//                   <View style={styles.questReward}>
//                     <Text style={styles.completedRewardText}>Earned: {quest.xpReward} XP</Text>
//                   </View>
//                   <View style={styles.completedBadge}>
//                     <Text style={styles.completedText}>COMPLETED</Text>
//                   </View>
//                 </View>
//               </View>
//             ))}
//           </ScrollView>
//         </>
//       )}
//     </View>
//   );
// }

// function getDifficultyStars(difficulty: string): string {
//   switch (difficulty) {
//     case 'easy':
//       return '★☆☆';
//     case 'medium':
//       return '★★☆';
//     case 'hard':
//       return '★★★';
//     default:
//       return '★☆☆';
//   }
// }

// function getQuestTypeStyle(type: string) {
//   switch (type) {
//     case 'strength':
//       return { backgroundColor: '#e63946' };
//     case 'speed':
//       return { backgroundColor: '#f4a261' };
//     case 'magic':
//       return { backgroundColor: '#6a4c93' };
//     case 'willpower':
//       return { backgroundColor: '#2a9d8f' };
//     default:
//       return { backgroundColor: '#4e60d3' };
//   }
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#1e1e2e',
//     padding: 0,
//   },
//   loadingContainer: {
//     flex: 1,
//     backgroundColor: '#1e1e2e',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     color: '#fff',
//     marginTop: 12,
//     fontSize: 16,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#f8f8f2',
//     textAlign: 'center',
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#bbb',
//     textAlign: 'center',
//     marginBottom: 16,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#f8f8f2',
//     marginLeft: 16,
//     marginTop: 16,
//     marginBottom: 8,
//   },
//   questCard: {
//     backgroundColor: '#2a2a40',
//     borderRadius: 12,
//     marginBottom: 16,
//     overflow: 'hidden',
//     flexDirection: 'row',
//   },
//   completedQuestCard: {
//     opacity: 0.8,
//     backgroundColor: '#25253a',
//   },
//   questTypeIndicator: {
//     width: 8,
//   },
//   questContent: {
//     padding: 16,
//     flex: 1,
//   },
//   questTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 4,
//   },
//   completedQuestTitle: {
//     color: '#ddd',
//   },
//   questDifficulty: {
//     fontSize: 14,
//     color: '#bbb',
//     marginBottom: 8,
//   },
//   questDescription: {
//     fontSize: 14,
//     color: '#ddd',
//     marginBottom: 12,
//     lineHeight: 20,
//   },
//   completedQuestText: {
//     color: '#aaa',
//   },
//   questReward: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   questRewardText: {
//     color: '#ffd700',
//     fontWeight: 'bold',
//   },
//   completedRewardText: {
//     color: '#c9b037',
//     fontWeight: 'bold',
//   },
//   questButton: {
//     backgroundColor: '#4e60d3',
//     padding: 10,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   completeButton: {
//     backgroundColor: '#2a9d8f',
//   },
//   buttonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   completedBadge: {
//     backgroundColor: 'rgba(42, 157, 143, 0.2)',
//     padding: 8,
//     borderRadius: 6,
//     alignItems: 'center',
//   },
//   completedText: {
//     color: '#2a9d8f',
//     fontWeight: 'bold',
//   },
//   generateButton: {
//     backgroundColor: '#6a4c93',
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginTop: 4,
//     marginBottom: 24,
//   },
//   generateButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
// });