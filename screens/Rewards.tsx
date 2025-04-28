import React from 'react';
import { useAuth } from '../app/AuthProvider';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const MOCK_REWARDS = [
  {
    id: '1',
    title: 'Strength Mastery',
    description: 'Awarded for completing 3 strength-based workouts.',
  },
  {
    id: '2',
    title: 'Cardio Champion',
    description: 'Awarded for completing 5 cardio sessions.',
  },
  {
    id: '3',
    title: 'Yoga Guru',
    description: 'Awarded for completing 2 yoga sessions.',
  },
];

export default function RewardsScreen() {
  const { rewards } = useAuth();

  const earnedRewardIds = rewards.map(reward => reward.id);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🏆 Rewards</Text>
      <Text style={styles.subtitle}>Here’s your progress on all available rewards!</Text>

      {MOCK_REWARDS.map((reward) => {
        const earned = earnedRewardIds.includes(reward.id);
        return (
          <View 
            key={reward.id} 
            style={[
              styles.rewardCard, 
              earned ? styles.earned : styles.notEarned
            ]}
          >
            <View style={styles.rewardContent}>
              <Text style={styles.rewardTitle}>{reward.title}</Text>
              <Text style={styles.rewardDescription}>{reward.description}</Text>
              <View style={earned ? styles.completedBadge : styles.notEarnedBadge}>
                <Text style={earned ? styles.completedText : styles.notEarnedText}>
                  {earned ? 'Earned' : 'Not Earned'}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8f8f2',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#bbb',
    textAlign: 'center',
    marginBottom: 24,
  },
  rewardCard: {
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  rewardContent: {
    padding: 16,
    flex: 1,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#ddd',
    marginBottom: 8,
    lineHeight: 20,
  },
  noRewardsText: {
    fontSize: 16,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 20,
  },
  earned: {
    borderLeftWidth: 8,
    borderLeftColor: '#2a9d8f',
  },
  notEarned: {
    borderLeftWidth: 8,
    borderLeftColor: '#e63946',
  },
  completedBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(42, 157, 143, 0.2)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  completedText: {
    color: '#2a9d8f',
    fontWeight: 'bold',
  },
  notEarnedBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(230, 57, 70, 0.2)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  notEarnedText: {
    color: '#e63946',
    fontWeight: 'bold',
  },
});