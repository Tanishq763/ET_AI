import { useState } from 'react';
import { useQueryStore } from '../store/query.store';
import { useAuthStore } from '../store/auth.store';
import { API_URL } from '../api/client';
import toast from 'react-hot-toast';

export const useRAGQuery = () => {
  const [loading, setLoading] = useState(false);
  const addMessage = useQueryStore((state) => state.addMessage);
  const updateLastBotMessage = useQueryStore((state) => state.updateLastBotMessage);
  const finalizeLastBotMessage = useQueryStore((state) => state.finalizeLastBotMessage);
  const token = useAuthStore((state) => state.token);

  const askQuestion = async (query: string, filters: any = {}) => {
    if (!query.trim()) return;

    setLoading(true);

    // 1. Add user query message
    addMessage({
      sender: 'user',
      text: query,
      timestamp: new Date(),
    });

    // Initialize blank bot message
    addMessage({
      sender: 'bot',
      text: '',
      timestamp: new Date(),
    });

    try {
      const response = await fetch(`${API_URL}/api/v1/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, filters }),
      });

      if (!response.ok) {
        throw new Error(`Failed to contact RAG agent: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        
        // Split chunk by SSE boundaries
        const lines = chunkValue.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.token) {
                updateLastBotMessage(parsed.token);
              } else if (parsed.event === 'done' && parsed.data) {
                // Final answer details (sources, confidence, suggestions)
                const log = parsed.data;
                finalizeLastBotMessage({
                  sources: log.sources || [],
                  confidence: log.confidence || 'Medium',
                  suggestedQueries: log.suggestedQueries || [],
                });
              }
            } catch (err) {
              // Ignore partial parsing errors
            }
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Query SSE failed:', error);
      toast.error('Query processing error');
      updateLastBotMessage('Failed to fetch cited answer. AI services might be offline.');
    } finally {
      setLoading(false);
    }
  };

  return { askQuestion, loading };
};
export default useRAGQuery;
