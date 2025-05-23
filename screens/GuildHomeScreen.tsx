import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Image,
  RefreshControl,
  Animated
} from 'react-native';
import { useAuth } from '../app/AuthProvider';
import { supabase } from '../app/supabase';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { BottomTabParamList, RootStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Guild, GuildMember } from '../types/guildTypes';

type GuildScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Guild'> & 
  NativeStackNavigationProp<RootStackParamList>;

export default function GuildHomeScreen() {
  const navigation = useNavigation<GuildScreenNavigationProp>();
  const { user, loading: authLoading } = useAuth();
  const [userGuild, setUserGuild] = useState<Guild | null>(null);
  const [userGuildMember, setUserGuildMember] = useState<GuildMember | null>(null);
  const [guildMembers, setGuildMembers] = useState<GuildMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [guildLeader, setGuildLeader] = useState<GuildMember | null>(null);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Start animations when component mounts
  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    // Slide up animation
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    // Pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const fetchUserGuild = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log("Fetching guild data for user:", user.id);
      
      // Step 1: Fetch user's guild membership and related guild
      const { data: guildMemberData, error: memberError } = await supabase
        .from('guild_members')
        .select('*, guilds(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Error fetching guild membership:", memberError);
        throw memberError;
      }
      
      if (!guildMemberData) {
        console.log("No guild membership found for user");
        setLoading(false);
        return;
      }

      const guild = guildMemberData.guilds;
      console.log("Guild found:", guild.name);
      
      const guildMember = {
        ...guildMemberData,
        character_name: guildMemberData.character_name,
        character_level: guildMemberData.character_level,
        contribution_points: guildMemberData.contribution_points,
        role: guildMemberData.role,
      };

      // Step 2: Fetch all members of the user's guild with detailed info
      const { data: allMembers, error: membersError } = await supabase
        .from('guild_members')
        .select('*, characters:user_id(name, level)')
        .eq('guild_id', guild.id)
        .order('contribution_points', { ascending: false });

        console.log("All members fetched:", allMembers);
      if (membersError) {
        console.error("Error fetching guild members:", membersError);
        throw membersError;
      }
      
      if (!allMembers) {
        console.error("No members returned for guild");
        throw new Error("No members found");
      }

      console.log("All members with same guild_id:", allMembers.map(m => ({
        id: m.user_id,
        name: m.character_name,
        guild: m.guild_id
      })));
      
      console.log(`Retrieved ${allMembers.length} guild members`);
      
      // Process members to ensure all required fields
      const processedMembers = allMembers.map(member => {
        // Get character info if available
        const characterName = member.character_name || 
          (member.characters ? member.characters.name : "Unknown");
        const characterLevel = member.character_level || 
          (member.characters ? member.characters.level : 1);
        
        return {
          ...member,
          character_name: characterName,
          character_level: characterLevel,
          contribution_points: member.contribution_points || 0
        };
      });
      
      // Identify the guild leader
      const leader = processedMembers.find(member => member.role === 'leader');
      if (leader) {
        setGuildLeader(leader);
      }

      setUserGuild(guild);
      setUserGuildMember(guildMember);
      setGuildMembers(processedMembers);
    } catch (error) {
      console.error("Error fetching guild from Supabase:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchUserGuild();
    }
  }, [user, authLoading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserGuild();
  }, []);

  // Safe navigation handler
  const navigateToScreen = (screenName, params = {}) => {
    try {
      if (navigation) {
        navigation.navigate(screenName, params);
      }
    } catch (error) {
      console.error(`Navigation error to ${screenName}:`, error);
    }
  };

  // Calculate guild level progress
  const calculateXPProgress = () => {
    if (!userGuild) return 0;
    const levelRequirement = userGuild.level * 1000;
    const xpInCurrentLevel = userGuild.xp % 1000;
    return Math.min((xpInCurrentLevel / 1000) * 100, 100);
  };

  // Render a member row with special styling for leaders
  const renderMemberRow = (member, index) => {
    const isLeader = member.role === 'leader';
    const isOfficer = member.role === 'officer';
    
    return (
      <View 
        key={`member-${index}`} 
        style={[
          styles.memberRow,
          isLeader && styles.leaderRow
        ]}
      >
        <View style={[
          styles.memberIcon,
          isLeader && styles.leaderIcon,
          isOfficer && styles.officerIcon
        ]}>
          <Text style={styles.memberIconText}>
            {member?.character_name?.charAt(0)?.toUpperCase() ?? "?"}
          </Text>
          {isLeader && (
            <View style={styles.crownBadge}>
              <Text style={styles.crownIcon}>👑</Text>
            </View>
          )}
        </View>
        <View style={styles.memberInfo}>
          <Text style={[
            styles.memberName,
            isLeader && styles.leaderName
          ]}>
            {member.character_name}
            {isLeader && " (Leader)"}
            {isOfficer && " (Officer)"}
          </Text>
          <Text style={styles.memberRole}>
            Level {member.character_level ?? "?"}
          </Text>
        </View>
        <View style={styles.contributionContainer}>
          <Text style={styles.memberContribution}>{member.contribution_points ?? 0}</Text>
          <Text style={styles.contributionLabel}>points</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4e60d3" />
        <Text style={styles.loadingText}>Loading guild data...</Text>
      </View>
    );
  }

  if (!userGuild) {
    return (
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Animated.Text 
            style={[
              styles.title, 
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            ⚔️ Guilds
          </Animated.Text>
          <Animated.Text 
            style={[
              styles.subtitle, 
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            Join forces with other adventurers!
          </Animated.Text>
        </View>
        
        <Animated.View 
          style={[
            styles.noGuildContainer, 
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Image 
            source={{ uri: 'https://placeholder.pics/svg/200/8A2BE2/FFFFFF-FFFFFF/Guild%20Icon' }} 
            style={styles.placeholderImage}
          />
          <Text style={styles.noGuildText}>You haven't joined a guild yet</Text>
          <Text style={styles.noGuildSubtext}>
            Join a guild to train together, participate in group challenges, and earn exclusive rewards!
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#4e60d3' }]}
              onPress={() => navigateToScreen('JoinGuild')}
            >
              <Text style={styles.buttonText}>Join a Guild</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#2a9d8f' }]}
              onPress={() => navigateToScreen('CreateGuild')}
            >
              <Text style={styles.buttonText}>Create a Guild</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Guild Banner with gradient background */}
      <View style={[styles.guildBanner, { backgroundColor: '#302b63' }]}>
        <Animated.Text 
          style={[
            styles.guildEmblem, 
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          {userGuild.emblem || '⚔️'}
        </Animated.Text>
        <View style={styles.guildTitleContainer}>
          <Text style={styles.guildName}>{userGuild.name}</Text>
          <Text style={styles.guildMotto}>"{userGuild.motto || 'No motto set'}"</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#4e60d3']}
            tintColor={'#4e60d3'}
          />
        }
      >
        {/* Guild Level & XP */}
        <Animated.View 
          style={[
            styles.card, 
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.levelContainer}>
            <Animated.View 
              style={[
                styles.levelBadge, 
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Text style={styles.levelText}>{userGuild.level}</Text>
            </Animated.View>
            <View style={styles.xpContainer}>
              <Text style={styles.guildLevelText}>Guild Level {userGuild.level}</Text>
              <Text style={styles.xpText}>{userGuild.xp} / {userGuild.level * 1000} XP</Text>
              <View style={styles.xpBar}>
                <Animated.View 
                  style={[
                    styles.xpProgress, 
                    { width: `${calculateXPProgress()}%` }
                  ]} 
                />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Quick Action Buttons */}
        <Animated.View 
          style={[
            styles.quickActions, 
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateToScreen('GuildChat', { guildId: userGuild.id })}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateToScreen('GuildEvents', { guildId: userGuild.id })}
          >
            <Text style={styles.actionIcon}>🎯</Text>
            <Text style={styles.actionText}>Events</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateToScreen('GuildDetails', { guildId: userGuild.id })}
          >
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionText}>Members</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Guild Description */}
        <Animated.View 
          style={[
            styles.card, 
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.description}>{userGuild.description || 'No description available.'}</Text>
        </Animated.View>

        {/* Member List Preview */}
        <Animated.View 
          style={[
            styles.card, 
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Members</Text>
            <TouchableOpacity onPress={() => navigateToScreen('GuildDetails', { guildId: userGuild.id })}>
              <Text style={styles.seeAllText}>See All ({guildMembers.length})</Text>
            </TouchableOpacity>
          </View>
          
          {/* Always show leader first if available */}
          {guildLeader && renderMemberRow(guildLeader, 'leader')}
          
          {/* Show other top members (skipping leader if already shown) */}
          {guildMembers
            .filter(member => member.role !== 'leader')
            .slice(0, guildLeader ? 2 : 3)
            .map((member, index) => renderMemberRow(member, index))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e2e',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  headerSection: {
    padding: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8f8f2',
    textAlign: 'center',
  },
  subtitle: {
    color: '#bbb',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  noGuildContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    marginBottom: 24,
    opacity: 0.7,
  },
  noGuildText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8f8f2',
    marginBottom: 12,
  },
  noGuildSubtext: {
    fontSize: 16,
    color: '#bbb',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  guildBanner: {
    height: 160,
    padding: 16,
    justifyContent: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#4e60d355',
  },
  guildEmblem: {
    fontSize: 40,
    marginRight: 16,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  guildTitleContainer: {
    flex: 1,
  },
  guildName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  guildMotto: {
    fontSize: 14,
    color: '#ddd',
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4e60d3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#4e60d3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  levelText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  xpContainer: {
    flex: 1,
  },
  guildLevelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  xpText: {
    color: '#bbb',
    fontSize: 14,
    marginBottom: 8,
  },
  xpBar: {
    height: 8,
    backgroundColor: '#444',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpProgress: {
    height: '100%',
    backgroundColor: '#4e60d3',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  description: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    color: '#4e60d3',
    fontSize: 14,
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a50',
  },
  leaderRow: {
    backgroundColor: 'rgba(78, 96, 211, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: -8,
    borderLeftWidth: 3,
    borderLeftColor: '#ffd700',
  },
  memberIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4e60d3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderIcon: {
    backgroundColor: '#ffd700',
  },
  officerIcon: {
    backgroundColor: '#4e92d3',
  },
  memberIconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  crownBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#1e1e2e',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crownIcon: {
    fontSize: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  leaderName: {
    color: '#ffd700',
  },
  memberRole: {
    color: '#bbb',
    fontSize: 12,
  },
  contributionContainer: {
    alignItems: 'center',
  },
  memberContribution: {
    color: '#ffd700',
    fontWeight: 'bold',
    fontSize: 16,
  },
  contributionLabel: {
    color: '#bbb',
    fontSize: 10,
  },
});

// import React, { useState, useEffect } from 'react';
// import { 
//   View, 
//   Text, 
//   StyleSheet, 
//   TouchableOpacity, 
//   ScrollView, 
//   ActivityIndicator, 
//   ImageBackground,
//   Image
// } from 'react-native';
// import { useAuth } from '../app/AuthProvider';
// import { supabase } from '../app/supabase';
// import { useNavigation } from '@react-navigation/native';
// import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
// import { BottomTabParamList, RootStackParamList } from '../types/navigation';
// import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import { Guild, GuildMember } from '../types/guildTypes';
// import { LinearGradient } from 'expo-linear-gradient';

// type GuildScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Guild'> & 
//   NativeStackNavigationProp<RootStackParamList>;

// // Mock data for initial development
// const MOCK_GUILD: Guild = {
//   id: '1',
//   name: 'Iron Warriors',
//   description: 'A guild dedicated to strength and endurance training.',
//   banner_url: '',
//   emblem: '⚔️',
//   motto: 'Strength in Unity',
//   leader_id: '123',
//   member_count: 12,
//   level: 5,
//   xp: 2500,
//   created_at: new Date().toISOString(),
// };

// const MOCK_MEMBERS: GuildMember[] = [
//   {
//     id: '1',
//     guild_id: '1',
//     user_id: '123',
//     role: 'leader',
//     joined_at: new Date().toISOString(),
//     contribution_points: 1250,
//     character_name: 'IronMaster',
//     character_level: 15,
//   },
//   {
//     id: '2',
//     guild_id: '1',
//     user_id: '456',
//     role: 'officer',
//     joined_at: new Date().toISOString(),
//     contribution_points: 980,
//     character_name: 'SpeedRunner',
//     character_level: 12,
//   },
//   {
//     id: '3',
//     guild_id: '1',
//     user_id: '789',
//     role: 'member',
//     joined_at: new Date().toISOString(),
//     contribution_points: 540,
//     character_name: 'FlexMage',
//     character_level: 8,
//   },
// ];

// export default function GuildHomeScreen() {
//   const navigation = useNavigation<GuildScreenNavigationProp>();
//   const { user, loading: authLoading } = useAuth();
//   const [userGuild, setUserGuild] = useState<Guild | null>(null);
//   const [userGuildMember, setUserGuildMember] = useState<GuildMember | null>(null);
//   const [guildMembers, setGuildMembers] = useState<GuildMember[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchUserGuild = async () => {
//       if (!user) return;
  
//       try {
//         // Step 1: Fetch user's guild membership and related guild
//         const { data: guildMemberData, error: memberError } = await supabase
//           .from('guild_members')
//           .select('*, guilds(*)')
//           .eq('user_id', user.id)
//           .maybeSingle();
  
//         if (memberError) throw memberError;
//         if (!guildMemberData) return;
  
//         const guild = guildMemberData.guilds;
//         const guildMember = {
//           ...guildMemberData,
//           character_name: guildMemberData.character_name,
//           character_level: guildMemberData.character_level,
//           contribution_points: guildMemberData.contribution_points,
//           role: guildMemberData.role,
//         };
  
//         // Step 2: Fetch all members of the user's guild
//         const { data: allMembers, error: membersError } = await supabase
//           .from('guild_members')
//           .select('*')
//           .eq('guild_id', guild.id);
  
//         if (membersError) throw membersError;
  
//         setUserGuild(guild);
//         setUserGuildMember(guildMember);
//         setGuildMembers(allMembers || []);
//       } catch (error) {
//         console.error("Error fetching guild from Supabase:", error);
//       } finally {
//         setLoading(false);
//       }
//     };
  
//     if (!authLoading) {
//       fetchUserGuild();
//     }
//   }, [user, authLoading]);
  

//   if (loading) {
//     return (
//       <View style={[styles.container, styles.centered]}>
//         <ActivityIndicator size="large" color="#4e60d3" />
//         <Text style={styles.loadingText}>Loading guild data...</Text>
//       </View>
//     );
//   }

//   if (!userGuild) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.headerSection}>
//           <Text style={styles.title}>⚔️ Guilds</Text>
//           <Text style={styles.subtitle}>Join forces with other adventurers!</Text>
//         </View>
        
//         <View style={styles.noGuildContainer}>
//           <Image 
//             source={{ uri: 'https://placeholder.pics/svg/200/8A2BE2/FFFFFF-FFFFFF/Guild%20Icon' }} 
//             style={styles.placeholderImage}
//           />
//           <Text style={styles.noGuildText}>You haven't joined a guild yet</Text>
//           <Text style={styles.noGuildSubtext}>
//             Join a guild to train together, participate in group challenges, and earn exclusive rewards!
//           </Text>
          
//           <View style={styles.buttonContainer}>
//             <TouchableOpacity 
//               style={[styles.button, { backgroundColor: '#4e60d3' }]}
//               onPress={() => navigation.navigate('JoinGuild')}
//             >
//               <Text style={styles.buttonText}>Join a Guild</Text>
//             </TouchableOpacity>
            
//             <TouchableOpacity 
//               style={[styles.button, { backgroundColor: '#2a9d8f' }]}
//               onPress={() => navigation.navigate('CreateGuild')}
//             >
//               <Text style={styles.buttonText}>Create a Guild</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {/* Guild Banner */}
//       <LinearGradient 
//         colors={['#302b63', '#24243e']} 
//         style={styles.guildBanner}
//       >
//         <Text style={styles.guildEmblem}>{userGuild.emblem || '⚔️'}</Text>
//         <View style={styles.guildTitleContainer}>
//           <Text style={styles.guildName}>{userGuild.name}</Text>
//           <Text style={styles.guildMotto}>"{userGuild.motto}"</Text>
//         </View>
//       </LinearGradient>

//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         {/* Guild Level & XP */}
//         <View style={styles.card}>
//           <View style={styles.levelContainer}>
//             <View style={styles.levelBadge}>
//               <Text style={styles.levelText}>{userGuild.level}</Text>
//             </View>
//             <View style={styles.xpContainer}>
//               <Text style={styles.guildLevelText}>Guild Level {userGuild.level}</Text>
//               <Text style={styles.xpText}>{userGuild.xp} / {userGuild.level * 1000} XP</Text>
//               <View style={styles.xpBar}>
//                 <View 
//                   style={[
//                     styles.xpProgress, 
//                     { width: `${Math.min((userGuild.xp % 1000) / 10, 100)}%` }
//                   ]} 
//                 />
//               </View>
//             </View>
//           </View>
//         </View>

//         {/* Quick Action Buttons */}
//         <View style={styles.quickActions}>
//           <TouchableOpacity 
//             style={styles.actionButton}
//             onPress={() => navigation.navigate('GuildChat', { guildId: userGuild.id })}
//           >
//             <Text style={styles.actionIcon}>💬</Text>
//             <Text style={styles.actionText}>Chat</Text>
//           </TouchableOpacity>
          
//           <TouchableOpacity 
//             style={styles.actionButton}
//             onPress={() => navigation.navigate('GuildEvents', { guildId: userGuild.id })}
//           >
//             <Text style={styles.actionIcon}>🎯</Text>
//             <Text style={styles.actionText}>Events</Text>
//           </TouchableOpacity>
          
//           <TouchableOpacity 
//             style={styles.actionButton}
//             onPress={() => navigation.navigate('GuildDetails', { guildId: userGuild.id })}
//           >
//             <Text style={styles.actionIcon}>👥</Text>
//             <Text style={styles.actionText}>Members</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Guild Description */}
//         <View style={styles.card}>
//           <Text style={styles.cardTitle}>About</Text>
//           <Text style={styles.description}>{userGuild.description}</Text>
//         </View>

//         {/* Member List Preview */}
//         <View style={styles.card}>
//           <View style={styles.cardHeader}>
//             <Text style={styles.cardTitle}>Members</Text>
//             <TouchableOpacity onPress={() => navigation.navigate('GuildDetails', { guildId: userGuild.id })}>
//               <Text style={styles.seeAllText}>See All ({userGuild.member_count})</Text>
//             </TouchableOpacity>
//           </View>
          
//           {guildMembers.slice(0, 3).map((member, index) => (
//             <View key={member.id ?? `fallback-key-${index}`} style={styles.memberRow}>
//               <View style={styles.memberIcon}>
//                 <Text style={styles.memberIconText}>
//                   {member?.character_name?.charAt(0)?.toUpperCase() ?? "?"}
//                 </Text>
//               </View>
//               <View style={styles.memberInfo}>
//                 <Text style={styles.memberName}>{member.character_name}</Text>
//                 <Text style={styles.memberRole}>
//                   {member.role?.charAt(0)?.toUpperCase() + member.role?.slice(1) ?? "Unknown"} • Level {member.character_level ?? "?"}
//                 </Text>
//               </View>
//               <Text style={styles.memberContribution}>{member.contribution_points ?? 0} pts</Text>
//             </View>
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#1e1e2e',
//   },
//   centered: {
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     color: '#fff',
//     marginTop: 12,
//     fontSize: 16,
//   },
//   headerSection: {
//     padding: 16,
//     paddingTop: 24,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#f8f8f2',
//     textAlign: 'center',
//   },
//   subtitle: {
//     color: '#bbb',
//     fontSize: 16,
//     textAlign: 'center',
//     marginTop: 8,
//   },
//   noGuildContainer: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: 32,
//   },
//   placeholderImage: {
//     width: 120,
//     height: 120,
//     marginBottom: 24,
//     opacity: 0.7,
//   },
//   noGuildText: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: '#f8f8f2',
//     marginBottom: 12,
//   },
//   noGuildSubtext: {
//     fontSize: 16,
//     color: '#bbb',
//     textAlign: 'center',
//     marginBottom: 32,
//     lineHeight: 22,
//   },
//   buttonContainer: {
//     width: '100%',
//     gap: 12,
//   },
//   button: {
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//   },
//   buttonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
//   scrollContent: {
//     padding: 16,
//     paddingBottom: 32,
//   },
//   guildBanner: {
//     height: 160,
//     padding: 16,
//     justifyContent: 'flex-end',
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   guildEmblem: {
//     fontSize: 40,
//     marginRight: 16,
//   },
//   guildTitleContainer: {
//     flex: 1,
//   },
//   guildName: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   guildMotto: {
//     fontSize: 14,
//     color: '#ddd',
//     fontStyle: 'italic',
//   },
//   card: {
//     backgroundColor: '#2a2a40',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16,
//   },
//   levelContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   levelBadge: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     backgroundColor: '#4e60d3',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 16,
//   },
//   levelText: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   xpContainer: {
//     flex: 1,
//   },
//   guildLevelText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   xpText: {
//     color: '#bbb',
//     fontSize: 14,
//     marginBottom: 8,
//   },
//   xpBar: {
//     height: 8,
//     backgroundColor: '#444',
//     borderRadius: 4,
//     overflow: 'hidden',
//   },
//   xpProgress: {
//     height: '100%',
//     backgroundColor: '#4e60d3',
//   },
//   quickActions: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 16,
//   },
//   actionButton: {
//     flex: 1,
//     backgroundColor: '#2a2a40',
//     borderRadius: 12,
//     padding: 12,
//     alignItems: 'center',
//     marginHorizontal: 6,
//     marginLeft: 0,
//     marginRight: 0,
//   },
//   actionIcon: {
//     fontSize: 24,
//     marginBottom: 6,
//   },
//   actionText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   cardTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 12,
//   },
//   description: {
//     color: '#ddd',
//     fontSize: 14,
//     lineHeight: 20,
//   },
//   cardHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   seeAllText: {
//     color: '#4e60d3',
//     fontSize: 14,
//   },
//   memberRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12,
//     paddingBottom: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#3a3a50',
//   },
//   memberIcon: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#4e60d3',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   memberIconText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   memberInfo: {
//     flex: 1,
//   },
//   memberName: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   memberRole: {
//     color: '#bbb',
//     fontSize: 12,
//   },
//   memberContribution: {
//     color: '#ffd700',
//     fontWeight: 'bold',
//   },
// });