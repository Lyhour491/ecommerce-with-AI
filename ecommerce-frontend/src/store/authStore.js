const TOKEN_KEY = "token";
const USER_KEY = "user";

export const authStore = {
  getToken: () => localStorage.getItem(TOKEN_KEY),

  setToken: (token) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken: () => localStorage.removeItem(TOKEN_KEY),

  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  },

  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),

  clearUser: () => localStorage.removeItem(USER_KEY),

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
