import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../app/AuthProvider';
import { supabase } from '../app/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Guild } from '../types/guildTypes';
import { Ionicons } from '@expo/vector-icons';

type JoinGuildNavigationProp = NativeStackNavigationProp<RootStackParamList, 'JoinGuild'>;

export default function JoinGuildScreen() {
  const navigation = useNavigation<JoinGuildNavigationProp>();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [filteredGuilds, setFilteredGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const { data, error } = await supabase
          .from('guilds')
          .select('*')
          .order('member_count', { ascending: false });
  
        if (error) {
          console.error("Supabase error fetching guilds:", error.message);
          return;
        }
  
        if (data) {
          setGuilds(data);
          setFilteredGuilds(data);
        }
      } catch (error) {
        console.error("Unexpected error fetching guilds:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchGuilds();
  }, []);
  

  useEffect(() => {
    if (searchQuery) {
      const filtered = guilds.filter(guild => 
        guild.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guild.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredGuilds(filtered);
    } else {
      setFilteredGuilds(guilds);
    }
  }, [searchQuery, guilds]);

  const joinGuild = async (guildId: string) => {
    if (!user) return;
  
    setJoining(guildId);
  
    try {
      const { data, error } = await supabase
        .from('guild_members')
        .insert([
          {
            guild_id: guildId,
            user_id: user.id,
            role: 'member',
            joined_at: new Date().toISOString(),
            contribution_points: 0,
          },
        ]);
  
      if (error) {
        console.error("Supabase error:", error);
        return;
      }
  
      // Navigate to Guild tab
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main', params: { screen: 'Guilds' } }],
      });
    } catch (err) {
      console.error("Unexpected error joining guild:", err);
    } finally {
      setJoining(null);
    }
  };
  

  const renderGuildItem = ({ item }: { item: Guild }) => (
    <View style={styles.guildCard}>
      <View style={styles.guildHeader}>
        <View style={styles.emblemContainer}>
          <Text style={styles.emblem}>{item.emblem}</Text>
        </View>
        <View style={styles.guildInfo}>
          <Text style={styles.guildName}>{item.name}</Text>
          <Text style={styles.guildMotto}>"{item.motto}"</Text>
        </View>
        <View style={styles.statsContainer}>
          <Text style={styles.guildLevel}>Lvl {item.level}</Text>
        </View>
      </View>
      
      <Text style={styles.guildDescription}>{item.description}</Text>
      
      <View style={styles.guildFooter}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberCount}>👥 {item.member_count} members</Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.joinButton, 
            joining === item.id && styles.joiningButton
          ]}
          onPress={() => joinGuild(item.id)}
          disabled={joining !== null}
        >
          {joining === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.joinButtonText}>Join Guild</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join a Guild</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search guilds..."
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e60d3" />
          <Text style={styles.loadingText}>Loading guilds...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredGuilds}
          renderItem={renderGuildItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No guilds found matching your search
              </Text>
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
    backgroundColor: '#1e1e2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8f8f2',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
  searchInput: {
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  guildCard: {
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  guildHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  emblemContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4e60d3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emblem: {
    fontSize: 24,
  },
  guildInfo: {
    flex: 1,
  },
  guildName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  guildMotto: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#bbb',
  },
  statsContainer: {
    justifyContent: 'center',
  },
  guildLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  guildDescription: {
    color: '#ddd',
    marginBottom: 16,
    lineHeight: 20,
  },
  guildFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCount: {
    color: '#bbb',
  },
  joinButton: {
    backgroundColor: '#4e60d3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  joiningButton: {
    backgroundColor: '#666',
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#bbb',
    textAlign: 'center',
    fontSize: 16,
  },
});