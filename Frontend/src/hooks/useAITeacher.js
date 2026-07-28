import { create } from "zustand";
import { persist } from "zustand/middleware";

async function fetchAIResponse(question, language, history) {
  const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/api$/, "");
  const url = `${baseUrl}/api/ai/teacher/ask`;
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        question,
        language,
        history,
      }),
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch AI response: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("Error fetching AI response:", err);
    throw err;
  }
}

export const useAITeacher = create(
  persist(
    (set, get) => ({
      messages: [],
      currentMessage: null,
      teacher: "Nanami",
      language: "English",
      classroom: "default",
      speech: "formal",
      loading: false,
      userInteracted: false,
      isLesson: false,
      conversationMode: false,
      resumeListeningTrigger: 0,
      // Single global audio player reference to prevent overlapping/duplicate speech
      _activeAudioPlayer: null,

      setConversationMode: (val) => {
        set(() => ({ conversationMode: val }));
      },

      triggerResumeListening: () => {
        set(() => ({ resumeListeningTrigger: Date.now() }));
      },

      // Kill any currently playing audio immediately
      _killActiveAudio: () => {
        const current = get()._activeAudioPlayer;
        if (current) {
          current.onended = null; // Remove listener to prevent ghost triggers
          current.pause();
          current.src = '';      // Force browser to release the stream resource
          set(() => ({ _activeAudioPlayer: null }));
        }
      },

      setLanguage: (language) => {
        // Kill audio immediately when language changes to prevent echo
        get()._killActiveAudio();
        set(() => ({ language }));
      },

      setSpeech: (speech) => {
        set(() => ({ speech }));
      },

      markUserInteracted: () => {
        set(() => ({ userInteracted: true }));
      },

      askAI: async (question) => {
        if (!question) return;

        const { speech, messages, language } = get();

        set(() => ({ loading: true }));
        try {
          const history = messages.flatMap(m => [
            { role: 'user', content: m.question },
            { role: 'assistant', content: m.answer }
          ]);

          const data = await fetchAIResponse(question, language, history);
          
          const message = {
            question,
            answer: data.text,
            audio_text: data.audio_text,
            audio: data.audio, // Base64 audio from server
            visemes: data.visemes, // Visemes from server
            id: messages.length,
            speech,
          };

          set((state) => ({
            currentMessage: message,
            messages: [...state.messages, message],
            loading: false,
          }));

          get().playMessage(message);
        } catch (error) {
          console.error("Error in askAI:", error);
          set(() => ({ loading: false }));
        }
      },

      playMessage: async (message) => {
        // ── STEP 1: Kill any previous audio immediately to prevent overlap ──
        get()._killActiveAudio();

        set(() => ({ currentMessage: message }));

        if (!get().userInteracted) {
          console.warn("Audio playback is blocked until user interaction.");
          return;
        }

        // If the audio player already exists on this message, replay it
        if (message.audioPlayer) {
          if (message.audioPlayer.currentTime >= message.audioPlayer.duration) {
            message.audioPlayer.currentTime = 0;
          }
          
          message.audioPlayer.onended = () => {
            set(() => ({ currentMessage: null, _activeAudioPlayer: null }));
            if (get().conversationMode) get().triggerResumeListening();
          };

          set(() => ({ _activeAudioPlayer: message.audioPlayer }));
          message.audioPlayer.play().catch(e => console.error("Resume failed:", e));
          return;
        }

        // If we have text to speak, stream it instantly from the new endpoint!
        if (message.audio_text && !get().isLesson) {
          try {
             const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/api$/, "");
             const token = localStorage.getItem('token');
             const language = get().language;
             
             // Construct the streaming URL with the token in the query string
             const streamUrl = `${baseUrl}/api/ai/teacher/stream-audio?text=${encodeURIComponent(message.audio_text)}&language=${encodeURIComponent(language)}&token=${encodeURIComponent(token)}`;

             const audioPlayer = new Audio(streamUrl);

             audioPlayer.onended = () => {
               set(() => ({ currentMessage: null, _activeAudioPlayer: null }));
               if (get().conversationMode) get().triggerResumeListening();
             };

             // Register as the single active player BEFORE play() to prevent any race
             message.audioPlayer = audioPlayer;
             set(() => ({ _activeAudioPlayer: audioPlayer }));
             
             // Start playback instantly (stream will buffer and play automatically)
             audioPlayer.play().catch(e => console.error("Audio playback failed strictly during .play():", e));

             set(() => ({
               messages: get().messages.map((m) =>
                 m.id === message.id ? message : m
               ),
               loading: false,
             }));

          } catch (error) {
             console.error("Error setting up audio stream:", error);
             set(() => ({ loading: false }));
          }
        } else if (!get().isLesson) {
             console.warn("No audio text found in message.");
             set(() => ({ loading: false }));
        }
      },

      stopMessage: (message) => {
        // Stop via the global killer to ensure the stream is fully released
        get()._killActiveAudio();
        if (message && message.audioPlayer) {
          message.audioPlayer.pause();
          message.audioPlayer.src = '';
        }
        set(() => ({ currentMessage: null }));
      },

      reset: () => {
        // Kill any active audio on reset
        get()._killActiveAudio();
        set({
          messages: [],
          currentMessage: null,
          loading: false,
          conversationMode: false,
        });
      },
    }),
    {
      name: "ai-teacher-storage",
      partialize: (state) => ({ 
        messages: state.messages, 
        language: state.language,
        classroom: state.classroom 
      }),
    }
  )
);

if (typeof window !== "undefined") {
  window.addEventListener(
    "click",
    () => useAITeacher.getState().markUserInteracted(),
    { once: true }
  );
  window.addEventListener(
    "keydown",
    () => useAITeacher.getState().markUserInteracted(),
    { once: true }
  );
}
