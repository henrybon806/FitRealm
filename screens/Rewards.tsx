import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { useAuth } from '../app/AuthProvider';
import { OPENAI_KEY } from '@env';
import { supabase } from '../app/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Types
type QuestType = 'strength' | 'speed' | 'magic' | 'willpower';

interface Reward {
  id?: string;
  title: string;
  description: string;
  type: QuestType;
  requirement: number;
  difficulty: 'bronze' | 'silver' | 'gold';
  earned?: boolean;
  user_id?: string;
  date_earned?: string | null;
}

interface CompletedQuest {
  id: string;
  type: QuestType;
  completed: boolean;
  user_id: string;
}

const TYPE_COLORS = {
  strength: ['#FF5252', '#D32F2F'],
  speed: ['#448AFF', '#1976D2'],
  magic: ['#9C27B0', '#7B1FA2'],
  willpower: ['#FF9800', '#F57C00']
};

const BADGE_COLORS = {
  bronze: ['#CD7F32', '#A05A2C'],
  silver: ['#C0C0C0', '#A8A8A8'],
  gold: ['#FFD700', '#FFC107']
};

const TYPE_ICONS = {
  strength: 'arm-flex',
  speed: 'run-fast',
  magic: 'magic-staff',
  willpower: 'meditation'
};

export default function RewardsScreen() {
  const { rewards, setRewards } = useAuth();
  const [availableRewards, setAvailableRewards] = useState<Reward[]>([]);
  const [completedQuests, setCompletedQuests] = useState<CompletedQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [questCounts, setQuestCounts] = useState({
    strength: 0,
    speed: 0,
    magic: 0,
    willpower: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch all required data
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Fetching rewards data...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user found");
        setLoading(false);
        return;
      }

      // Fetch completed quests
      console.log("Fetching completed quests...");
      const { data: questsData, error: questsError } = await supabase
        .from('quests')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true);

      if (questsError) {
        console.error("Error fetching quests:", questsError);
      }

      if (questsData) {
        console.log(`Found ${questsData.length} completed quests`);
        setCompletedQuests(questsData);
        
        // Count completed quests by type
        const counts = questsData.reduce((acc, quest) => {
          if (quest.type) {
            acc[quest.type] = (acc[quest.type] || 0) + 1;
          }
          return acc;
        }, { strength: 0, speed: 0, magic: 0, willpower: 0 } as Record<QuestType, number>);
        
        console.log("Quest counts by type:", counts);
        setQuestCounts(counts);
      }

      // Fetch rewards
      console.log("Fetching rewards...");
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('*')
        .eq('user_id', user.id);

      if (rewardsError) {
        console.error("Error fetching rewards:", rewardsError);
      }

      if (!rewardsData || rewardsData.length === 0) {
        console.log("No rewards found, generating initial rewards...");
        // If no rewards exist, create initial ones
        const initialRewards = generateInitialRewards(user.id);
        
        // Insert one reward at a time to avoid primary key conflicts
        let insertedRewards = [];
        
        for (const reward of initialRewards) {
          try {
            const { data, error } = await supabase
              .from('rewards')
              .insert(reward)
              .select();
              
            if (error) {
              console.error(`Error inserting reward: ${reward.title}`, error);
            } else if (data && data.length > 0) {
              insertedRewards.push(data[0]);
            }
          } catch (err) {
            console.error(`Failed to insert reward: ${reward.title}`, err);
          }
        }
        
        if (insertedRewards.length > 0) {
          console.log(`Successfully created ${insertedRewards.length} initial rewards`);
          setAvailableRewards(insertedRewards);
        } else {
          // Fallback if no data returned
          setAvailableRewards(initialRewards);
        }
      } else {
        console.log(`Found ${rewardsData.length} existing rewards`);
        setAvailableRewards(rewardsData);
        
        // Set rewards in auth context
        const earnedRewards = rewardsData.filter(r => r.earned || r.date_earned);
        console.log(`Found ${earnedRewards.length} earned rewards`);
        setRewards(earnedRewards);
      }

      // Check if we need to generate more rewards
      const unearnedRewards = rewardsData ? 
        rewardsData.filter(r => !r.date_earned) : [];
        
      if (unearnedRewards.length < 5) {
        console.log(`Only ${unearnedRewards.length} unearned rewards, generating more...`);
        generateNewRewards(user.id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load your rewards data.');
    } finally {
      setLoading(false);
    }
  };

  // Check if rewards should be earned
  useEffect(() => {
    if (completedQuests.length > 0 && availableRewards.length > 0) {
      checkForNewRewards();
    }
  }, [completedQuests, availableRewards]);

  const checkForNewRewards = async () => {
    try {
      console.log("Checking for new rewards based on quest completion...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user found");
        return;
      }

      const updatedRewards = [...availableRewards];
      let newEarned = false;

      // For each reward, check if requirements are met
      for (let i = 0; i < updatedRewards.length; i++) {
        const reward = updatedRewards[i];
        if (reward.date_earned) continue; // Skip already earned rewards
        
        // Check if the quest count for this type meets or exceeds the requirement
        if (questCounts[reward.type] >= reward.requirement) {
          console.log(`Requirements met for reward: ${reward.title}`);
          
          // Update the reward in the database
          const { data: updatedReward, error: updateError } = await supabase
            .from('rewards')
            .update({ 
              earned: true, 
              date_earned: new Date().toISOString() 
            })
            .eq('id', reward.id)
            .select();
            
          if (updateError) {
            console.error("Error updating reward:", updateError);
            continue;
          }
          
          if (updatedReward && updatedReward.length > 0) {
            console.log("Reward updated successfully:", updatedReward[0]);
            updatedRewards[i] = updatedReward[0];
          } else {
            // Fallback to local update if no data returned
            updatedRewards[i] = {
              ...reward,
              earned: true,
              date_earned: new Date().toISOString()
            };
          }
          
          newEarned = true;
            
          // Show celebration alert
          // Alert.alert(
          //   '🎉 Reward Earned!',
          //   `Congratulations! You've earned "${reward.title}"`,
          //   [{ text: 'Awesome!', style: 'default' }]
          // );
        }
      }

      if (newEarned) {
        console.log("Updating rewards state with newly earned rewards");
        setAvailableRewards(updatedRewards);
        
        // Update the rewards in context
        const earnedRewards = updatedRewards.filter(r => r.earned || r.date_earned);
        console.log(`Setting ${earnedRewards.length} earned rewards in context`);
        setRewards(earnedRewards);
      }
    } catch (error) {
      console.error('Error checking rewards:', error);
    }
  };

  // Generate initial rewards
  const generateInitialRewards = (userId: string): Reward[] => {
    console.log("Generating initial rewards...");
    return [
      {
        title: 'Strength Novice',
        description: 'Complete 3 strength quests to prove your physical prowess.',
        type: 'strength',
        requirement: 3,
        difficulty: 'bronze',
        earned: false,
        date_earned: null,
        user_id: userId
      },
      {
        title: 'Speed Seeker',
        description: 'Finish 3 speed quests and demonstrate your agility.',
        type: 'speed',
        requirement: 3,
        difficulty: 'bronze',
        earned: false,
        date_earned: null,
        user_id: userId
      },
      {
        title: 'Magic Apprentice',
        description: 'Master 3 magic quests to harness your inner power.',
        type: 'magic',
        requirement: 3,
        difficulty: 'bronze',
        earned: false,
        date_earned: null,
        user_id: userId
      },
      {
        title: 'Willpower Initiate',
        description: 'Complete 3 willpower quests to strengthen your mental fortitude.',
        type: 'willpower',
        requirement: 3,
        difficulty: 'bronze',
        earned: false,
        date_earned: null,
        user_id: userId
      }
    ];
  };

  // Generate new rewards via OpenAI
  const generateNewRewards = async (userId: string) => {
    setGenerating(true);
    
    try {
      console.log("Generating new rewards via OpenAI...");
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Generate 3 fitness achievement rewards for a fantasy RPG fitness app. Each reward should include:
              - A fantasy-themed title (e.g. "Dragon's Might", "Elven Agility")
              - A brief description (20-30 words) of how to earn it
              - A "type" field that must be one of: strength, speed, magic, willpower
              - A "requirement" field with a number from 5-15 representing how many quests of that type to complete
              - A "difficulty" field that must be one of: bronze, silver, gold (higher requirements should have higher difficulties)
              
              Return ONLY a raw JSON array without code blocks, explanation or commentary.
              Example format:
              [
                {
                  "title": "Mountain Titan",
                  "description": "Complete 7 strength quests to harness the power of ancient titans.",
                  "type": "strength",
                  "requirement": 7,
                  "difficulty": "silver"
                }
              ]`
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      
      const data = await response.json();
      if (!data.choices || !data.choices[0]) throw new Error('Invalid response from OpenAI');
      
      const raw = data.choices[0].message.content;
      
      // Clean up any markdown or extra text
      const jsonString = raw.trim().replace(/^```(json)?/, '').replace(/```$/, '');
      
      let newRewards = JSON.parse(jsonString);
      console.log(`Parsed ${newRewards.length} rewards from OpenAI`);
      
      // Add user_id and earned status
      newRewards = newRewards.map((reward: any) => ({
        ...reward,
        earned: false,
        date_earned: null,
        user_id: userId
      }));
      
      // Insert rewards one by one to avoid primary key conflicts
      let insertedRewards = [];
      
      for (const reward of newRewards) {
        try {
          const { data, error } = await supabase
            .from('rewards')
            .insert(reward)
            .select();
            
          if (error) {
            console.error(`Error inserting reward: ${reward.title}`, error);
          } else if (data && data.length > 0) {
            insertedRewards.push(data[0]);
          }
        } catch (err) {
          console.error(`Failed to insert reward: ${reward.title}`, err);
        }
      }
      
      if (insertedRewards.length > 0) {
        console.log(`Successfully inserted ${insertedRewards.length} new rewards`);
        // Update with the inserted rewards that have IDs from the database
        setAvailableRewards(prev => [...prev, ...insertedRewards]);
      } else {
        // Fallback if no data returned
        const { data: freshRewards } = await supabase
          .from('rewards')
          .select('*')
          .eq('user_id', userId);
          
        if (freshRewards) {
          console.log("Fetched fresh rewards data after insertion");
          setAvailableRewards(freshRewards);
        }
      }
    } catch (err) {
      console.error('Failed to generate new rewards:', err);
      Alert.alert('Error', 'Failed to generate new rewards. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Debug function to log rewards data
  const logRewardsData = () => {
    console.log("Available rewards:", availableRewards);
    console.log("Earned rewards count:", availableRewards.filter(r => r.earned || r.date_earned).length);
    console.log("Auth context rewards:", rewards);
  };

  // Sort rewards by earned status and difficulty
  const sortedRewards = [...availableRewards].sort((a, b) => {
    // First sort by earned status (unearned first)
    if ((a.earned || a.date_earned) && !(b.earned || b.date_earned)) return 1;
    if (!(a.earned || a.date_earned) && (b.earned || b.date_earned)) return -1;
    
    // Then sort by difficulty
    const difficultyOrder = { bronze: 0, silver: 1, gold: 2 };
    return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
  });

  // UI Rendering
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffd700" />
        <Text style={styles.loadingText}>Loading rewards...</Text>
      </View>
    );
  }

  return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="trophy" size={28} color="#ffd700" />
            <Text style={styles.title}>Rewards</Text>
          </View>
          
          <Text style={styles.subtitle}>Complete quests to earn these achievements!</Text>
          
          {/* Summary Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="arm-flex" size={22} color="#ff9e80" />
              <Text style={styles.statCount}>{questCounts.strength}</Text>
              <Text style={styles.statLabel}>Strength</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="run-fast" size={22} color="#80d8ff" />
              <Text style={styles.statCount}>{questCounts.speed}</Text>
              <Text style={styles.statLabel}>Speed</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="magic-staff" size={22} color="#b388ff" />
              <Text style={styles.statCount}>{questCounts.magic}</Text>
              <Text style={styles.statLabel}>Magic</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="meditation" size={22} color="#ea80fc" />
              <Text style={styles.statCount}>{questCounts.willpower}</Text>
              <Text style={styles.statLabel}>Willpower</Text>
            </View>
          </View>
          
          {/* Reload button */}
          <TouchableOpacity 
            style={styles.reloadButton} 
            onPress={fetchData}
          >
            <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
            <Text style={styles.reloadButtonText}>Reload Rewards</Text>
          </TouchableOpacity>
          
          {/* Rewards List */}
          {sortedRewards.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="trophy-outline" size={50} color="#aaa" />
              <Text style={styles.emptyText}>No rewards found</Text>
              <TouchableOpacity 
                style={styles.generateButton} 
                onPress={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    generateNewRewards(user.id);
                  }
                }}
                disabled={generating}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                <Text style={styles.buttonText}>
                  {generating ? 'Generating...' : 'Generate Rewards'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Regular rewards display
            <>
              {/* Section: Rewards In Progress */}
              <Text style={styles.sectionTitle}>Rewards In Progress</Text>
              {sortedRewards.filter(r => !r.earned && !r.date_earned).length === 0 ? (
                <Text style={styles.emptyStateText}>No rewards in progress</Text>
              ) : (
                sortedRewards.filter(r => !r.earned && !r.date_earned).map((reward, index) => {
                  const uniqueKey = `reward-in-progress-${reward.id || index}`;
                  return (
                    <View 
                      key={uniqueKey}
                      style={[styles.rewardBorder, { borderColor: BADGE_COLORS[reward.difficulty][0] }]}
                    >
                      <View style={styles.rewardCard}>
                        <View style={styles.rewardHeader}>
                          <View style={styles.titleContainer}>
                            <MaterialCommunityIcons 
                              name={TYPE_ICONS[reward.type]} 
                              size={20} 
                              color={TYPE_COLORS[reward.type][0]} 
                            />
                            <Text style={styles.rewardTitle}>{reward.title}</Text>
                          </View>
                          <View style={[
                            styles.difficultyBadge, 
                            {backgroundColor: BADGE_COLORS[reward.difficulty][0]}
                          ]}>
                            <Text style={styles.difficultyText}>{reward.difficulty}</Text>
                          </View>
                        </View>
                        
                        <Text style={styles.rewardDescription}>{reward.description}</Text>
                        
                        <View style={styles.rewardFooter}>
                          <View style={styles.progressContainer}>
                            <Text style={styles.progressText}>
                              {`${questCounts[reward.type]}/${reward.requirement} ${reward.type} quests`}
                            </Text>
                            <View style={styles.progressBarOuter}>
                              <View style={[
                                styles.progressBarInner, 
                                {
                                  width: `${Math.min(100, (questCounts[reward.type] / reward.requirement) * 100)}%`,
                                  backgroundColor: TYPE_COLORS[reward.type][0]
                                }
                              ]} />
                            </View>
                          </View>
                          
                          <View style={styles.notEarnedBadge}>
                            <MaterialCommunityIcons 
                              name="clock-outline"
                              size={18} 
                              color="#e63946"
                            />
                            <Text style={styles.notEarnedText}>In Progress</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
              
              {/* Section: Earned Rewards */}
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Earned Rewards</Text>
              {sortedRewards.filter(r => r.earned || r.date_earned).length === 0 ? (
                <Text style={styles.emptyStateText}>No rewards earned yet</Text>
              ) : (
                sortedRewards.filter(r => r.earned || r.date_earned).map((reward, index) => {
                  const uniqueKey = `reward-earned-${reward.id || index}`;
                  return (
                    <View 
                      key={uniqueKey}
                      style={[styles.rewardBorder, { borderColor: BADGE_COLORS[reward.difficulty][0] }]}
                    >
                      <View style={styles.rewardCard}>
                        <View style={styles.rewardHeader}>
                          <View style={styles.titleContainer}>
                            <MaterialCommunityIcons 
                              name={TYPE_ICONS[reward.type]} 
                              size={20} 
                              color={TYPE_COLORS[reward.type][0]} 
                            />
                            <Text style={styles.rewardTitle}>{reward.title}</Text>
                          </View>
                          <View style={[
                            styles.difficultyBadge, 
                            {backgroundColor: BADGE_COLORS[reward.difficulty][0]}
                          ]}>
                            <Text style={styles.difficultyText}>{reward.difficulty}</Text>
                          </View>
                        </View>
                        
                        <Text style={styles.rewardDescription}>{reward.description}</Text>
                        
                        <View style={styles.rewardFooter}>
                          <View style={styles.progressContainer}>
                            <Text style={styles.progressText}>Completed!</Text>
                            <View style={styles.progressBarOuter}>
                              <View style={[
                                styles.progressBarInner, 
                                {
                                  width: '100%',
                                  backgroundColor: TYPE_COLORS[reward.type][0]
                                }
                              ]} />
                            </View>
                          </View>
                          
                          <View style={styles.completedBadge}>
                            <MaterialCommunityIcons 
                              name="check-circle"
                              size={18} 
                              color="#2a9d8f"
                            />
                            <Text style={styles.completedText}>Earned</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
              
              {/* Generate More Button */}
              <TouchableOpacity 
                style={styles.generateButton} 
                onPress={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) generateNewRewards(user.id);
                }}
                disabled={generating}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                <Text style={styles.buttonText}>
                  {generating ? 'Generating...' : 'Generate New Rewards'}
                </Text>
              </TouchableOpacity>
              
              {/* Earned Rewards Count */}
              <Text style={styles.earnedCount}>
                {availableRewards.filter(r => r.earned || r.date_earned).length} of {availableRewards.length} rewards earned
              </Text>
            </>
          )}
        </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e2e',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  
  // Reload button
  reloadButton: {
    backgroundColor: '#2a9d8f',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  reloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Section titles
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8f8f2',
    marginBottom: 12,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(42, 42, 64, 0.5)',
    borderRadius: 12,
    marginVertical: 20,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8f8f2',
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#bbb',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statCount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  
  // Reward Cards
  rewardBorder: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  rewardCard: {
    backgroundColor: '#2a2a40',
    padding: 16,
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
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
    textTransform: 'capitalize',
  },
  rewardDescription: {
    fontSize: 14,
    color: '#ddd',
    marginBottom: 12,
    lineHeight: 20,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressText: {
    color: '#bbb',
    fontSize: 14,
    marginBottom: 4,
  },
  progressBarOuter: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: 8,
    borderRadius: 4,
  },
  completedBadge: {
    backgroundColor: 'rgba(42, 157, 143, 0.2)',
    padding: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedText: {
    color: '#2a9d8f',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  notEarnedBadge: {
    backgroundColor: 'rgba(230, 57, 70, 0.2)',
    padding: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notEarnedText: {
    color: '#e63946',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  
  // Generate Button
  generateButton: {
    backgroundColor: '#6a4c93',
    marginTop: 8,
    marginBottom: 16,
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
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  
  // Footer
  earnedCount: {
    color: '#bbb',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
});