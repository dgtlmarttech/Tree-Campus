/**
 * Seed Script: 90-Day Notification Templates
 * 
 * Run with: node Backend/seed/seedDayNotifications.js
 * 
 * Populates DayNotificationTemplate collection with all 90 days x 3 types.
 * Days 1-30: Client-provided exact content.
 * Days 31-90: Generated following the same pattern and style.
 * 
 * Safe to re-run (upserts, does not duplicate).
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import DayNotificationTemplate from '../models/DayNotificationTemplate.js';

const MONGODB_URI = process.env.MONGODB_URI;

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION CONTENT — ALL 90 DAYS
// ─────────────────────────────────────────────────────────────────────────────
// Each entry: [day, zoom_info title, zoom_info body, zoom_started title, zoom_started body, engagement title, engagement body]
// Routes:
//   zoom_info    → /zoomMeetings
//   zoom_started → /zoomMeetings
//   engagement   → /dashboard

const ALL_DAYS = [
  // ── DAYS 1–30 (CLIENT PROVIDED) ────────────────────────────────────────────
  [1,  '📚 Free Spoken English Class Today!', 'Join our free live Zoom class and start your 90-day English learning journey.', '🔴 Zoom Class Started!', 'Your free English class has started. Join now and start learning.', '🗣️ Meet Spokee!', 'Practice speaking English and build your confidence.'],
  [2,  '🎓 Free English Class Today!', 'Get ready to learn, practice and improve your English with us.', '🔴 Your Zoom Class Has Started!', 'Join your free English class now.', '🎮 Learn English with Games!', 'Practice English while having fun.'],
  [3,  '📖 Today\'s Free Zoom English Class!', 'Don\'t miss your opportunity to learn English for free.', '🔴 Class Started!', 'Join the free Zoom English class now.', '🧠 Learn Word of the Day!', 'Add a new English word to your vocabulary today.'],
  [4,  '🎯 Your Free English Class Is Today!', 'Join our live Zoom session and keep learning.', '🔴 Zoom Class Started!', 'Join now and learn English with us.', '🗣️ Spokee Is Waiting!', 'Practice your English conversation today.'],
  [5,  '📚 Free Spoken English Class Today!', 'Get ready for another lesson on your English journey.', '🔴 Live Now!', 'Your free Zoom English class has started. Join now.', '🎥 Watch Your English Classes!', 'Missed a lesson? Catch up with the course videos.'],
  [6,  '🌟 Learn English for Free!', 'Your live Zoom class is scheduled for today.', '🔴 Class Started!', 'Join the free Zoom session now.', '🎮 Time to Play & Learn!', 'Improve your English with fun learning games.'],
  [7,  '🎉 One Week of Learning!', 'Join today\'s free Zoom English class and keep your progress going.', '🔴 Your Free Class Has Started!', 'Join the Zoom class now.', '🗣️ Practice with Spokee!', 'Speak more English and become more confident.'],
  [8,  '📚 Free Zoom English Class Today!', 'A new lesson is waiting for you.', '🔴 Zoom Class Started!', 'Join now — your free English lesson is live.', '🧠 Word of the Day!', 'Learn it, remember it and use it.'],
  [9,  '🎓 Ready for Today\'s English Class?', 'Join our free live Zoom session.', '🔴 Live English Class Started!', 'Join now and start learning.', '🎮 Learn English Through Games!', 'Turn practice into fun.'],
  [10, '🔟 10 Days of Learning!', 'Join today\'s free Zoom English class.', '🔴 Zoom Class Is Live!', 'Join your free English class now.', '🗣️ Talk to Spokee!', 'Practice your English conversation today.'],
  [11, '📖 Free Spoken English Class Today!', 'Continue your learning journey with today\'s live session.', '🔴 Class Started!', 'Join the free Zoom English class now.', '🎥 Watch & Learn!', 'Explore your English course videos anytime.'],
  [12, '🎯 Today\'s Free Zoom Class!', 'Learn English, practice speaking and improve your confidence.', '🔴 Your English Class Has Started!', 'Join now.', '🧠 New Word of the Day!', 'Learn a useful English word today.'],
  [13, '🌟 Free English Learning Session Today!', 'Join our live Zoom class.', '🔴 Zoom Class Started!', 'Your free class is live. Join now.', '🗣️ Spokee Wants to Practice With You!', 'Start a conversation today.'],
  [14, '🎉 2 Weeks of Learning!', 'Join today\'s free Zoom English class.', '🔴 Class Started!', 'Join your free live English class now.', '🎮 Play & Learn English!', 'Try today\'s learning game.'],
  [15, '🚀 Halfway Through Your First Month!', 'Join today\'s free Zoom class.', '🔴 Live Now!', 'Your free English Zoom class has started.', '🎥 Keep Learning!', 'Watch your course videos and continue your progress.'],
  [16, '📚 Free Spoken English Class Today!', 'Don\'t miss today\'s live lesson.', '🔴 Zoom Class Started!', 'Join now and learn English for free.', '🗣️ Practice with Spokee!', 'Improve your speaking confidence today.'],
  [17, '🎓 Your Free English Class Is Today!', 'Get ready to learn something new.', '🔴 Class Started!', 'Join the free Zoom session now.', '🧠 Learn Your Word of the Day!', 'Grow your English vocabulary.'],
  [18, '📖 Today\'s Free Zoom English Class!', 'Join us and continue your 90-day journey.', '🔴 Zoom Class Is Live!', 'Join now and start learning.', '🎮 English + Games = Learning Made Fun!', 'Try it today.'],
  [19, '🌱 Another Day, Another English Lesson!', 'Join today\'s free Zoom class.', '🔴 Your Class Has Started!', 'Join the Zoom session now.', '🗣️ Spokee Is Ready!', 'Practice your English conversation.'],
  [20, '🎯 20 Days of Learning!', 'Join today\'s free live English class.', '🔴 Live English Class Started!', 'Join now.', '🎥 Missed a Class?', 'Watch the course videos and catch up.'],
  [21, '🎉 3 Weeks Completed!', 'Keep your English journey going with today\'s free Zoom class.', '🔴 Zoom Class Started!', 'Join your free English class now.', '🧠 Word of the Day!', 'Learn a new word and use it today.'],
  [22, '📚 Free English Class Today!', 'Join our live Zoom session and keep learning.', '🔴 Your Free Zoom Class Is Live!', 'Join now.', '🎮 Challenge Yourself!', 'Play an English learning game today.'],
  [23, '🗣️ Build Your English Confidence!', 'Join today\'s free Zoom class.', '🔴 Class Started!', 'Join your live English class now.', '💬 Practice English with Spokee!', 'Start speaking today.'],
  [24, '🎓 Today\'s Free Spoken English Class!', 'Your next lesson is waiting.', '🔴 Zoom Class Started!', 'Join now and learn with us.', '🧠 Learn a New Word Today!', 'Improve your English vocabulary.'],
  [25, '🔥 25 Days of Learning!', 'Join today\'s free Zoom English class.', '🔴 Live Now!', 'Your free Zoom class has started. Join now.', '🎮 Play. Learn. Improve.', 'Practice English with today\'s game.'],
  [26, '📖 Free English Class Today!', 'Take another step toward better English.', '🔴 Your English Class Has Started!', 'Join the free Zoom session now.', '🗣️ Spokee Is Waiting for You!', 'Practice speaking English today.'],
  [27, '🌟 Your Free Zoom English Class Is Today!', 'Don\'t miss today\'s lesson.', '🔴 Class Started!', 'Join now and continue learning English.', '🎥 Watch & Practice!', 'Explore your English course videos.'],
  [28, '🎉 4 Weeks of Learning!', 'Join today\'s free Zoom English class.', '🔴 Zoom Class Is Live!', 'Join your free class now.', '🎮 Learn English Through Games!', 'Make your practice more enjoyable.'],
  [29, '🚀 Almost One Month Complete!', 'Join today\'s free Zoom English class.', '🔴 Your Free Class Has Started!', 'Join the Zoom session now.', '🗣️ Practice with Spokee!', 'One conversation can build confidence.'],
  [30, '🏆 30 Days Completed!', 'Join today\'s free Zoom class and continue your 90-day English journey.', '🔴 Zoom Class Started!', 'Join your free English class now.', '🌟 You\'re Just One Step Away!', 'Keep learning with your 90-day English course.'],
  // ── DAYS 31–60 ──────────────────────────────────────────────────────────────
  [31, '📚 Free Spoken English Class Today!', 'One month down, two to go! Join today\'s free live Zoom class.', '🔴 Zoom Class Started!', 'Your free English class is live. Join now!', '🎯 Stay on Track!', 'Complete today\'s lesson and keep your 90-day streak going.'],
  [32, '🎓 Your Free English Class Is Today!', 'Keep building your English skills with today\'s live session.', '🔴 Live Now!', 'Your free Zoom English class has just started. Join now.', '🧠 Word of the Day!', 'Learn one new English word and use it in a sentence today.'],
  [33, '📖 Day 33 English Class!', 'Great progress! Join today\'s free Zoom class and keep learning.', '🔴 Class Started!', 'Join the free Zoom English class now — don\'t miss it!', '🎮 Play & Learn!', 'Try today\'s English game and make learning fun.'],
  [34, '🌟 Free Zoom English Class Today!', 'You\'re doing amazing! Keep the momentum with today\'s live class.', '🔴 Zoom Class Is Live!', 'Join your free English class now.', '🗣️ Practice with Spokee!', 'Have a 5-minute English conversation with Spokee today.'],
  [35, '🎯 Day 35 — Keep Going!', 'You\'re more than a third of the way! Join today\'s free Zoom class.', '🔴 Your Free Class Has Started!', 'Join the live Zoom session now.', '🎥 Catch Up on Videos!', 'Missed something? Revisit your course videos today.'],
  [36, '📚 Free English Class Today!', 'Every class brings you closer to fluency. Join today\'s live session.', '🔴 Zoom Class Started!', 'Your free English lesson is live. Join now!', '🧠 Build Your Vocabulary!', 'Learn today\'s English word and add it to your list.'],
  [37, '🎓 Free Spoken English Class!', 'Day 37 is here! Join our live Zoom class and grow your English.', '🔴 Live English Class Started!', 'Join now and keep learning.', '🗣️ Spokee Time!', 'Practice real English conversations with Spokee today.'],
  [38, '📖 Join Today\'s Free Zoom Class!', 'Consistency is key! Don\'t miss today\'s live English session.', '🔴 Class Started!', 'Join your free live English class right now!', '🎮 English Games Await!', 'Challenge yourself with today\'s vocabulary game.'],
  [39, '🚀 Day 39 — Almost 40!', 'You\'re so close to the 40-day mark! Keep it up with today\'s class.', '🔴 Zoom Class Is Live!', 'Your free English class has started. Join now.', '🌱 Keep Growing!', 'Practice a little every day — you\'re making real progress.'],
  [40, '🎉 40 Days of Learning!', 'Incredible milestone! Join today\'s free Zoom English class.', '🔴 Zoom Class Started!', 'Celebrate 40 days — your free class is live now!', '🏆 40 Days Strong!', 'Review what you\'ve learned and keep pushing forward.'],
  [41, '📚 Free Zoom English Class Today!', 'Day 41 — your English is getting better every day! Join now.', '🔴 Your Free Class Has Started!', 'Join the live Zoom session now and keep learning.', '🗣️ Speak English Today!', 'Practice with Spokee and build your speaking confidence.'],
  [42, '🎓 Free English Class — Day 42!', 'Six weeks of learning! Join today\'s free Zoom English class.', '🔴 Class Started!', 'Your free English class is live. Don\'t miss it!', '🎮 Play to Learn!', 'Try a vocabulary game and practice English the fun way.'],
  [43, '📖 Day 43 English Class Today!', 'Your dedication is paying off! Join today\'s live Zoom class.', '🔴 Live Now!', 'Your free Zoom English class has started. Join in!', '🧠 Word of the Day!', 'Pick up a new English word and practice using it today.'],
  [44, '🌟 Free Live English Class!', 'Day 44 — every lesson makes a difference. Join now.', '🔴 Zoom Class Started!', 'Join your free English class and keep the streak alive.', '🎥 Watch Your Course Videos!', 'Revisit a lesson or explore new videos in your course.'],
  [45, '🎯 Halfway Through Month 2!', 'You\'ve completed 45 days! Join today\'s free Zoom class to keep going.', '🔴 Your Free Class Is Live!', 'Join the Zoom session now — your class has started.', '🗣️ Talk More in English!', 'Practice with Spokee and notice how far you\'ve come.'],
  [46, '📚 Free Spoken English Class Today!', 'Day 46 — your English journey continues. Join today\'s live class.', '🔴 Class Started!', 'Join the free live English class now!', '🎮 Game Time!', 'Play today\'s English game and sharpen your vocabulary.'],
  [47, '🎓 Free English Class — Day 47!', 'Keep the momentum! Join our free live Zoom class today.', '🔴 Zoom Class Is Live!', 'Your free class has started. Join now!', '🧠 Learn & Practice!', 'Study your Word of the Day and try using it in a sentence.'],
  [48, '📖 Join Today\'s Free Zoom Class!', 'Day 48 — you\'re crushing it! Join the live English class.', '🔴 Live English Class!', 'Join your free Zoom class right now.', '🌱 Every Word Counts!', 'Build your English vocabulary one word at a time.'],
  [49, '🚀 Day 49 — One Day to 50!', 'Almost at the 50-day milestone! Join today\'s free Zoom class.', '🔴 Zoom Class Started!', 'Your free English lesson has started. Join now!', '🗣️ Practice with Spokee!', 'Just 5 minutes of conversation practice can make a big difference.'],
  [50, '🏆 50 Days Completed!', 'AMAZING! You\'ve reached the halfway point. Join today\'s free Zoom class!', '🔴 50-Day Celebration!', 'Your free English class is live. Join and keep going!', '🎉 Halfway Champion!', 'You\'ve made incredible progress. Keep up the great work!'],
  [51, '📚 Free Spoken English Class Today!', 'Day 51 — you\'re in the second half of your 90-day journey! Join now.', '🔴 Class Started!', 'Join your free English class now and keep the streak alive.', '🎮 Level Up!', 'Try a more challenging English game today.'],
  [52, '🎓 Free English Class — Day 52!', 'Keep building fluency! Join today\'s free live Zoom class.', '🔴 Zoom Class Is Live!', 'Your free English lesson has started. Join now.', '🧠 Word of the Day!', 'Learn it, use it, own it — your daily English word is waiting.'],
  [53, '📖 Day 53 English Class Today!', 'You\'re making it happen! Don\'t miss today\'s free Zoom class.', '🔴 Live Now!', 'Your free Zoom class has started. Join and learn!', '🗣️ Spokee Is Ready!', 'Have an English conversation with Spokee and build your skills.'],
  [54, '🌟 Free Live Zoom Class Today!', 'Day 54 — you\'re incredible! Join today\'s free English class.', '🔴 Zoom Class Started!', 'Your free class is live. Come learn with us!', '🎥 Course Videos!', 'Watch, revisit, and reinforce your English lessons anytime.'],
  [55, '🎯 Day 55 — 35 Days to Go!', 'The finish line is in sight! Join today\'s free Zoom class.', '🔴 Your Free Class Has Started!', 'Join the Zoom session now and stay on track.', '🔥 Keep the Fire Burning!', 'You\'re over halfway — keep pushing and keep learning.'],
  [56, '📚 Free Spoken English Class Today!', 'Day 56 — 8 weeks in! Join our free Zoom class and celebrate.', '🔴 Class Started!', 'Your free English class is live. Join now!', '🎮 Play & Improve!', 'Sharpen your English with today\'s learning game.'],
  [57, '🎓 Free English Class — Day 57!', 'You\'ve come so far! Join today\'s free Zoom English class.', '🔴 Live English Class!', 'Your free Zoom class has started. Join now.', '🧠 Daily Vocabulary!', 'Add a new English word to your growing list today.'],
  [58, '📖 Day 58 English Class Today!', 'You\'re in the home stretch! Join today\'s free live Zoom session.', '🔴 Zoom Class Is Live!', 'Your free class has started. Join and learn!', '🗣️ Practice Makes Perfect!', 'Practice English with Spokee — every conversation helps.'],
  [59, '🚀 Day 59 — Almost 60!', 'One more day to the 60-day milestone! Join today\'s free class.', '🔴 Zoom Class Started!', 'Your free English lesson is live. Join now!', '🌱 Small Steps, Big Results!', 'Every word, every lesson, every day — it all adds up.'],
  [60, '🏆 60 Days Completed!', 'Wow — 60 days of English learning! Join today\'s free Zoom class.', '🔴 60 Days — Class Is Live!', 'Join your free English class and celebrate this milestone!', '🌟 60-Day Champion!', 'Two-thirds of your journey done. You\'re truly amazing — keep going!'],
  // ── DAYS 61–90 ──────────────────────────────────────────────────────────────
  [61, '📚 Free Spoken English Class Today!', 'Day 61 — the final stretch begins! Join today\'s free Zoom class.', '🔴 Class Started!', 'Your free English class is live. Don\'t miss it!', '🎯 Final Stretch!', '30 days to go — let\'s finish strong with today\'s learning.'],
  [62, '🎓 Free English Class — Day 62!', 'You\'re almost there! Join today\'s free live Zoom class.', '🔴 Zoom Class Is Live!', 'Your free class has started. Join now and keep learning!', '🎮 Game On!', 'Try today\'s English vocabulary game and keep improving.'],
  [63, '📖 Day 63 English Class Today!', 'Nine weeks done! Join today\'s free Zoom class and keep going.', '🔴 Live Now!', 'Your free Zoom English class has started. Join in!', '🧠 Word of the Day!', 'Learn a powerful new English word and practice it today.'],
  [64, '🌟 Free Live English Class!', 'Day 64 — every class is taking you closer to fluency. Join now.', '🔴 Zoom Class Started!', 'Your free class is live. Come join us!', '🗣️ Spokee Is Ready!', 'Practice an English conversation today and feel the growth.'],
  [65, '🎯 Day 65 — 25 Days Left!', 'You\'re so close! Join today\'s free Zoom class and keep pushing.', '🔴 Your Free Class Has Started!', 'Join the live Zoom session now.', '🔥 Finish What You Started!', 'You\'ve built something great. Keep the momentum going!'],
  [66, '📚 Free Spoken English Class Today!', 'Day 66 — your English is transforming! Join today\'s class.', '🔴 Class Started!', 'Your free English class is live now. Join!', '🎥 Revisit Your Videos!', 'Review your course videos to reinforce everything you\'ve learned.'],
  [67, '🎓 Free English Class — Day 67!', 'You\'ve come so far — don\'t stop now! Join today\'s free class.', '🔴 Live English Class!', 'Join your free Zoom class now — it has started!', '🧠 Vocabulary Builder!', 'Learn today\'s word and keep expanding your English knowledge.'],
  [68, '📖 Day 68 English Class Today!', 'Stay consistent — join today\'s free Zoom English class.', '🔴 Zoom Class Is Live!', 'Your free class is on. Join now!', '🎮 Challenge Yourself!', 'Try the hardest English game today and see how far you\'ve come.'],
  [69, '🚀 Day 69 — Almost 70!', 'So close to the 70-day milestone! Join today\'s free Zoom class.', '🔴 Zoom Class Started!', 'Your free English lesson has started. Join now!', '🗣️ Practice with Spokee!', 'Have a full 10-minute English conversation with Spokee today.'],
  [70, '🏆 70 Days Completed!', 'Phenomenal — 70 days of learning! Join today\'s free Zoom class.', '🔴 70 Days — Class Is Live!', 'Celebrate 70 days of learning! Your free class has started.', '🎉 70-Day Hero!', 'You\'ve learned so much. Review your progress and keep going!'],
  [71, '📚 Free Spoken English Class Today!', 'Day 71 — 19 days to the finish line! Join today\'s free class.', '🔴 Class Started!', 'Your free English class is live. Join now!', '🌱 Almost There!', 'Keep practicing — you\'re so close to completing your journey.'],
  [72, '🎓 Free English Class — Day 72!', 'You\'re in the final stretch! Don\'t miss today\'s free Zoom class.', '🔴 Zoom Class Is Live!', 'Join your free class now!', '🎮 Game Time!', 'Play today\'s English game and practice your vocabulary.'],
  [73, '📖 Day 73 English Class Today!', 'Strong finish ahead — join today\'s free live Zoom session.', '🔴 Live Now!', 'Your free Zoom class has started. Come join us!', '🧠 Word of the Day!', 'Learn your final English words and reinforce your vocabulary.'],
  [74, '🌟 Free Live Zoom Class Today!', 'Day 74 — you\'re nearly there! Join today\'s free English class.', '🔴 Zoom Class Started!', 'Your free class is live. Join and finish strong!', '🗣️ Speak More English!', 'Practice with Spokee and feel the confidence you\'ve built.'],
  [75, '🎯 Day 75 — 15 Days to Go!', 'Three-quarters done! Join today\'s free Zoom class.', '🔴 Your Free Class Has Started!', 'Join the Zoom session now.', '🔥 15 Days to Greatness!', 'You\'re 75% of the way there — keep up the incredible work!'],
  [76, '📚 Free Spoken English Class Today!', 'Day 76 — every class counts! Join today\'s free Zoom class.', '🔴 Class Started!', 'Your free English class is live. Join now!', '🎥 Watch & Reinforce!', 'Revisit your course videos to lock in what you\'ve learned.'],
  [77, '🎓 Free English Class — Day 77!', 'You\'re so dedicated! Join today\'s free live Zoom class.', '🔴 Live English Class!', 'Your free class has started. Come join us!', '🧠 Daily English Practice!', 'Learn today\'s word and add it to your vocabulary list.'],
  [78, '📖 Day 78 English Class Today!', 'Almost at the finish line! Join today\'s free Zoom class.', '🔴 Zoom Class Is Live!', 'Your free class is on. Join now!', '🎮 Final Level!', 'Play today\'s English game and test your skills.'],
  [79, '🚀 Day 79 — One Day to 80!', 'Tomorrow is 80 days! Join today\'s free Zoom class to celebrate early.', '🔴 Zoom Class Started!', 'Your free English lesson is live. Join now!', '🗣️ Spokee Challenge!', 'Have a full conversation in English with Spokee today — you can do it!'],
  [80, '🏆 80 Days Completed!', 'Just 10 more days! Join today\'s free Zoom class.', '🔴 80 Days — Class Is Live!', 'Your free English class has started. Join now!', '🌟 80-Day Legend!', '10 more days and you complete your 90-day English journey. Don\'t stop!'],
  [81, '📚 Free Spoken English Class Today!', 'Day 81 — 9 days left! Join today\'s free Zoom class.', '🔴 Class Started!', 'Your free English class is live. Come learn!', '🔥 Final Push!', 'Just 9 days to go — give it everything you\'ve got!'],
  [82, '🎓 Free English Class — Day 82!', '8 days to the finish! Join today\'s free Zoom class.', '🔴 Zoom Class Is Live!', 'Join your free English class now. 8 days to go!', '🎮 Game Time!', 'Practice English with today\'s vocabulary game.'],
  [83, '📖 Day 83 English Class Today!', '7 days left in your journey! Join today\'s free Zoom class.', '🔴 Live Now!', 'Your free Zoom class has started. 7 days to go!', '🧠 Word of the Day!', 'Only 7 days left — make every word count.'],
  [84, '🌟 Free Live English Class!', '6 days to completion! Join today\'s free Zoom class.', '🔴 Zoom Class Started!', 'Your free class is live. Join now — 6 days left!', '🗣️ Speak Every Day!', 'Practice with Spokee daily for the last 6 days.'],
  [85, '🎯 Day 85 — Only 5 Days Left!', 'You\'re almost there! Join today\'s free Zoom class.', '🔴 Your Free Class Has Started!', 'Join the Zoom session — just 5 days left!', '🔥 5 Days to the Finish!', 'You\'ve come so far — don\'t stop now. Five days left!'],
  [86, '📚 Free Spoken English Class Today!', 'Day 86 — 4 days left! Don\'t miss today\'s free Zoom class.', '🔴 Class Started!', 'Your free English class is live. 4 days to the finish!', '🎥 Revisit & Review!', 'Watch your course videos and recap everything you\'ve learned.'],
  [87, '🎓 Free English Class — Day 87!', '3 days to go! Join today\'s free Zoom class.', '🔴 Live English Class!', 'Your free class has started. 3 days left — keep going!', '🧠 Final Vocabulary Push!', 'Learn your last few English words and master your vocabulary.'],
  [88, '📖 Day 88 — 2 Days to Go!', 'Almost there! Join today\'s free Zoom class.', '🔴 Zoom Class Is Live!', 'Join your free class. 2 days left — you can do this!', '🎮 Second to Last!', 'Play today\'s English game — 2 days left in your journey!'],
  [89, '🚀 Day 89 — Last Day Tomorrow!', 'Tomorrow is Day 90! Join today\'s free Zoom class.', '🔴 Zoom Class Started!', 'Your free English class is live. Tomorrow is the last day!', '🗣️ Final Spokee Practice!', 'Have one last conversation with Spokee before Day 90.'],
  [90, '🏆 Day 90 — Your Final Class!', 'You did it! Join your final free Zoom English class today.', '🔴 Your Final Class Is Live!', 'Day 90! Your last free Zoom class has started. Celebrate and join!', '🎉 90-Day Champion!', 'You\'ve completed your 90-day English learning journey. Congratulations! 🌟'],
];

const ROUTES = {
  zoom_info: '/zoomMeetings',
  zoom_started: '/zoomMeetings',
  engagement: '/dashboard',
};

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  let created = 0;
  let updated = 0;

  for (const row of ALL_DAYS) {
    const [day, ziTitle, ziBody, zsTitle, zsBody, engTitle, engBody] = row;

    const templates = [
      { day, notificationType: 'zoom_info',    title: ziTitle,  body: ziBody,  route: ROUTES.zoom_info },
      { day, notificationType: 'zoom_started',  title: zsTitle,  body: zsBody,  route: ROUTES.zoom_started },
      { day, notificationType: 'engagement',    title: engTitle, body: engBody, route: ROUTES.engagement },
    ];

    for (const t of templates) {
      const result = await DayNotificationTemplate.findOneAndUpdate(
        { day: t.day, notificationType: t.notificationType },
        { $setOnInsert: t },
        { upsert: true, new: true, rawResult: true }
      );
      if (result.lastErrorObject?.upserted) {
        created++;
      } else {
        updated++;
      }
    }
  }

  console.log(`✅ Seed complete: ${created} created, ${updated} already existed`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});