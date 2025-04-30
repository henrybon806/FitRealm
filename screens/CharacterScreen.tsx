import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  ScrollView
} from 'react-native';
import { useAuth } from '../app/AuthProvider';
import { supabase } from '../app/supabase';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type CharacterScreenNavigationProp = BottomTabNavigationProp<RootStackParamList, 'Character'>;

interface Character {
  id?: string;
  user_id: string;
  name: string;
  class?: string;
  level: number;
  xp: number;
  strength: number;
  speed: number;
  magic: number;
  willpower: number;
}

const CHARACTER_CLASSES = [
  { name: 'Warrior', icon: 'sword', color: '#e63946', statBonus: 'strength' },
  { name: 'Rogue', icon: 'run-fast', color: '#f4a261', statBonus: 'speed' },
  { name: 'Mage', icon: 'magic-staff', color: '#6a4c93', statBonus: 'magic' },
  { name: 'Monk', icon: 'meditation', color: '#2a9d8f', statBonus: 'willpower' },
];
import { CharacterScreenNavigationProp } from '../types/navigation';

export default function CharacterScreen() {
  const navigation = useNavigation<CharacterScreenNavigationProp>();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedClass, setSelectedClass] = useState(0);
  const [recentWorkout, setRecentWorkout] = useState<string | null>(null);
  
  useEffect(() => {
    if (!authLoading && !user) {
      Alert.alert('Not Authenticated', 'Please sign in to continue');
      navigation.navigate('Login');
    }
  }, [user, authLoading, navigation]);

  useEffect(() => {
    const fetchCharacter = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching character:", error);
        }

        if (data) {
          setCharacter(data as Character);
          console.log("Retrieved character:", data);
          
          // Find class based on highest stat
          const stats = ['strength', 'speed', 'magic', 'willpower'];
          const highestStat = stats.reduce((prev, curr) => 
            (data[curr] > data[prev] ? curr : prev), stats[0]);
          const classIndex = stats.findIndex(s => s === highestStat);
          setSelectedClass(classIndex >= 0 ? classIndex : 0);
        }
      } catch (error) {
        console.error("Error in fetchCharacter:", error);
      } finally {
        setInitialLoad(false);
      }
    };

    if (user) {
      fetchCharacter();
    }
  }, [user]);

  const createCharacter = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a character name");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to create a character");
      return;
    }

    setLoading(true);

    try {
      // Give a bonus to the selected class's primary stat
      const characterStats = {
        strength: selectedClass === 0 ? 2 : 0,
        speed: selectedClass === 1 ? 2 : 0,
        magic: selectedClass === 2 ? 2 : 0,
        willpower: selectedClass === 3 ? 2 : 0,
      };
      
      const characterData: Character = {
        user_id: user.id,
        name,
        class: CHARACTER_CLASSES[selectedClass].name,
        level: 1,
        xp: 0,
        ...characterStats
      };

      const { data, error } = await supabase
        .from('characters')
        .insert([characterData])
        .select();

      if (error) {
        console.error("Error creating character:", error);
        Alert.alert("Error", "Failed to create character. Please try again.");
        return;
      }

      console.log("Character created successfully:", data);
      setCharacter(data[0]);
      Alert.alert("Success", `${name} the ${CHARACTER_CLASSES[selectedClass].name} is ready for adventure!`);
    } catch (error) {
      console.error("Error in createCharacter:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const logWorkout = async (type: 'strength' | 'speed' | 'magic' | 'willpower') => {
    if (!character || !user) return;

    setLoading(true);
    setRecentWorkout(type);

    try {
      // Calculate XP gain - bonus for matching class specialty
      const characterClass = character.class || CHARACTER_CLASSES[selectedClass].name;
      const isClassSpecialty = CHARACTER_CLASSES.find(c => c.name === characterClass)?.statBonus === type;
      const xpGain = isClassSpecialty ? 120 : 100;
      
      const newXP = character.xp + xpGain;
      const xpForNextLevel = character.level * 1000;
      const currentLevel = character.level;
      const newLevel = Math.floor(newXP / 1000) + 1;
      const didLevelUp = newLevel > currentLevel;

      // Create updates object
      const updates: Partial<Character> = {
        xp: newXP,
        level: newLevel,
      };
      
      // Update the specific stat
      updates[type] = character[type] + 1;

      console.log("Updating character with:", updates);
      console.log("Character ID:", character.id);

      // First, try to update using the character ID (preferred)
      let updateResult;
      if (character.id) {
        updateResult = await supabase
          .from('characters')
          .update(updates)
          .eq('id', character.id)
          .select();
      } else {
        // Fallback to updating by user_id if no character id is available
        updateResult = await supabase
          .from('characters')
          .update(updates)
          .eq('user_id', user.id)
          .select();
      }

      const { data, error } = updateResult;

      if (error) {
        console.error("Error updating character:", error);
        Alert.alert("Error", "Failed to log workout. Please try again.");
        return;
      }

      console.log("Character updated successfully:", data);
      if (data && data.length > 0) {
        setCharacter(data[0]);
      } else {
        // Fallback to manually updating the local state if no data returned
        const updatedChar = { ...character, ...updates };
        setCharacter(updatedChar);
      }

      if (didLevelUp) {
        Alert.alert(
          "🎉 Level Up!", 
          `${character.name} reached level ${newLevel}!\n\n+1 ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          [{ text: "Continue the adventure!", style: "default" }]
        );
      } else {
        const remaining = xpForNextLevel - newXP;
        Alert.alert(
          "Workout Logged", 
          `+${xpGain} XP and +1 ${type.charAt(0).toUpperCase() + type.slice(1)}!\n\n${remaining} XP until level ${currentLevel + 1}`,
          [{ text: "Keep training!", style: "default" }]
        );
      }
    } catch (error) {
      console.error("Error in logWorkout:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      
      // Clear recent workout highlight after 3 seconds
      setTimeout(() => setRecentWorkout(null), 3000);
    }
  };

  // Loading screen
  if (authLoading || initialLoad) {
    return (
      <LinearGradient 
        colors={['#1e1e2e', '#2a2a40']} 
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#ffd700" />
        <Text style={styles.loadingText}>Loading your adventure...</Text>
      </LinearGradient>
    );
  }

  // Character creation screen
  if (!character) {
    return (
        <LinearGradient 
          colors={['#1e1e2e', '#2a2a40']} 
          style={styles.gradientBackground}
        >
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.createContainer}>
              <MaterialCommunityIcons name="sword-cross" size={60} color="#ffd700" style={styles.createIcon} />
              <Text style={styles.createTitle}>Create Your Hero</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Enter your hero's name"
                placeholderTextColor="#aaa"
                value={name}
                onChangeText={setName}
              />
              
              <Text style={styles.classTitle}>Choose Your Class</Text>
              
              <View style={styles.classContainer}>
                {CHARACTER_CLASSES.map((charClass, index) => (
                  <TouchableOpacity
                    key={charClass.name}
                    style={[
                      styles.classOption,
                      selectedClass === index && { borderColor: charClass.color }
                    ]}
                    onPress={() => setSelectedClass(index)}
                  >
                    <MaterialCommunityIcons 
                      name={charClass.icon} 
                      size={32} 
                      color={selectedClass === index ? charClass.color : '#aaa'} 
                    />
                    <Text style={[
                      styles.className,
                      selectedClass === index && { color: charClass.color }
                    ]}>
                      {charClass.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.classDescription}>
                <Text style={styles.classDescTitle}>
                  {CHARACTER_CLASSES[selectedClass].name}
                </Text>
                <Text style={styles.classDescText}>
                  {getClassDescription(CHARACTER_CLASSES[selectedClass].name)}
                </Text>
                <Text style={styles.bonusText}>
                  Starting Bonus: +2 {CHARACTER_CLASSES[selectedClass].statBonus}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.createButton,
                  { backgroundColor: CHARACTER_CLASSES[selectedClass].color },
                  loading && styles.buttonDisabled
                ]}
                onPress={createCharacter}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Creating..." : "Begin Your Quest"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </LinearGradient>
    );
  }

  // Calculate XP percentage for the current level
  const xpForCurrentLevel = (character.level - 1) * 1000;
  const xpForNextLevel = character.level * 1000;
  const xpInCurrentLevel = character.xp - xpForCurrentLevel;
  const xpPercentage = (xpInCurrentLevel / 1000) * 100;
  
  // Character detail screen
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
                {character.class && (
                  <View style={styles.classBar}>
                    <MaterialCommunityIcons 
                      name={CHARACTER_CLASSES[selectedClass].icon} 
                      size={18} 
                      color={CHARACTER_CLASSES[selectedClass].color} 
                    />
                    <Text style={[
                      styles.characterClass,
                      { color: CHARACTER_CLASSES[selectedClass].color }
                    ]}>
                      {character.class}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>LVL {character.level}</Text>
              </View>
            </View>
            
            <View style={styles.xpContainer}>
              <Text style={styles.xpText}>
                {xpInCurrentLevel} / 1000 XP • {xpForNextLevel - character.xp} until next level
              </Text>
              <View style={styles.barOuter}>
                <View 
                  style={[
                    styles.barInner, 
                    { width: `${xpPercentage}%` }
                  ]} 
                />
              </View>
            </View>
          </LinearGradient>
          
          {/* Stats Section */}
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="chart-bar" size={22} color="#ffd700" />
            <Text style={styles.sectionTitle}>Character Stats</Text>
          </View>
          
          <LinearGradient 
            colors={['#2a2a40', '#3a3a55']} 
            style={styles.statsCard}
          >
            <Text style={styles.statsSubtitle}>Your abilities grow as you train...</Text>
            
            {renderStat(
              'arm-flex', 
              'Strength', 
              character.strength, 
              '#e63946', 
              'Upper body & leg workouts',
              recentWorkout === 'strength'
            )}
            
            {renderStat(
              'run-fast', 
              'Speed', 
              character.speed, 
              '#f4a261', 
              'Cardio, HIIT & agility training',
              recentWorkout === 'speed'
            )}
            
            {renderStat(
              'magic-staff', 
              'Magic', 
              character.magic, 
              '#6a4c93', 
              'Yoga, stretching & mobility',
              recentWorkout === 'magic'
            )}
            
            {renderStat(
              'meditation', 
              'Willpower', 
              character.willpower, 
              '#2a9d8f', 
              'Consistency & mental toughness',
              recentWorkout === 'willpower'
            )}
          </LinearGradient>

          {/* Workout Actions */}
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="dumbbell" size={22} color="#ffd700" />
            <Text style={styles.sectionTitle}>Log Workout</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.workoutButton, { backgroundColor: '#e63946' }, loading && styles.buttonDisabled]}
            onPress={() => logWorkout('strength')}
            disabled={loading}
          >
            <MaterialCommunityIcons name="arm-flex" size={24} color="#fff" />
            <Text style={styles.workoutText}>Strength Training</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.workoutButton, { backgroundColor: '#f4a261' }, loading && styles.buttonDisabled]}
            onPress={() => logWorkout('speed')}
            disabled={loading}
          >
            <MaterialCommunityIcons name="run-fast" size={24} color="#fff" />
            <Text style={styles.workoutText}>Cardio / HIIT</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.workoutButton, { backgroundColor: '#6a4c93' }, loading && styles.buttonDisabled]}
            onPress={() => logWorkout('magic')}
            disabled={loading}
          >
            <MaterialCommunityIcons name="magic-staff" size={24} color="#fff" />
            <Text style={styles.workoutText}>Yoga / Flexibility</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.workoutButton, { backgroundColor: '#2a9d8f' }, loading && styles.buttonDisabled]}
            onPress={() => logWorkout('willpower')}
            disabled={loading}
          >
            <MaterialCommunityIcons name="meditation" size={24} color="#fff" />
            <Text style={styles.workoutText}>Streak / Consistency</Text>
          </TouchableOpacity>
          
          {/* Class Bonus Info */}
          {character.class && (
            <View style={[styles.classBonus, { borderColor: CHARACTER_CLASSES[selectedClass].color }]}>
              <MaterialCommunityIcons 
                name={CHARACTER_CLASSES[selectedClass].icon} 
                size={20} 
                color={CHARACTER_CLASSES[selectedClass].color} 
              />
              <Text style={styles.classBonusText}>
                {character.class} Bonus: +20% XP for {CHARACTER_CLASSES[selectedClass].statBonus} workouts
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
  );
}

function renderStat(
  icon: string,
  label: string, 
  value: number, 
  color: string, 
  subtitle: string,
  isRecent: boolean = false
) {
  return (
    <View style={[styles.statItem, isRecent && styles.recentStat]}>
      <View style={styles.statHeader}>
        <View style={styles.statLabelContainer}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
          <Text style={styles.statLabel}>{label}</Text>
        </View>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
      <View style={styles.statBarOuter}>
        <View style={[
          styles.statBarInner, 
          { width: `${Math.min(value * 3, 100)}%`, backgroundColor: color }
        ]} />
      </View>
    </View>
  );
}

function getClassDescription(className: string): string {
  switch(className) {
    case 'Warrior':
      return 'Masters of physical prowess who excel at strength training. Their discipline makes every rep count.';
    case 'Rogue':
      return 'Swift and agile adventurers who thrive on cardio and HIIT. They can dash through any workout with ease.';
    case 'Mage':
      return 'Scholars of body knowledge who focus on flexibility and form. Their yoga practice unlocks arcane physical potential.';
    case 'Monk':
      return 'Embodiments of mental discipline who build consistency. Their willpower transforms routine into power.';
    default:
      return 'A versatile adventurer balancing multiple training methods.';
  }
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
  },
  
  // Character Creation
  createContainer: {
    alignItems: 'center',
    padding: 16,
  },
  createIcon: {
    marginBottom: 20,
  },
  createTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8f8f2',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#4e4e6f',
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    color: '#fff',
    fontSize: 16,
    marginBottom: 24,
  },
  classTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8f8f2',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  classContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  classOption: {
    backgroundColor: '#2a2a40',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  className: {
    color: '#ddd',
    marginTop: 8,
    fontSize: 12,
    fontWeight: 'bold',
  },
  classDescription: {
    backgroundColor: '#2a2a40',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
  },
  classDescTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  classDescText: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  bonusText: {
    color: '#ffd700',
    fontStyle: 'italic',
    textTransform: 'capitalize',
  },
  createButton: {
    width: '100%',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
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
  classBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  characterClass: {
    fontSize: 16,
    marginLeft: 6,
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
    marginTop: 8,
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
  
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Stats Card
  statsCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  statsSubtitle: {
    fontSize: 14,
    color: '#bbb',
    marginBottom: 16,
    textAlign: 'center',
  },
  statItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(42, 42, 64, 0.5)',
    borderRadius: 12,
  },
  recentStat: {
    borderWidth: 1,
    borderColor: '#ffd700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statSubtitle: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 8,
  },
  statBarOuter: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statBarInner: {
    height: 8,
    borderRadius: 4,
  },
  
  // Workout Buttons
  workoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 12,
  },
  
  // Class Bonus
  classBonus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 64, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  classBonusText: {
    color: '#ddd',
    marginLeft: 8,
    fontSize: 14,
  }
});