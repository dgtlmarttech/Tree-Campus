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

// Course Learning Mode: context-restricted AI endpoint
async function fetchCourseLearningAIResponse(payload) {
  const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/api$/, "");
  const url = `${baseUrl}/api/ai/course-learning/ask`;
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch course learning AI response: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("Error fetching course learning AI response:", err);
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
            audio: data.audio,
            visemes: data.visemes,
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

      // ── Course Learning Mode ──────────────────────────────────────────────
      // Uses the context-restricted course learning AI endpoint.
      askAIWithContext: async (payload, onLessonComplete) => {
        const { speech, messages } = get();
        if (!payload?.question) return;

        const history = messages.flatMap(m => [
          { role: 'user', content: m.question },
          { role: 'assistant', content: m.answer }
        ]);

        set(() => ({ loading: true }));
        try {
          const data = await fetchCourseLearningAIResponse({
            ...payload,
            history: [...history, ...(payload.history || [])].slice(-8),
          });

          const message = {
            question: payload.question,
            answer: data.text,
            audio_text: data.audio_text,
            audio: data.audio,
            visemes: data.visemes,
            id: messages.length,
            speech,
          };

          set((state) => ({
            currentMessage: message,
            messages: [...state.messages, message],
            loading: false,
          }));

          get().playMessage(message);

          if (data.lessonComplete && typeof onLessonComplete === 'function') {
            onLessonComplete();
          }

          return data;
        } catch (error) {
          console.error("Error in askAIWithContext:", error);
          set(() => ({ loading: false }));
        }
      },


      playMessage: async (message) => {
        // ── STEP 1: Kill any previous audio immediately to prevent overlap ──
        get()._killActiveAudio();

        set(() => ({ currentMessage: message }));

        // Ensure user interaction is marked (may be needed after page reload)
        get().markUserInteracted();

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

        // If the backend provided base64 audio (for long Course Mode responses)
        if (message.audio) {
           try {
             const audioPlayer = new Audio("data:audio/mp3;base64," + message.audio);
             audioPlayer.onended = () => {
               set(() => ({ currentMessage: null, _activeAudioPlayer: null }));
               if (get().conversationMode) get().triggerResumeListening();
             };
             message.audioPlayer = audioPlayer;
             set(() => ({ _activeAudioPlayer: audioPlayer }));
             
             audioPlayer.play().catch(e => console.error("Base64 Audio playback failed:", e));

             set(() => ({
               messages: get().messages.map((m) =>
                 m.id === message.id ? message : m
               ),
               loading: false,
             }));
           } catch (err) {
             console.error("Error playing base64 audio:", err);
             set(() => ({ loading: false }));
           }
        }
        // Fallback: If we only have text to speak, stream it from the endpoint
        else if (message.audio_text) {
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
        } else {
             console.warn("No audio or audio_text found to play.");
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
        // Also clear loading so "Preparing lesson..." indicator disappears
        set(() => ({ currentMessage: null, loading: false }));
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
        // Strip audio (base64 MP3) and audioPlayer (DOM object) from every message
        // before saving to localStorage. These are huge and blow the 5MB quota.
        // Text fields are enough to re-display the chat history.
        messages: state.messages.map(({ audio, audioPlayer, ...rest }) => rest),
        language: state.language,
        classroom: state.classroom,
        userInteracted: state.userInteracted,
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
