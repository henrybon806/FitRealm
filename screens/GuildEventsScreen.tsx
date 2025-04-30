import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView
} from 'react-native';
import { useAuth } from '../app/AuthProvider';
import { supabase } from '../app/supabase';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import { GuildEvent } from '../types/guildTypes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FitRealmColors, FitRealmStyles } from '../constants/styles';
import { OPENAI_KEY } from '@env';

// Type declarations
type GuildEventsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GuildEvents'>;
type GuildEventsRouteProp = RouteProp<RootStackParamList, 'GuildEvents'>;

type GroupedEvents = {
  active: ExtendedGuildEvent[];
  upcoming: ExtendedGuildEvent[];
  completed: ExtendedGuildEvent[];
};

interface ExtendedGuildEvent extends GuildEvent {
  location?: string;
  creator_id: string;
  participants_count: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
}

// Helpers
const groupEventsByStatus = (events: ExtendedGuildEvent[]): GroupedEvents => {
  const active = events.filter(event => event.status === 'active');
  const upcoming = events.filter(event => event.status === 'upcoming');
  const completed = events.filter(event => event.status === 'completed');
  return { active, upcoming, completed };
};

const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ` at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
};

const getEventTypeIcon = (eventType: string) => {
  switch (eventType) {
    case 'challenge':
      return <Icon name="fitness" size={20} color="#fff" />;
    case 'workout':
      return <Icon name="barbell" size={20} color="#fff" />;
    case 'meetup':
      return <Icon name="people" size={20} color="#fff" />;
    case 'competition':
      return <Icon name="trophy" size={20} color="#fff" />;
    case 'raid':
      return <Icon name="flame" size={20} color="#fff" />;
    case 'tournament':
      return <Icon name="medal" size={20} color="#fff" />;
    default:
      return <Icon name="calendar" size={20} color="#fff" />;
  }
};

const getDifficultyInfo = (difficulty: ExtendedGuildEvent['difficulty']) => {
  switch (difficulty) {
    case 'beginner': 
      return { 
        label: 'Beginner', 
        color: FitRealmColors.success,
        icon: <Icon name="leaf" size={14} color="#fff" />
      };
    case 'intermediate': 
      return { 
        label: 'Intermediate', 
        color: FitRealmColors.warning,
        icon: <Icon name="flash" size={14} color="#fff" />
      };
    case 'advanced': 
      return { 
        label: 'Advanced', 
        color: FitRealmColors.error,
        icon: <Icon name="flame" size={14} color="#fff" />
      };
    default: 
      return { 
        label: 'All Levels', 
        color: FitRealmColors.primary,
        icon: <Icon name="people" size={14} color="#fff" />
      };
  }
};

const getWorkoutTypeInfo = (type?: GuildEvent['required_workout_type']) => {
  switch (type) {
    case 'strength': 
      return { 
        icon: <Icon name="barbell" size={16} color={FitRealmColors.textSecondary} />, 
        name: 'Strength' 
      };
    case 'speed': 
      return { 
        icon: <Icon name="speedometer" size={16} color={FitRealmColors.textSecondary} />, 
        name: 'Speed' 
      };
    case 'magic': 
      return { 
        icon: <Icon name="sparkles" size={16} color={FitRealmColors.textSecondary} />, 
        name: 'Magic' 
      };
    case 'willpower': 
      return { 
        icon: <Icon name="brain" size={16} color={FitRealmColors.textSecondary} />, 
        name: 'Willpower' 
      };
    default: 
      return { 
        icon: <Icon name="sync" size={16} color={FitRealmColors.textSecondary} />, 
        name: 'Any' 
      };
  }
};

export default function GuildEventsScreen() {
  const navigation = useNavigation<GuildEventsNavigationProp>();
  const route = useRoute<GuildEventsRouteProp>();
  const { guildId } = route.params || { guildId: undefined };
  const { user } = useAuth();
  const [events, setEvents] = useState<ExtendedGuildEvent[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<GroupedEvents>({ active: [], upcoming: [], completed: [] });
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const [loading, setLoading] = useState<boolean>(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [generatingEvents, setGeneratingEvents] = useState(false);
  const [completingEvent, setCompletingEvent] = useState<string | null>(null);
  const [guildData, setGuildData] = useState<any>(null);

  // Fetch guild details and events
  useEffect(() => {
    const fetchGuildData = async () => {
      try {
        // Fetch guild details
        const { data: guild, error: guildError } = await supabase
          .from('guilds')
          .select('*')
          .eq('id', guildId)
          .single();

        if (guildError) throw guildError;
        setGuildData(guild);

        // Fetch guild events
        const { data: eventsData, error: eventsError } = await supabase
          .from('guild_events')
          .select('*')
          .eq('guild_id', guildId)
          .order('start_date', { ascending: true });

        if (eventsError) throw eventsError;

        const enriched = eventsData.map((e: any) => ({ ...e, participants_count: e.participants_count || 0 }));
        setEvents(enriched);
        setGroupedEvents(groupEventsByStatus(enriched));
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGuildData();
  }, [guildId]);

// This function handles event joining with improved error handling and debugging
const joinEvent = async (eventId: string) => {
  if (!user) {
    Alert.alert('Error', 'You must be logged in to join events');
    return;
  }
  
  setJoining(eventId);
  console.log(`Attempting to join event ${eventId} for user ${user.id}`);
  
  try {
    // Get the current event data first
    const { data: eventData, error: eventFetchError } = await supabase
      .from('guild_events')
      .select('participants_count, status')
      .eq('id', eventId)
      .single();
      
    if (eventFetchError) {
      console.error('Error fetching event:', eventFetchError);
      throw eventFetchError;
    }
    
    // Calculate new participants count
    const currentCount = eventData?.participants_count || 0;
    const newCount = currentCount + 1;
    const currentStatus = eventData?.status;
    
    // Prepare update data - always increase participant count
    const updateData: any = { 
      participants_count: newCount 
    };
    
    // If event is upcoming, change its status to active when someone joins
    if (currentStatus === 'upcoming') {
      updateData.status = 'active';
    }
    
    // Update the event with new participant count and possibly status
    const { error: updateError } = await supabase
      .from('guild_events')
      .update(updateData)
      .eq('id', eventId);
      
    if (updateError) {
      console.error('Error updating event:', updateError);
      throw updateError;
    }

    // Update local state - first find the event
    const eventToUpdate = events.find(ev => ev.id === eventId);
    if (!eventToUpdate) {
      throw new Error('Event not found in local state');
    }
    
    // Update the event with new values
    const updatedEvent = {
      ...eventToUpdate,
      participants_count: newCount,
      // Only change status if it was upcoming
      status: currentStatus === 'upcoming' ? 'active' : eventToUpdate.status
    };
    
    // Replace the event in the events array
    const updatedEvents = events.map(ev => 
      ev.id === eventId ? updatedEvent : ev
    );
    
    // Update state with new events and regroup them
    setEvents(updatedEvents);
    setGroupedEvents(groupEventsByStatus(updatedEvents));

    // Show a success message with appropriate text based on status change
    if (currentStatus === 'upcoming') {
      Alert.alert(
        'Success!', 
        "You've joined the event! It's now active and visible in the Active tab.", 
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Success!', 
        "You've joined the event!", 
        [{ text: 'OK' }]
      );
    }
    
    // Switch to active tab if event status changed
    if (currentStatus === 'upcoming') {
      setActiveTab('active');
    }
  } catch (err: any) {
    console.error('Join event error:', err);
    Alert.alert('Error', `Could not join the event: ${err.message || 'Unknown error'}`);
  } finally {
    setJoining(null);
  }
};

  const completeEvent = async (eventId: string) => {
    if (!user || !guildData) return;
    setCompletingEvent(eventId);
    
    try {
      // Get event details
      const eventToComplete = events.find(e => e.id === eventId);
      if (!eventToComplete) throw new Error('Event not found');
      
      // Update event status to completed
      const { error: updateError } = await supabase
        .from('guild_events')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', eventId);
        
      if (updateError) throw updateError;
      
      // Update guild XP
      const xpGain = eventToComplete.xp_reward || 100;
      const newXp = (guildData.xp || 0) + xpGain;
      
      const { error: guildUpdateError } = await supabase
        .from('guilds')
        .update({ 
          xp: newXp
        })
        .eq('id', guildId);
        
      if (guildUpdateError) throw guildUpdateError;
      
      // Update local state
      setGuildData({...guildData, xp: newXp});
      
      // Update events list
      const updatedEvents = events.map(e => 
        e.id === eventId 
          ? {...e, status: 'completed', completed_at: new Date().toISOString()} 
          : e
      );
      
      setEvents(updatedEvents);
      setGroupedEvents(groupEventsByStatus(updatedEvents));
      
      Alert.alert(
        'Event Completed!', 
        `Guild has earned ${xpGain} XP for completing this event.`,
        [{ text: 'Awesome!', style: 'default' }]
      );
      
    } catch (err) {
      console.error('Complete event error:', err);
      Alert.alert('Error', 'Could not complete the event.');
    } finally {
      setCompletingEvent(null);
    }
  };

  const generateGuildEvents = async () => {
    if (!user || !guildId) return;
    setGeneratingEvents(true);
    
    try {
      // Get guild details for context
      const guildInfo = guildData?.name ? `for a guild called "${guildData.name}"` : "for a fitness guild";
      const guildMotto = guildData?.motto ? ` with the motto "${guildData.motto}"` : "";
      
      // Use OpenAI to generate event ideas
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an event coordinator for a fitness RPG app. Create 3 exciting guild events ${guildInfo}${guildMotto}. Be creative and make the events sound fun and engaging.`
            },
            {
              role: 'user',
              content: `Generate 3 random guild events for our fitness RPG app. Each event should include:
              1. An engaging title
              2. Event type (challenge, workout, meetup, competition, raid, or tournament)
              3. A brief description (20-30 words)
              4. Required workout type (strength, speed, magic, willpower, or any)
              5. Difficulty level (beginner, intermediate, or advanced)
              6. XP reward (between 50-300)
              7. A reward description
              the description should be an actual workout too, such as upper body etc and then the workout itself like pushups
              
              Return JSON array only without explanations or markdown.
              Example format:
              [
                {
                  "title": "Dawn Warrior Challenge",
                  "event_type": "challenge",
                  "description": "Complete a morning workout before 8am for three consecutive days to earn the Dawn Warrior title.",
                  "required_workout_type": "strength",
                  "difficulty": "intermediate",
                  "xp_reward": 150,
                  "reward_description": "Dawn Warrior title + 150 XP"
                }
              ]`
            }
          ],
          temperature: 0.8,
          max_tokens: 500
        })
      });
      
      const data = await response.json();
      if (!data.choices || !data.choices[0]) {
        throw new Error('Invalid response from OpenAI');
      }
      
      // Parse the generated events
      const generatedContent = data.choices[0].message.content;
      const generatedEvents = JSON.parse(generatedContent);
      
      // Add needed fields to each event
      const eventsToInsert = generatedEvents.map((event: any) => ({
        ...event,
        guild_id: guildId,
        creator_id: user.id,
        status: 'upcoming',
        start_date: new Date(Date.now() + Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(), // Random date in next 3 days
        participants_count: 0
      }));
      
      // Insert events into database
      for (const event of eventsToInsert) {
        const { error } = await supabase
          .from('guild_events')
          .insert(event);
          
        if (error) {
          console.error('Error inserting event:', error);
        }
      }
      
      // Refresh events list
      const { data: refreshedEvents, error: refreshError } = await supabase
        .from('guild_events')
        .select('*')
        .eq('guild_id', guildId)
        .order('start_date', { ascending: true });
        
      if (refreshError) throw refreshError;
      
      const enriched = refreshedEvents.map((e: any) => ({ ...e, participants_count: e.participants_count || 0 }));
      setEvents(enriched);
      setGroupedEvents(groupEventsByStatus(enriched));
      
      Alert.alert(
        'Events Generated!', 
        `${eventsToInsert.length} new guild events have been created.`,
        [{ text: 'Let\'s go!', style: 'default' }]
      );
      
    } catch (err) {
      console.error('Generate events error:', err);
      Alert.alert('Error', 'Could not generate new events. Please try again.');
    } finally {
      setGeneratingEvents(false);
    }
  };

  const renderEventItem = ({ item }: { item: ExtendedGuildEvent }) => {
    const { label, color, icon } = getDifficultyInfo(item.difficulty);
    const workout = getWorkoutTypeInfo(item.required_workout_type);
    const dateLabel = item.status === 'active' ? 'Started' : item.status === 'completed' ? 'Ended' : 'Starts';
    const statusColor = item.status === 'completed' 
      ? FitRealmColors.textSecondary 
      : item.status === 'active'
        ? FitRealmColors.success
        : FitRealmColors.primary;

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={[styles.eventIconContainer, { backgroundColor: statusColor }]}>
            {getEventTypeIcon(item.event_type)}
          </View>
          <View style={styles.eventHeaderInfo}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <View style={styles.eventMeta}>
              <View style={[styles.difficultyBadge, { backgroundColor: color }]}>
                {icon}
                <Text style={styles.difficultyText}>{label}</Text>
              </View>
              <Text style={styles.eventType}>{item.event_type.charAt(0).toUpperCase() + item.event_type.slice(1)}</Text>
            </View>
          </View>
          {item.status !== 'completed' && (
            <View style={styles.xpContainer}>
              <Text style={styles.xpText}>+{item.xp_reward}</Text>
              <Text style={styles.xpLabel}>XP</Text>
            </View>
          )}
        </View>

        <Text style={styles.eventDescription}>{item.description}</Text>

        <View style={styles.eventDetailsContainer}>
          {item.location && (
            <View style={styles.eventInfoRow}>
              <Icon name="location" size={16} color={FitRealmColors.textSecondary} />
              <Text style={styles.eventInfo}>{item.location}</Text>
            </View>
          )}
          
          {item.required_workout_type && (
            <View style={styles.eventInfoRow}>
              {workout.icon}
              <Text style={styles.eventInfo}>{workout.name} required</Text>
            </View>
          )}
          
          {item.goal && (
            <View style={styles.eventInfoRow}>
              <Icon name="flag" size={16} color={FitRealmColors.textSecondary} />
              <Text style={styles.eventInfo}>Goal: {item.goal}
                {item.current_progress !== undefined ? ` (${item.current_progress}/${item.goal})` : ''}
              </Text>
            </View>
          )}

          <View style={styles.eventInfoRow}>
            <Icon name="calendar" size={16} color={FitRealmColors.textSecondary} />
            <Text style={styles.eventInfo}>{dateLabel}: {formatEventDate(item.start_date)}</Text>
          </View>
          
          <View style={styles.eventInfoRow}>
            <Icon name="gift" size={16} color={FitRealmColors.textSecondary} />
            <Text style={styles.eventInfo}>Reward: {item.reward_description}</Text>
          </View>
          
          <View style={styles.eventInfoRow}>
            <Icon name="people" size={16} color={FitRealmColors.textSecondary} />
            <Text style={styles.eventInfo}>{item.participants_count} participants</Text>
          </View>
        </View>

        {item.status === 'completed' ? (
          <View style={styles.completedBadgeContainer}>
            <Icon name="checkmark-circle" size={18} color={FitRealmColors.textSecondary} />
            <Text style={styles.completedBadge}>Completed</Text>
          </View>
        ) : item.status === 'active' ? (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.joinButton, joining === item.id && styles.joiningButton, styles.actionButton]}
              onPress={() => joinEvent(item.id)}
              disabled={joining !== null || completingEvent !== null}
            >
              {joining === item.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="log-in" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Join</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.completeButton, completingEvent === item.id && styles.completingButton, styles.actionButton]}
              onPress={() => completeEvent(item.id)}
              disabled={joining !== null || completingEvent !== null}
            >
              {completingEvent === item.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="checkmark-circle" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Complete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.joinButton, joining === item.id && styles.joiningButton]}
            onPress={() => joinEvent(item.id)}
            disabled={joining !== null}
          >
            {joining === item.id ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="log-in" size={18} color="#fff" style={styles.joinButtonIcon} />
                <Text style={styles.joinButtonText}>I'm In</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const tabs: ('active' | 'upcoming' | 'completed')[] = ['active', 'upcoming', 'completed'];

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={FitRealmColors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Guild Events</Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Generate Events Button */}
      <TouchableOpacity
        style={[styles.generateButton, generatingEvents && styles.generatingButton]}
        onPress={generateGuildEvents}
        disabled={generatingEvents}
      >
        {generatingEvents ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Icon name="add-circle" size={20} color="#fff" style={styles.generateButtonIcon} />
            <Text style={styles.generateButtonText}>Generate New Events</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.tabRow}>
        {tabs.map(tab => (
          <TouchableOpacity 
            key={tab} 
            onPress={() => setActiveTab(tab)} 
            style={[
              styles.tabButton, 
              activeTab === tab && styles.activeTabButton
            ]}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === tab && styles.activeTabText
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={FitRealmColors.primary} />
        </View>
      ) : (
        <FlatList
          data={groupedEvents[activeTab]}
          keyExtractor={item => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="calendar-outline" size={60} color={FitRealmColors.textTertiary} />
              <Text style={styles.emptyText}>No {activeTab} events found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FitRealmColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: FitRealmColors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: FitRealmColors.white,
  },
  backButton: {
    padding: 4,
  },
  headerRight: {
    width: 24, // Balance the header
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FitRealmColors.success,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  generatingButton: {
    backgroundColor: FitRealmColors.textSecondary,
  },
  generateButtonIcon: {
    marginRight: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: FitRealmColors.white,
  },
  tabRow: { 
    flexDirection: 'row',
    backgroundColor: FitRealmColors.cardBackground,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tabButton: { 
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTabButton: { 
    backgroundColor: FitRealmColors.primary 
  },
  tabText: { 
    fontSize: 14,
    fontWeight: '500',
    color: FitRealmColors.textSecondary 
  },
  activeTabText: { 
    color: FitRealmColors.white,
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  eventCard: { 
    backgroundColor: FitRealmColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: { 
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventIconContainer: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventHeaderInfo: { 
    flex: 1,
  },
  eventTitle: { 
    fontSize: 18,
    fontWeight: '700',
    color: FitRealmColors.textPrimary,
    marginBottom: 4,
  },
  eventMeta: { 
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  difficultyText: { 
    color: FitRealmColors.white,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  eventType: { 
    color: FitRealmColors.textSecondary,
    fontSize: 13,
  },
  xpContainer: {
    alignItems: 'center',
    backgroundColor: FitRealmColors.xpBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpText: { 
    color: FitRealmColors.xpText,
    fontWeight: 'bold',
    fontSize: 14,
  },
  xpLabel: {
    color: FitRealmColors.xpText,
    fontSize: 10,
    fontWeight: '500',
  },
  eventDescription: { 
    marginBottom: 16,
    color: FitRealmColors.textPrimary,
    lineHeight: 20,
  },
  eventDetailsContainer: {
    backgroundColor: FitRealmColors.backgroundLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventInfo: { 
    fontSize: 14,
    marginLeft: 8,
    color: FitRealmColors.textSecondary,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  joinButton: { 
    backgroundColor: FitRealmColors.primary,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  completeButton: {
    backgroundColor: FitRealmColors.success,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  joiningButton: { 
    backgroundColor: FitRealmColors.textSecondary,
  },
  completingButton: {
    backgroundColor: FitRealmColors.textSecondary,
  },
  joinButtonIcon: {
    marginRight: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  joinButtonText: { 
    color: FitRealmColors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonText: {
    color: FitRealmColors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  completedBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  completedBadge: { 
    color: FitRealmColors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  emptyText: { 
    textAlign: 'center',
    marginTop: 16,
    color: FitRealmColors.textSecondary,
    fontSize: 16,
  },
});