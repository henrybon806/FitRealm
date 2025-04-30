import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../app/AuthProvider';
import { supabase } from '../app/supabase';
import { GuildEvent } from '../types/guildTypes';

type CreateEventNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateEvent'>;
type CreateEventRouteProp = RouteProp<RootStackParamList, 'CreateEvent'>;

interface EventFormData {
  title: string;
  description: string;
  event_type: GuildEvent['event_type'];
  start_date: Date;
  end_date: Date;
  reward_description: string;
  xp_reward: number;
  location?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  required_workout_type?: GuildEvent['required_workout_type'];
  has_goal: boolean;
  goal?: number;
}

const EVENT_TYPES: Array<{value: GuildEvent['event_type']; label: string; icon: string}> = [
  { value: 'challenge', label: 'Challenge', icon: '🏆' },
  { value: 'raid', label: 'Raid', icon: '⚔️' },
  { value: 'tournament', label: 'Tournament', icon: '🏅' },
  { value: 'workout', label: 'Workout', icon: '💪' },
  { value: 'meetup', label: 'Meetup', icon: '👥' },
  { value: 'competition', label: 'Competition', icon: '🥇' },
];

const WORKOUT_TYPES: Array<{value: GuildEvent['required_workout_type']; label: string; icon: string}> = [
  { value: 'strength', label: 'Strength', icon: '💪' },
  { value: 'speed', label: 'Speed', icon: '🏃' },
  { value: 'magic', label: 'Magic', icon: '✨' },
  { value: 'willpower', label: 'Willpower', icon: '🧠' },
];

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner', color: '#4caf50' },
  { value: 'intermediate', label: 'Intermediate', color: '#ff9800' },
  { value: 'advanced', label: 'Advanced', color: '#f44336' },
];

export default function CreateEventScreen() {
  const navigation = useNavigation<CreateEventNavigationProp>();
  const route = useRoute<CreateEventRouteProp>();
  const { guildId } = route.params || { guildId: undefined };
  const { user } = useAuth();

  // Initialize with default values
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    event_type: 'challenge',
    start_date: new Date(Date.now() + 3600000), // 1 hour from now
    end_date: new Date(Date.now() + 86400000), // 1 day from now
    reward_description: '',
    xp_reward: 100,
    difficulty: 'beginner',
    has_goal: false,
    goal: undefined,
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EventFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <K extends keyof EventFormData>(
    field: K, 
    value: EventFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when it's updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EventFormData, string>> = {};
    
    // Required fields
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }
    
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }
    
    if (!formData.reward_description.trim()) {
      newErrors.reward_description = "Reward description is required";
    }
    
    if (formData.xp_reward <= 0) {
      newErrors.xp_reward = "XP reward must be greater than 0";
    }

    // Date validation
    const now = new Date();
    if (formData.start_date <= now) {
      newErrors.start_date = "Start date must be in the future";
    }
    
    if (formData.end_date <= formData.start_date) {
      newErrors.end_date = "End date must be after start date";
    }
    
    // Goal validation
    if (formData.has_goal && (!formData.goal || formData.goal <= 0)) {
      newErrors.goal = "Goal must be a positive number";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user || !guildId) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const newEvent = {
        guild_id: guildId,
        title: formData.title,
        description: formData.description,
        event_type: formData.event_type,
        start_date: formData.start_date.toISOString(),
        end_date: formData.end_date.toISOString(),
        reward_description: formData.reward_description,
        xp_reward: formData.xp_reward,
        status: 'upcoming', // Default status
        creator_id: user.id,
        difficulty: formData.difficulty,
        location: formData.location || null,
        required_workout_type: formData.required_workout_type || null,
        goal: formData.has_goal ? formData.goal : null,
      };
      
      // In a real app, insert into Supabase
      // const { data, error } = await supabase
      //  .from('guild_events')
      //  .insert([newEvent])
      //  .select();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        "Success!",
        "Event created successfully! Guild members will be notified.",
        [{ text: "OK", onPress: () => navigation.navigate('GuildEvents', { guildId }) }]
      );
    } catch (error) {
      console.error("Error creating event:", error);
      Alert.alert("Error", "Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Event</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Event Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter event title"
            placeholderTextColor="#888"
            value={formData.title}
            onChangeText={(text) => updateField('title', text)}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>
        
        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Describe the event, rules, and expectations"
            placeholderTextColor="#888"
            value={formData.description}
            onChangeText={(text) => updateField('description', text)}
            multiline
            textAlignVertical="top"
            numberOfLines={4}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>
        
        {/* Event Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Event Type</Text>
          <View style={styles.optionsContainer}>
            {EVENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.optionButton,
                  formData.event_type === type.value && styles.selectedOptionButton
                ]}
                onPress={() => updateField('event_type', type.value)}
              >
                <Text style={styles.optionIcon}>{type.icon}</Text>
                <Text style={[
                  styles.optionText,
                  formData.event_type === type.value && styles.selectedOptionText
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Difficulty Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Difficulty Level</Text>
          <View style={styles.difficultyOptions}>
            {DIFFICULTIES.map((diff) => (
              <TouchableOpacity
                key={diff.value}
                style={[
                  styles.difficultyButton,
                  { borderColor: diff.color },
                  formData.difficulty === diff.value && { backgroundColor: diff.color }
                ]}
                onPress={() => updateField('difficulty', diff.value as 'beginner' | 'intermediate' | 'advanced')}
              >
                <Text style={[
                  styles.difficultyText,
                  formData.difficulty === diff.value && styles.selectedDifficultyText
                ]}>
                  {diff.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Schedule</Text>
        
        {/* Start Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Start Date & Time</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#bbb" style={styles.dateIcon} />
            <Text style={styles.dateText}>{formatDate(formData.start_date)}</Text>
          </TouchableOpacity>
          {showStartDatePicker && (
            <DateTimePicker
              value={formData.start_date}
              mode="datetime"
              display="default"
              onChange={(_, date) => {
                setShowStartDatePicker(false);
                if (date) updateField('start_date', date);
              }}
            />
          )}
          {errors.start_date && <Text style={styles.errorText}>{errors.start_date}</Text>}
        </View>
        
        {/* End Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>End Date & Time</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#bbb" style={styles.dateIcon} />
            <Text style={styles.dateText}>{formatDate(formData.end_date)}</Text>
          </TouchableOpacity>
          {showEndDatePicker && (
            <DateTimePicker
              value={formData.end_date}
              mode="datetime"
              display="default"
              onChange={(_, date) => {
                setShowEndDatePicker(false);
                if (date) updateField('end_date', date);
              }}
            />
          )}
          {errors.end_date && <Text style={styles.errorText}>{errors.end_date}</Text>}
        </View>
        
        {/* Location (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Location (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Physical location or virtual link"
            placeholderTextColor="#888"
            value={formData.location || ''}
            onChangeText={(text) => updateField('location', text)}
          />
        </View>
        
        <Text style={styles.sectionTitle}>Requirements & Rewards</Text>
        
        {/* Workout Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Required Workout Type (Optional)</Text>
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                !formData.required_workout_type && styles.selectedOptionButton
              ]}
              onPress={() => updateField('required_workout_type', undefined)}
            >
              <Text style={styles.optionIcon}>🔄</Text>
              <Text style={[
                styles.optionText,
                !formData.required_workout_type && styles.selectedOptionText
              ]}>
                Any
              </Text>
            </TouchableOpacity>
            
            {WORKOUT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.optionButton,
                  formData.required_workout_type === type.value && styles.selectedOptionButton
                ]}
                onPress={() => updateField('required_workout_type', type.value)}
              >
                <Text style={styles.optionIcon}>{type.icon}</Text>
                <Text style={[
                  styles.optionText,
                  formData.required_workout_type === type.value && styles.selectedOptionText
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Goal Setting */}
        <View style={styles.inputGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.inputLabel}>Set Completion Goal</Text>
            <Switch
              value={formData.has_goal}
              onValueChange={(value) => updateField('has_goal', value)}
              trackColor={{ false: '#3e3e5e', true: '#6173e8' }}
              thumbColor={formData.has_goal ? '#4e60d3' : '#f4f3f4'}
            />
          </View>
          
          {formData.has_goal && (
            <View style={styles.goalInputContainer}>
              <TextInput
                style={styles.numberInput}
                placeholder="Goal amount"
                placeholderTextColor="#888"
                value={formData.goal?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseInt(text);
                  updateField('goal', isNaN(num) ? undefined : num);
                }}
                keyboardType="number-pad"
              />
              {errors.goal && <Text style={styles.errorText}>{errors.goal}</Text>}
            </View>
          )}
        </View>
        
        {/* XP Reward */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>XP Reward</Text>
          <View style={styles.xpInputRow}>
            <Ionicons name="star" size={20} color="#ffd700" />
            <TextInput
              style={[styles.numberInput, styles.xpInput]}
              value={formData.xp_reward.toString()}
              onChangeText={(text) => {
                const num = parseInt(text);
                updateField('xp_reward', isNaN(num) ? 0 : num);
              }}
              keyboardType="number-pad"
            />
            <Text style={styles.xpText}>XP</Text>
          </View>
          {errors.xp_reward && <Text style={styles.errorText}>{errors.xp_reward}</Text>}
        </View>
        
        {/* Reward Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Reward Description</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 'Strength Badge + 200 XP'"
            placeholderTextColor="#888"
            value={formData.reward_description}
            onChangeText={(text) => updateField('reward_description', text)}
          />
          {errors.reward_description && <Text style={styles.errorText}>{errors.reward_description}</Text>}
        </View>
        
        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.submitIcon} />
              <Text style={styles.submitText}>Create Event</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#151525',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    width: 40, // For balance with back button
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#bbb',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2a2a40',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    maxHeight: 150,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a40',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    marginBottom: 8,
    minWidth: '45%',
  },
  selectedOptionButton: {
    backgroundColor: '#4e60d3',
  },
  optionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  optionText: {
    color: '#bbb',
    fontSize: 14,
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  difficultyOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedDifficultyText: {
    fontWeight: 'bold',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a40',
    borderRadius: 8,
    padding: 12,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalInputContainer: {
    marginTop: 8,
  },
  numberInput: {
    backgroundColor: '#2a2a40',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  xpInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a40',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  xpInput: {
    flex: 1,
    backgroundColor: 'transparent',
    marginLeft: 8,
  },
  xpText: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4e60d3',
    borderRadius: 8,
    paddingVertical: 16,
    marginTop: 32,
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  submitIcon: {
    marginRight: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});