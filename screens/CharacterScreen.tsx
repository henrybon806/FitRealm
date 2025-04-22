import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { Character } from '../types/characterTypes';
import { SUPABASE_URL as url, SUPABASE_ANON_KEY as key } from '@env';

export const supabase = createClient(url, key);

export default function CharacterScreen() {
  const [name, setName] = useState('');
  const [character, setCharacter] = useState<Character | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from('characters')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) setCharacter(data as Character);
      }
    };

    fetchUser();
  }, []);

  const createCharacter = async () => {
    if (!userId || !name.trim()) return;

    const characterData: Character = {
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
      .insert([{ id: userId, ...characterData }]);

    if (!error) setCharacter(characterData);
  };

  const logWorkout = async (type: keyof Omit<Character, 'name' | 'level' | 'xp'>) => {
    if (!character || !userId) return;

    const updates: Partial<Character> = { xp: character.xp + 100 };
    updates[type] = character[type] + 1;

    const updatedChar = { ...character, ...updates };
    setCharacter(updatedChar);

    await supabase
      .from('characters')
      .update(updates)
      .eq('id', userId);
  };

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
        <TouchableOpacity style={styles.button} onPress={createCharacter}>
          <Text style={styles.buttonText}>Begin Your Quest</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{character.name} — Level {character.level}</Text>
      <Text style={styles.pathText}>🏹 No class. No limits. You shape your legend.</Text>
      <Text style={styles.xp}>🧭 XP: {character.xp}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionSubtitle}>Your path emerges based on how you train...</Text>
        {renderStat('💪 Strength', character.strength, '#e63946', 'Gained from upper body & leg days')}
        {renderStat('⚡ Speed', character.speed, '#f4a261', 'Gained from cardio, HIIT, agility')}
        {renderStat('🔮 Magic', character.magic, '#6a4c93', 'Gained from yoga, stretching, mobility')}
        {renderStat('🔥 Willpower', character.willpower, '#2a9d8f', 'Gained from streaks & consistency')}
      </View>

      <Text style={styles.sectionTitle}>💥 Shape Your Destiny</Text>
      <TouchableOpacity style={[styles.button, { backgroundColor: '#e63946' }]} onPress={() => logWorkout('strength')}>
        <Text style={styles.buttonText}>Upper Body / Leg Day</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { backgroundColor: '#f4a261' }]} onPress={() => logWorkout('speed')}>
        <Text style={styles.buttonText}>Cardio / HIIT</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { backgroundColor: '#6a4c93' }]} onPress={() => logWorkout('magic')}>
        <Text style={styles.buttonText}>Yoga / Flexibility</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { backgroundColor: '#2a9d8f' }]} onPress={() => logWorkout('willpower')}>
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
        <View style={{ width: `${value * 10}%`, height: 8, backgroundColor: color, borderRadius: 4 }} />
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
  xp: {
    fontSize: 16,
    color: '#d6d6d6',
    marginBottom: 16,
    textAlign: 'center',
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
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
