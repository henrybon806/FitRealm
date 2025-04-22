// Milestone 1: Character Creation + XP System (Supabase Version)

import { useState, useEffect } from 'react';
import { View, Text, Button, TextInput } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { Character } from '../types/characterTypes';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function CharacterScreen() {
  const [name, setName] = useState('');
  const [character, setCharacter] = useState<Character | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data, error } = await supabase
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
    if (!userId) return;

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

  const logWorkout = async (type: 'strength' | 'speed' | 'magic' | 'willpower') => {
    if (!character || !userId) return;

    const updates: Partial<Character> = { xp: character.xp + 100 };

    switch (type) {
      case 'strength':
        updates.strength = character.strength + 1;
        break;
      case 'speed':
        updates.speed = character.speed + 1;
        break;
      case 'magic':
        updates.magic = character.magic + 1;
        break;
      case 'willpower':
        updates.willpower = character.willpower + 1;
        break;
    }

    const updatedChar = { ...character, ...updates };
    setCharacter(updatedChar);

    await supabase
      .from('characters')
      .update(updates)
      .eq('id', userId);
  };

  if (!character) {
    return (
      <View>
        <Text>Create Your Character</Text>
        <TextInput placeholder="Name" value={name} onChangeText={setName} />
        <Button title="Create" onPress={createCharacter} />
      </View>
    );
  }

  return (
    <View>
      <Text>{character.name} - Level {character.level}</Text>
      <Text>XP: {character.xp}</Text>
      <Text>Strength: {character.strength}</Text>
      <Text>Speed/Dexterity: {character.speed}</Text>
      <Text>Magic/Mana: {character.magic}</Text>
      <Text>Willpower: {character.willpower}</Text>

      <Button title="Log Strength Workout" onPress={() => logWorkout('strength')} />
      <Button title="Log Cardio Workout" onPress={() => logWorkout('speed')} />
      <Button title="Log Yoga Workout" onPress={() => logWorkout('magic')} />
      <Button title="Log Streak Workout" onPress={() => logWorkout('willpower')} />
    </View>
  );
}
