// Simple localStorage wrapper for Vercel deployment
export const storage = {
  // Save data to localStorage
  set: (key, data) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  },

  // Get data from localStorage
  get: (key, defaultValue = null) => {
    if (typeof window !== 'undefined') {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    }
    return defaultValue;
  },

  // Remove data from localStorage
  remove: (key) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  },

  // Clear all data
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  }
};