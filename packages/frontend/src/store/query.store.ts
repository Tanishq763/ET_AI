import { create } from 'zustand';

interface QueryMessage {
  sender: 'user' | 'bot';
  text: string;
  sources?: Array<any>;
  confidence?: 'High' | 'Medium' | 'Low';
  suggestedQueries?: string[];
  timestamp: Date;
}

interface QueryState {
  chatHistory: QueryMessage[];
  addMessage: (message: QueryMessage) => void;
  updateLastBotMessage: (text: string) => void;
  finalizeLastBotMessage: (payload: { sources: any[]; confidence: 'High' | 'Medium' | 'Low'; suggestedQueries?: string[] }) => void;
  clearChat: () => void;
}

export const useQueryStore = create<QueryState>((set) => ({
  chatHistory: [],
  addMessage: (message) => set((state) => ({
    chatHistory: [...state.chatHistory, message]
  })),
  updateLastBotMessage: (text) => set((state) => {
    const history = [...state.chatHistory];
    const lastIndex = history.map(h => h.sender).lastIndexOf('bot');
    if (lastIndex !== -1) {
      history[lastIndex] = {
        ...history[lastIndex],
        text: history[lastIndex].text + text
      };
    } else {
      history.push({
        sender: 'bot',
        text,
        timestamp: new Date()
      });
    }
    return { chatHistory: history };
  }),
  finalizeLastBotMessage: (payload) => set((state) => {
    const history = [...state.chatHistory];
    const lastIndex = history.map(h => h.sender).lastIndexOf('bot');
    if (lastIndex !== -1) {
      history[lastIndex] = {
        ...history[lastIndex],
        sources: payload.sources,
        confidence: payload.confidence,
        suggestedQueries: payload.suggestedQueries
      };
    }
    return { chatHistory: history };
  }),
  clearChat: () => set({ chatHistory: [] })
}));
