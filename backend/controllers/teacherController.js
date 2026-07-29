import OpenAI from "openai";
import ChatHistory from '../models/ChatHistory.js';
import fetch from 'node-fetch';

const openai = new OpenAI({
    apiKey: process.env["OPENAI_API_KEY"],
});

export const askTeacher = async (req, res) => {
    try {
        const { question, history } = req.body;
        const userId = req.user._id;
        const user = req.user;

        if (!question || question.trim() === '') {
            return res.status(400).json({ error: 'Question is required' });
        }

        let { language } = req.body;
        language = language || "English";

        // Always display on board in English, only vary spoken audio
        const displayLanguage = "English";
        const audioLanguage = language === "English-Hindi" ? "Hinglish" : language;

        const sessionHistory = history || [];
        // Keep last 3 turns (6 messages)
        const recentChatHistory = sessionHistory.slice(-6);

        const isGreeting = /^(hi|hello|hey|greetings|good morning|good evening|namaste|namsate|नमस्ते)([\s\W]*)$/i.test(question.trim());

        const formattedHistoryForPrompt = (recentChatHistory.length && !isGreeting)
            ? recentChatHistory
                  .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
                  .join("\n")
            : "No recent conversation. (Start Fresh)";

        const prompt = `
**Role**: You are "Tree Campus AI English Teacher", a professional, encouraging, and highly effective Indian English instructor.
**Objective**: Help students improve their English skills through natural, clear, and friendly conversation.

---

## **CRITICAL LANGUAGE RULES — OBEY WITHOUT EXCEPTION**
- The student has selected language: **${language}**.
- **English Mode**: EVERY word in both ReplyForUser and ReplyForUserAudio MUST be in English ONLY. Do NOT use a single Hindi word, phrase, or character. Pretend Hindi does not exist.
- **Hindi Mode**: Reply entirely in Hindi (Devanagari script). No English words unless it is a technical term.
- **Eng-Hin Mode (Hinglish)**: Mix Hindi and English naturally in Latin script (e.g., "Aaj hum past tense seekhenge").
- **NEVER switch language** unless the student explicitly asks to change. Stick strictly to the selected language in EVERY response.

---

## **Teaching Style & Guidelines**
1. **Persona**: Warm, soft-spoken Indian female teacher. Clear pronunciation, natural confidence.
2. **Correction Policy**: Focus on major errors only. Correct gently and briefly.
3. **Brevity**: Keep responses EXTREMELY short (max 2-3 sentences). No long paragraphs.
4. **Structured Layout**: Use <b> for emphasis and <br/> for breaks in ReplyForUser.
5. **NEVER include HTML tags or emojis in ReplyForUserAudio.**

---

## **Interaction Logic**
* Greeting: Warmly greet ${user.name || "Learner"} in **${language === 'Hindi' ? 'Hindi' : language === 'English-Hindi' ? 'Hinglish' : 'English'}** only. Ask what they'd like to focus on.
* Topic: Explanation → Example → Practice question.
* Off-Topic: Politely steer back to English learning.

---

## **Context**
- **Learner**: ${user.name || "Learner"}
- **Selected Language**: ${language}
- **Recent Chat**: ${formattedHistoryForPrompt}
- **Current Question**: ${question}

---

## **Output Format — STRICTLY VALID JSON**
{
    "ReplyForUser": "<Structured HTML for the UI board. Always in English. REQUIRED. Never empty.>",
    "ReplyForUserAudio": "<Plain text spoken response in ${language === 'Hindi' ? 'Hindi (Devanagari)' : language === 'English-Hindi' ? 'Hinglish (Latin script)' : 'English ONLY — zero Hindi words'}. REQUIRED. Full sentence. Never empty.>"
}
`;


        console.time("OpenAI Text Generation");
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are the Tree Campus AI English Teacher. Output strictly valid JSON with BOTH ReplyForUser AND ReplyForUserAudio always filled. CRITICAL RULE: The student selected language is '${language}'. If it is 'English', EVERY single word in ReplyForUserAudio must be in English — ZERO Hindi words allowed. If it is 'Hindi', reply in Hindi only. If 'English-Hindi', use Hinglish in Latin script. Never deviate from the selected language.`
                },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            max_tokens: 350,
            temperature: 0.7
        });
        console.timeEnd("OpenAI Text Generation");

        // Parse and validate response
        let response;
        try {
            response = JSON.parse(completion.choices[0].message.content);
        } catch (parseErr) {
            console.error("❌ Failed to parse OpenAI JSON response:", parseErr.message);
            console.error("Raw content:", completion.choices[0].message.content);
            return res.status(500).json({ error: "AI returned invalid response format. Please try again." });
        }

        // Guarantee fields are never empty
        if (!response.ReplyForUser || response.ReplyForUser.trim() === '') {
            response.ReplyForUser = "I'm here to help you learn English! What would you like to practice today?";
        }
        if (!response.ReplyForUserAudio || response.ReplyForUserAudio.trim() === '') {
            // Strip HTML tags from ReplyForUser as spoken fallback
            response.ReplyForUserAudio = response.ReplyForUser.replace(/<[^>]*>/g, '').trim();
        }

        // Hardcoded visemes for 3D avatar lipsync
        const visemesData = [
            [140, 21], [350, 5], [490, 21], [630, 0], [980, 21], [1050, 7], [1110, 21],
            [1180, 5], [1250, 21], [1460, 18], [1530, 21], [1600, 1], [1680, 21],
            [1770, 5], [1980, 19], [2050, 21], [2330, 5], [2500, 21], [2640, 0],
            [3190, 5], [3240, 21], [3420, 5], [3560, 8], [3770, 21], [3840, 1],
            [3920, 21], [3980, 5], [4110, 21], [4180, 5], [4250, 21], [4600, 5],
            [4670, 21], [4740, 0], [5160, 6], [5210, 21], [5320, 1], [5400, 5],
            [5440, 21], [5620, 1], [5710, 21], [5780, 5], [5840, 21], [6120, 5],
            [6260, 21], [6330, 5], [6470, 0], [6520, 0], [7009, 21], [7133, 14],
            [7321, 19], [7473, 5], [8992, 10], [10213, 3], [11060, 20], [11418, 0],
            [11910, 10], [12605, 1], [13621, 3], [14775, 20], [15744, 4], [16865, 4],
            [18045, 12], [18625, 18], [19721, 11], [20421, 21], [20959, 12], [21900, 7],
            [23241, 0], [24495, 8], [25730, 8], [27225, 20], [28921, 2], [30360, 13],
            [31944, 16], [33192, 21], [34737, 1], [35908, 5], [37256, 14], [38625, 18],
            [40130, 14], [41418, 8], [42999, 2], [44450, 9], [45576, 17], [46922, 16],
            [48259, 0], [49523, 16], [51084, 5], [52531, 15], [53856, 11], [55384, 19],
            [56792, 21], [58292, 19], [59856, 11]
        ];

        // Store chat history in background (non-blocking)
        ChatHistory.findOneAndUpdate(
            { user: userId, isTeacher: true },
            {
                $push: {
                    messages: [
                        { role: 'user', content: question },
                        { role: 'assistant', content: response.ReplyForUser }
                    ]
                }
            },
            { upsert: true, new: true }
        ).catch(err => console.error("History storage error:", err));

        // Generate audio via Sarvam TTS
        let audioBase64 = null;
        try {
            const sarvamApiKey = process.env.SARVAM_API_KEY;
            if (sarvamApiKey && response.ReplyForUserAudio) {
                let targetLanguageCode = 'en-IN';
                let speaker = 'suhani';
                if (language === 'Hindi' || language === 'English-Hindi') {
                    targetLanguageCode = 'hi-IN';
                    speaker = 'pooja';
                }
                const audioText = response.ReplyForUserAudio.substring(0, 1000);
                const sarvamResponse = await fetch('https://api.sarvam.ai/text-to-speech/stream', {
                    method: 'POST',
                    headers: {
                        'api-subscription-key': sarvamApiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: audioText,
                        target_language_code: targetLanguageCode,
                        speaker,
                        model: 'bulbul:v3',
                        pace: 0.95,
                    }),
                });
                if (sarvamResponse.ok) {
                    const arrayBuffer = await sarvamResponse.arrayBuffer();
                    audioBase64 = Buffer.from(arrayBuffer).toString('base64');
                } else {
                    console.error('Sarvam TTS error:', await sarvamResponse.text());
                }
            }
        } catch (ttsErr) {
            console.error('Failed to generate Sarvam TTS audio:', ttsErr.message);
        }

        // Return response with audio
        res.json({
            text: response.ReplyForUser,
            audio_text: response.ReplyForUserAudio,
            audio: audioBase64,
            visemes: visemesData
        });

    } catch (error) {
        console.error("❌ Teacher AI Critical Error:", error.status || '', error.message);
        if (error.stack) console.error(error.stack);

        if (error.status === 401) {
            return res.status(500).json({ error: 'AI service authentication failed. Please contact support.' });
        } else if (error.status === 429) {
            return res.status(429).json({ error: 'AI service is busy. Please wait a moment and try again.' });
        } else if (error.status === 402) {
            return res.status(500).json({ error: 'AI service quota exceeded. Please contact support.' });
        }

        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
