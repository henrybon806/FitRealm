import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../app/AuthProvider';
import { Character } from '../types/characterTypes';
import { supabase } from '../app/supabase';
import { useNavigation } from '@react-navigation/native';
import { CharacterScreenNavigationProp } from '../types/navigation';

export default function CharacterScreen() {
  const navigation = useNavigation<CharacterScreenNavigationProp>();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Redirect if not authenticated
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
      const characterData: Character = {
        user_id: user.id,
        name,
        level: 1,
        xp: 0,
        strength: 0,
        speed: 0,
        magic: 0,
        willpower: 0,
      };

      const { error } = await supabase
        .from('characters')
        .insert([characterData]);

      if (error) {
        console.error("Error creating character:", error);
        Alert.alert("Error", "Failed to create character. Please try again.");
        return;
      }

      setCharacter(characterData);
      Alert.alert("Success", `${name} is ready for adventure!`);
    } catch (error) {
      console.error("Error in createCharacter:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const logWorkout = async (type: keyof Omit<Character, 'name' | 'level' | 'xp' | 'user_id'>) => {
    if (!character || !user) return;

    setLoading(true);

    try {
      const newXP = character.xp + 100;
      const currentLevel = character.level;
      const newLevel = Math.floor(newXP / 1000) + 1;
      const didLevelUp = newLevel > currentLevel;

      const updates: Partial<Character> = {
        xp: newXP,
        level: newLevel,
        [type]: character[type] + 1,
      };

      const updatedChar = { ...character, ...updates };

      const { error } = await supabase
        .from('characters')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        console.error("Error logging workout:", error);
        Alert.alert("Error", "Failed to log workout. Please try again.");
        return;
      }

      setCharacter(updatedChar);

      if (didLevelUp) {
        Alert.alert("Level Up!", `${character.name} reached level ${newLevel}! 🎉`);
      } else {
        Alert.alert("Workout Logged", `+100 XP and +1 ${type.charAt(0).toUpperCase() + type.slice(1)}!`);
      }
    } catch (error) {
      console.error("Error in logWorkout:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || initialLoad) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4e60d3" />
        <Text style={styles.loadingText}>Loading your adventure...</Text>
      </View>
    );
  }

  if (!character) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>⚔️ Create Your Hero</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your hero's name"
          placeholderTextColor="#ccc"
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={createCharacter}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creating..." : "Begin Your Quest"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{character.name} — Level {character.level}</Text>
      <Text style={styles.pathText}>🏹 No class. No limits. You shape your legend.</Text>

      <View style={styles.xpContainer}>
        <Text style={styles.xp}>🧭 XP: {character.xp} / {character.level * 1000}</Text>
        <View style={styles.xpBar}>
          <View
            style={[
              styles.xpProgress,
              { width: `${(character.xp % 1000) / 10}%` }
            ]}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionSubtitle}>Your path emerges based on how you train...</Text>
        {renderStat('💪 Strength', character.strength, '#e63946', 'Gained from upper body & leg days')}
        {renderStat('⚡ Speed', character.speed, '#f4a261', 'Gained from cardio, HIIT, agility')}
        {renderStat('🔮 Magic', character.magic, '#6a4c93', 'Gained from yoga, stretching, mobility')}
        {renderStat('🔥 Willpower', character.willpower, '#2a9d8f', 'Gained from streaks & consistency')}
      </View>

      <Text style={styles.sectionTitle}>💥 Shape Your Destiny</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#e63946' }, loading && styles.buttonDisabled]}
        onPress={() => logWorkout('strength')}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Upper Body / Leg Day</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#f4a261' }, loading && styles.buttonDisabled]}
        onPress={() => logWorkout('speed')}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Cardio / HIIT</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#6a4c93' }, loading && styles.buttonDisabled]}
        onPress={() => logWorkout('magic')}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Yoga / Flexibility</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#2a9d8f' }, loading && styles.buttonDisabled]}
        onPress={() => logWorkout('willpower')}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Streak Workout</Text>
      </TouchableOpacity>
    </View>
  );
}

function renderStat(label: string, value: number, color: string, subtitle: string) {
  return (
    <View style={{ marginVertical: 10 }}>
      <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 16 }}>{label}: {value}</Text>
      <Text style={{ color: '#ccc', fontSize: 12, marginBottom: 4 }}>{subtitle}</Text>
      <View style={{ backgroundColor: '#444', height: 8, borderRadius: 4 }}>
        <View style={{
          width: `${Math.min(value * 5, 100)}%`,
          height: 8,
          backgroundColor: color,
          borderRadius: 4
        }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#1e1e2e',
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#f8f8f2',
    marginTop: 12,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8f8f2',
    textAlign: 'center',
    marginBottom: 10,
  },
  pathText: {
    color: '#bbb',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
  },
  xpContainer: {
    marginBottom: 16,
  },
  xp: {
    fontSize: 16,
    color: '#d6d6d6',
    marginBottom: 8,
    textAlign: 'center',
  },
  xpBar: {
    height: 12,
    backgroundColor: '#2d2d44',
    borderRadius: 6,
    overflow: 'hidden',
  },
  xpProgress: {
    height: '100%',
    backgroundColor: '#4e60d3',
    borderRadius: 6,
  },
  card: {
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#bbb',
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8f8f2',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    backgroundColor: '#2a2a40',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4e60d3',
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
