import OpenAI from 'openai';
import Course from '../models/Course.js';
import Section from '../models/Section.js';
import Lesson from '../models/Lesson.js';
import CourseLearningProgress from '../models/CourseLearningProgress.js';
import fetch from 'node-fetch';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────
// GET /api/ai/course-learning/structure/:courseId
// Returns course sections with their notes and lesson list.
// This is what the frontend uses to build the Day nav bar and
// feed study notes into the AI prompts.
// ─────────────────────────────────────────────────────────────
export const getCourseStructure = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId).select('title description lang');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Fetch sections sorted by order
    const sections = await Section.find({ courseId }).sort('order');

    // Fetch all lessons for this course, sorted by order
    const lessons = await Lesson.find({ courseId }).sort('order').select(
      'title sectionId order duration videoUrl textContent content'
    );

    // Group lessons by sectionId for O(1) lookup
    const lessonsBySection = {};
    for (const lesson of lessons) {
      const sid = lesson.sectionId.toString();
      if (!lessonsBySection[sid]) lessonsBySection[sid] = [];
      lessonsBySection[sid].push(lesson);
    }

    // Build the final structure
    const structure = sections.map((section, index) => {
      const sectionId = section._id.toString();
      const sectionLessons = lessonsBySection[sectionId] || [];

      // Collect study notes: prefer section.notes array, else fall back to note string
      let studyNotes = [];
      if (section.notes && section.notes.length > 0) {
        studyNotes = section.notes.map(n => ({
          heading: n.heading,
          content: n.content,
        }));
      } else if (section.note && section.note.trim()) {
        studyNotes = [{ heading: section.title, content: section.note }];
      }

      // Also pull textContent/content from lessons that are study notes
      // (lessons without videoUrl, or with textContent set, are treated as study notes)
      const videoLessons = [];
      const lessonNotes = [];
      for (const l of sectionLessons) {
        if (l.textContent && l.textContent.trim()) {
          lessonNotes.push({ heading: l.title, content: l.textContent });
        } else if (l.content && l.content.trim()) {
          lessonNotes.push({ heading: l.title, content: l.content });
        }
        if (l.videoUrl && l.videoUrl.trim()) {
          videoLessons.push({ title: l.title, duration: l.duration, videoUrl: l.videoUrl });
        }
      }

      // Merge section-level notes with lesson-level text notes
      const allStudyNotes = [...studyNotes, ...lessonNotes];

      return {
        sectionId: section._id,
        dayIndex: index,
        dayNumber: index + 1,
        title: section.title,
        description: section.description || '',
        studyNotes: allStudyNotes,  // [{heading, content}]
        videoLessons,               // [{title, duration, videoUrl}]
        totalStudyNotes: allStudyNotes.length,
        totalVideoLessons: videoLessons.length,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        course: { _id: course._id, title: course.title, description: course.description, lang: course.lang },
        days: structure,
        totalDays: structure.length,
      },
    });
  } catch (error) {
    console.error('❌ getCourseStructure error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/ai/course-learning/progress/:courseId
// Fetch (or create) a user's progress for a given course
// ─────────────────────────────────────────────────────────────
export const getProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    let progress = await CourseLearningProgress.findOne({ userId, courseId });
    if (!progress) {
      progress = await CourseLearningProgress.create({ userId, courseId });
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    console.error('❌ getProgress error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/ai/course-learning/progress/:courseId
// Save/update a user's progress
// Body: { currentDayIndex, completedTheorySectionIds, videoWatchedSectionIds, lastNoteIndexTaught }
// ─────────────────────────────────────────────────────────────
export const saveProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;
    const {
      currentDayIndex,
      completedTheorySectionIds,
      videoWatchedSectionIds,
      lastNoteIndexTaught,
      newlyCompletedDayIndex,
      introShownDayIndex,
    } = req.body;

    let progress = await CourseLearningProgress.findOne({ userId, courseId });
    if (!progress) {
      progress = new CourseLearningProgress({ userId, courseId });
    }

    progress.lastActivity = new Date();
    if (currentDayIndex !== undefined) progress.currentDayIndex = currentDayIndex;
    if (completedTheorySectionIds !== undefined) progress.completedTheorySectionIds = completedTheorySectionIds;
    if (videoWatchedSectionIds !== undefined) progress.videoWatchedSectionIds = videoWatchedSectionIds;
    if (lastNoteIndexTaught !== undefined) progress.lastNoteIndexTaught = lastNoteIndexTaught;

    if (newlyCompletedDayIndex !== undefined) {
      const exists = progress.dayCompletions.find(c => c.dayIndex === newlyCompletedDayIndex);
      if (!exists) {
        progress.dayCompletions.push({
          dayIndex: newlyCompletedDayIndex,
          completedAt: new Date()
        });
      }
    }

    if (introShownDayIndex !== undefined) {
      const exists = progress.dayIntros.find(i => i.dayIndex === introShownDayIndex);
      if (!exists) {
        progress.dayIntros.push({
          dayIndex: introShownDayIndex,
          introShownAt: new Date()
        });
      }
    }

    await progress.save();

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    console.error('❌ saveProgress error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/ai/course-learning/ask
// Context-restricted AI teacher endpoint for course mode.
// Body: {
//   question, language, history,
//   courseTitle, dayNumber, dayTitle,
//   studyNotes: [{heading, content}],
//   isGreeting, isReturnVisit, lastCompletedDayTitle, videoWatched
// }
// ─────────────────────────────────────────────────────────────
export const askCourseLearning = async (req, res) => {
  try {
    const user = req.user;
    const {
      question,
      language = 'English',
      history = [],
      courseId,
      courseTitle = '',
      dayNumber = 1,
      dayTitle = '',
      studyNotes = [],
      noteIndex = 0,      // which note to teach in this request (0-based)
      isGreeting = false,
      isReturnVisit = false,
      lastCompletedDayTitle = '',
      videoWatched = false,
    } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required' });
    }

    // --- 24-Hour Unlock Validation ---
    if (courseId && dayNumber > 1) {
      const progress = await CourseLearningProgress.findOne({ userId: user._id, courseId });
      if (progress && progress.dayCompletions) {
        const prevDayCompletion = progress.dayCompletions.find(c => c.dayIndex === dayNumber - 2);
        
        // If the previous day hasn't been completed yet (based on new tracking)
        if (!prevDayCompletion) {
           // Fallback for older users who might have completed it before tracking was added
           if (progress.currentDayIndex < dayNumber - 1) {
              return res.status(403).json({ success: false, error: 'This lesson is currently locked.' });
           }
        } else {
           const completedTime = new Date(prevDayCompletion.completedAt).getTime();
           const now = Date.now();
           const requiredWaitMs = 24 * 60 * 60 * 1000; // 24 hours
           if (now - completedTime < requiredWaitMs) {
             return res.status(403).json({ success: false, error: 'This lesson will unlock after 24 hours.' });
           }
        }
      }
    }
    // ---------------------------------

    const firstName = user.firstName || (user.name ? user.name.split(' ')[0] : 'there');
    const audioLanguage = language === 'English-Hindi' ? 'Hinglish' : language;

    // ── SPEED OPTIMIZATION: Teach ONE note at a time, not all notes at once ──
    // noteIndex tells us which note to teach in this request.
    // This drastically reduces prompt size and output length → 3-5s instead of 25-38s.
    const totalNotes = studyNotes.length;
    const currentNoteIndex = Math.min(noteIndex || 0, totalNotes - 1);
    const currentNote = studyNotes[currentNoteIndex];
    const isLastNote = currentNoteIndex >= totalNotes - 1;

    // Only include the CURRENT note in the prompt (trim to 1500 chars to keep it fast)
    const notesBlock = currentNote
      ? `### NOTE ${currentNoteIndex + 1} of ${totalNotes}: ${currentNote.heading}\n${(currentNote.content || '').substring(0, 1500)}`
      : 'No study notes available for this day.';

    // Keep last 4 turns of conversation history
    const recentHistory = history.slice(-8);
    const historyBlock = recentHistory.length > 0
      ? recentHistory.map(m => `${m.role === 'user' ? 'Student' : 'Teacher'}: ${m.content}`).join('\n')
      : 'No previous conversation.';

    // ── Build the prompt ──────────────────────────────────────
    let specialInstructions = '';

    if (isGreeting && isReturnVisit) {
      specialInstructions = `
The student is returning to Day ${dayNumber}: "${dayTitle}".
Greet them very briefly in one short sentence (e.g., "Welcome back ${firstName}! Let's continue.") then immediately begin teaching Note ${currentNoteIndex + 1}.`;
    } else if (isGreeting) {
      specialInstructions = `
This is a fresh start for Day ${dayNumber}: "${dayTitle}".
Greet the student very briefly in ONE short sentence then IMMEDIATELY start teaching the note below.
Do NOT list topics. Do NOT say "How are you?". Just greet + teach directly.`;
    }

    const completionSignal = isLastNote
      ? `After fully teaching this note, end your response with EXACTLY:
   "Excellent work ${firstName}! You have completed today's theory lesson. See you in the next lesson! [LESSON_COMPLETE]"
   Include [LESSON_COMPLETE] only when this note is fully taught.`
      : `After teaching this note completely, end with: "[NOTE_DONE]"`;

    const prompt = `
**Role**: You are "Tree Campus AI English Teacher" in COURSE LEARNING MODE.
**Student**: ${firstName}
**Course**: ${courseTitle}
**Current Day**: Day ${dayNumber} — "${dayTitle}"
**Teaching**: Note ${currentNoteIndex + 1} of ${totalNotes}

---

## YOUR TASK
Teach ONLY the note provided below. Be warm, encouraging, and natural — like a real teacher.
Do NOT summarize. Teach the full content of this note with examples.

## LANGUAGE RULE
Language: **${language}**
- English: ALL words in both fields must be English only.
- Hindi: Reply in Hindi (Devanagari script).
- English-Hindi: Mix naturally in Latin script (Hinglish).

---

## TODAY'S NOTE TO TEACH
${notesBlock}

---

## COMPLETION
${completionSignal}

${specialInstructions ? `## SPECIAL INSTRUCTION\n${specialInstructions}\n\n---\n` : ''}

## STUDENT'S MESSAGE
${question}

---

## OUTPUT FORMAT — STRICTLY VALID JSON
{
  "ReplyForUser": "<Response for UI board. Always in English. Use <b> for emphasis and <br/> for line breaks. REQUIRED.>",
  "ReplyForUserAudio": "<Plain text spoken response in ${audioLanguage}. No HTML. No emojis. Max 300 words. REQUIRED.>",
  "lessonComplete": <true if you included [LESSON_COMPLETE], else false>
}
`;

    // ── Run OpenAI in parallel with nothing else (TTS runs after) ──
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are the Tree Campus AI English Teacher in COURSE LEARNING MODE.
Output strictly valid JSON. Language: '${language}'.
If language is 'English', every word in ReplyForUserAudio must be in English — ZERO Hindi words.
Include [LESSON_COMPLETE] in ReplyForUser and set lessonComplete: true ONLY when this is the last note and you have finished teaching it.`,
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
      temperature: 0.7,
    });

    let response;
    try {
      response = JSON.parse(completion.choices[0].message.content);
    } catch (parseErr) {
      console.error('❌ Failed to parse Course Learning AI JSON:', parseErr.message);
      return res.status(500).json({ error: 'AI returned invalid format. Please try again.' });
    }

    // Guarantee fields are never empty
    if (!response.ReplyForUser || response.ReplyForUser.trim() === '') {
      response.ReplyForUser = "Let's continue learning! What would you like to explore from today's notes?";
    }
    if (!response.ReplyForUserAudio || response.ReplyForUserAudio.trim() === '') {
      response.ReplyForUserAudio = response.ReplyForUser.replace(/<[^>]*>/g, '').trim();
    }

    // Strip [LESSON_COMPLETE] tag from display text (it's a signal, not user-facing)
    const lessonComplete = response.lessonComplete === true ||
      response.ReplyForUser.includes('[LESSON_COMPLETE]');
    response.ReplyForUser = response.ReplyForUser.replace('[LESSON_COMPLETE]', '').trim();
    response.ReplyForUserAudio = response.ReplyForUserAudio.replace('[LESSON_COMPLETE]', '').trim();

    // ── PARALLEL: Generate Sarvam TTS while OpenAI response was being parsed ──
    // TTS and OpenAI run sequentially for now, but TTS is fast (~1-2s for 300 chars)
    let audioBase64 = null;
    /* --- COMMENTED OUT GOOGLE CLOUD TTS ---
    (Google Cloud TTS code was here — removed in favour of Sarvam)
    --- */

    // Generate audio via Sarvam TTS
    try {
        const sarvamApiKey = process.env.SARVAM_API_KEY;
        if (sarvamApiKey && response.ReplyForUserAudio) {
            let targetLanguageCode = 'en-IN';
            let speaker = 'suhani';
            if (language === 'Hindi' || language === 'English-Hindi') {
                targetLanguageCode = 'hi-IN';
                speaker = 'pooja';
            }
            // Cap at 500 chars for faster TTS (one note at a time = shorter audio)
            const audioText = response.ReplyForUserAudio.substring(0, 500);
            
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
                    pace: 1.0,
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

    res.json({
      text: response.ReplyForUser,
      audio_text: response.ReplyForUserAudio,
      audio: audioBase64,
      visemes: visemesData,
      lessonComplete,
    });
  } catch (error) {
    console.error('❌ askCourseLearning error:', error.status || '', error.message);
    if (error.status === 429) {
      return res.status(429).json({ error: 'AI service is busy. Please wait a moment.' });
    }
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
