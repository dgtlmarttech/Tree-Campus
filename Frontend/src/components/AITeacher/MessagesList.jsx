import { useAITeacher } from "../../hooks/useAITeacher";
import { useRef, useState, useEffect } from "react";
import { marked } from "marked";

export const MessagesList = () => {
  const messages = useAITeacher((state) => state.messages);
  const playMessage = useAITeacher((state) => state.playMessage);
  const stopMessage = useAITeacher((state) => state.stopMessage);
  const { currentMessage } = useAITeacher();
  const classroom = useAITeacher((state) => state.classroom);
  const loading = useAITeacher((state) => state.loading);


  const container = useRef();

  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const [storedQuestion, setStoredQuestion] = useState(null);

  useEffect(() => {
    if (currentMessage?.question) {
      // Hide system/auto messages — never show them on the board
      const hiddenPrefixes = [
        'Welcome Greeting to the user',
        'Please start teaching',
        '__',
        '[SYSTEM',
      ];
      const isHidden = hiddenPrefixes.some(prefix =>
        currentMessage.question.startsWith(prefix)
      );
      if (isHidden) {
        currentMessage.question = null;
      }
      if (currentMessage.question && currentMessage.question !== '') {
        setStoredQuestion(currentMessage.question);
      }
    }
  }, [currentMessage?.question]);


  return (
    <div
      className={`${classroom === "default"
        ? "w-[1288px] h-[580px]"
        : "w-[2528px] h-[750px]"
        } p-8 pt-12 flex flex-col space-y-8 bg-transparent`}
      ref={container}
    >
      {storedQuestion && (
        <h2 className="text-3xl font-bold text-white mb-4">{storedQuestion}</h2>
      )}
      {/* Board Text Container */}
      {latestMessage ? (
        <div className="flex-grow flex items-start gap-6 overflow-y-auto pr-4 pb-4 relative">
          <div className="flex-grow flex flex-col justify-center min-h-full">
            <p
              className="text-4xl px-4 py-4 rounded-sm font-bold text-stone-50 font-noto-sans-devanagari"
              dangerouslySetInnerHTML={{
                __html: marked.parse(latestMessage.answer)
              }}
            />
            
            {/* Small loading indicator at bottom if fetching in background */}
            {loading && (
              <div className="mt-8 flex items-center gap-3 px-4 opacity-70">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="text-xl font-semibold text-teal-300 italic animate-pulse">
                  Preparing lesson...
                </span>
              </div>
            )}
          </div>


          {/* Play/Pause Button - Sticky so it stays visible while scrolling long text  t*/}
          <div className="flex-shrink-0 sticky top-4 mt-4 z-10">
            {currentMessage === latestMessage ? (
              <button
                className="text-white bg-transparent hover:scale-110 transition-transform pointer-events-auto cursor-pointer"
                onPointerDown={(e) => { e.stopPropagation(); stopMessage(latestMessage); }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-20 h-20"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 0 1 9 14.437V9.564Z"
                  />
                </svg>
              </button>
            ) : (
              <button
                className="text-white/65 bg-transparent hover:scale-110 hover:text-white transition-all text-white pointer-events-auto cursor-pointer"
                onPointerDown={(e) => { e.stopPropagation(); playMessage(latestMessage); }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-20 h-20"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="h-full w-full grid place-content-center text-center">
          <h2 className="text-8xl font-bold text-white/90 italic">
            AI ENGLISH TEACHER
            <br />
            <br />
            English Learning Class
          </h2>
        </div>
      )}
    </div>
  );
};
