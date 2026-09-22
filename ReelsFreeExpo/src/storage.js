import AsyncStorage from '@react-native-async-storage/async-storage';

// Petit wrapper tolerant : une lecture qui echoue ne doit jamais bloquer l app.
export const Store = {
  async get(key, fallback = null) {
    try {
      const v = await AsyncStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* pas critique : on degrade silencieusement */
    }
  },
};

export const KEYS = {
  onboarded: 'rf.onboarded',
  bubbleSeen: 'rf.bubbleCoachSeen',
  bubblePos: 'rf.bubblePos',
};
