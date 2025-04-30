import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../app/supabase';
import { useAuth } from '../app/AuthProvider';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabParamList, RootStackParamList } from '../types/navigation';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { GuildMessage } from '../types/guildTypes';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

type BottomTabNavigationPropType = BottomTabNavigationProp<BottomTabParamList, 'Guild'>;





type GuildChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GuildChat'>;

export default function GuildChatScreen() {
  const navigation = useNavigation<GuildChatNavigationProp>();
  const navigation2 = useNavigation<BottomTabNavigationPropType>();
  const { user } = useAuth();
  const route = useRoute();
  const { guildId, guildName } = route.params as { guildId: string; guildName: string };
  const [messages, setMessages] = useState<GuildMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentCharacterName, setCurrentCharacterName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Set header title with guild name
  useEffect(() => {
    navigation.setOptions({
      title: guildName || 'Guild Chat',
      headerLeft: () => (
        <TouchableOpacity
          style={{ marginLeft: 20 }}
          onPress={() => navigation2.navigate('Guild')} // Navigate directly to Guild screen
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity 
            style={{ marginRight: 20 }}
            onPress={() => navigation.navigate('GuildDetails', { guildId })}
          >
            <Icon name="information-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('GuildEvents', { guildId })}
          >
            <Icon name="calendar-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, guildId, guildName]);

  // Fetch current user's character name when component mounts
  useEffect(() => {
    if (user) {
      const fetchCurrentCharacterName = async () => {
        const { data, error } = await supabase
          .from('characters')
          .select('name')
          .eq('user_id', user.id)
          .single();
        
        if (!error && data) {
          setCurrentCharacterName(data.name);
        } else {
          console.error('Error fetching current character name:', error);
          setCurrentCharacterName('Me');
        }
      };
      
      fetchCurrentCharacterName();
    }
  }, [user]);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      
      // Fetch messages from guild_chat and join with characters table using user_id
      const { data, error } = await supabase
        .from('guild_messages')
        .select(`
          *,
          characters(name)
        `)
        .eq('guild_id', guildId)
        .order('created_at', { ascending: true });
  
      if (!error) {
        const formattedMessages = data?.map(msg => ({
          id: msg.id,
          guild_id: msg.guild_id,
          user_id: msg.user_id,
          character_name: msg.characters?.name || 'Unknown',
          content: msg.content,
          created_at: msg.sent_at || msg.created_at,
        })) || [];
        
        setMessages(formattedMessages);
      } else {
        console.error('Error fetching messages:', error);
      }
      setLoading(false);
    };
  
    fetchMessages();
  
    // Set up real-time subscription
    const subscription = supabase
      .channel('guild_messages_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'guild_messages',
        filter: `guild_id=eq.${guildId}`
      }, (payload) => {
        // Add new message to the chat
        const newMsg = payload.new;
        setMessages(prevMessages => [...prevMessages, {
          id: newMsg.id,
          guild_id: newMsg.guild_id,
          user_id: newMsg.user_id,
          character_name: newMsg.character_name || 'Member',
          content: newMsg.content,
          created_at: newMsg.sent_at || newMsg.created_at
        }]);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd();
        }, 100);
      })
      .subscribe();
  
    // Cleanup subscription
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [guildId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
  
    try {
      // Fetch the user's character details from the 'characters' table
      const { data: characterData, error: characterError } = await supabase
        .from('characters')
        .select('name')
        .eq('user_id', user.id)
        .single();
  
      if (characterError) {
        console.error('Error fetching character data:', characterError);
        return;
      }
  
      const characterName = characterData?.name || 'Unknown';
  
      const messageData = {
        guild_id: guildId,
        user_id: user.id,
        content: newMessage,
        character_name: characterName,
        created_at: new Date().toISOString(),
      };
  
      console.log('Message data being inserted:', messageData);
  
      // Insert the message into the 'guild_chat' table
      const { data, error } = await supabase.from('guild_messages').insert(messageData);
  
      // Log the result to debug the response
      if (error) {
        console.error('Error inserting message:', error.message || error.details);
      }
  
      if (data) {
        console.log('Message sent:', data);
      } else {
        console.log('Insert failed, no data returned');
      }
  
      // Clear the input field after sending
      setNewMessage('');
    } catch (error) {
      console.error('Unexpected error sending message:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e60d3" />
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <View style={[styles.messageBubble, item.user_id === user?.id ? styles.mine : styles.theirs]}>
                <Text style={styles.messageSender}>
                  {item.user_id === user?.id ? currentCharacterName || 'Me' : item.character_name}
                </Text>
                <Text style={styles.messageText}>{item.content}</Text>
                <Text style={styles.messageTime}>{formatTimestamp(item.created_at)}</Text>
              </View>
            )}
          />
          <View style={styles.inputContainer}>
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor="#aaa"
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
              <Icon name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#1e1e2e'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  messageList: {
    padding: 10,
    paddingBottom: 20
  },
  messageBubble: {
    padding: 10,
    marginVertical: 6,
    borderRadius: 12,
    maxWidth: '75%',
    position: 'relative'
  },
  mine: {
    backgroundColor: '#4e60d3',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirs: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageSender: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
  },
  messageTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4
  },
  inputContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#444',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a40',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4e60d3',
    borderRadius: 20,
    marginLeft: 8,
  },
});