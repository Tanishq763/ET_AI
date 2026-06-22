import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export const useVoiceInput = (onTranscript: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-IN'; // Indian English default, Hindi fallback supported

    rec.onstart = () => {
      setIsListening(true);
      toast('Listening... Speak into your microphone', { icon: '🎙️', id: 'voice-active' });
    };

    rec.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      onTranscript(resultText);
      toast.success(`Voice Recognized: "${resultText}"`, { id: 'voice-active' });
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast.dismiss('voice-active');
      if (event.error !== 'no-speech') {
        toast.error(`Voice recognition error: ${event.error}`);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      toast.dismiss('voice-active');
    };

    recognitionRef.current = rec;
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input is not supported in this browser. Please use Chrome/Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  return { isListening, toggleListening, isSupported: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) };
};
export default useVoiceInput;
