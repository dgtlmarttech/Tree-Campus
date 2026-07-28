import fetch from "node-fetch";

export const streamAudio = async (req, res) => {
    try {
        const text = req.query.text;
        const language = req.query.language || 'English';
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'Text query parameter is required' });
        }

        // Set up streaming response headers
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Select voice / speaker and target language code based on selected language
        let targetLanguageCode = 'en-IN';
        let speaker = 'suhani'; // Soft, clear Indian female English voice

        if (language === 'Hindi' || language === 'English-Hindi') {
            // Use a single consistent female voice for all Hindi/Hinglish modes
            targetLanguageCode = 'hi-IN';
            speaker = 'pooja'; // Clear, natural female voice — works for both Hindi and Hinglish
        }


        const audioText = text.substring(0, 1000); // Truncate safely

        const response = await fetch("https://api.sarvam.ai/text-to-speech/stream", {
            method: "POST",
            headers: {
                "api-subscription-key": process.env.SARVAM_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: audioText,
                target_language_code: targetLanguageCode,
                speaker: speaker,
                model: "bulbul:v3",
                pace: 0.95
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Sarvam AI returned ${response.status}: ${errorText}`);
        }

        // Pipe the response stream directly to Express response
        response.body.pipe(res);

    } catch (error) {
        console.error("❌ Streaming Audio Error (Sarvam AI):", error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate audio stream' });
        } else {
            res.end();
        }
    }
};

