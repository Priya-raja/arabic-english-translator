class GeminiAIService {
    constructor() {
        this.apiKey = '';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
        this.initialized = false;
        this.init();
    }
    
    async init() {
        try {
            let result = {};
            if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined' && typeof chrome.storage.local !== 'undefined') {
                result = await chrome.storage.local.get(['geminiApiKey']);
            } else if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
                const apiKey = window.localStorage.getItem('geminiApiKey');
                if (apiKey) {
                    result.geminiApiKey = apiKey;
                }
            }
            
            if (result.geminiApiKey) {
                this.apiKey = result.geminiApiKey;
                this.initialized = true;
                console.log('✅ Gemini AI initialized');
            } else {
                console.log('⚠️ No API key found - click ⚙️ to configure');
            }
        } catch (error) {
            console.log('⚠️ API key not configured yet - click ⚙️ to configure');
        }
    }
    
    async enhanceTranslation(originalText, translatedText, sourceLang, targetLang) {
        const prompt = `
        As an expert Arabic-English translator, enhance this translation with cultural context:
        
        Original ${sourceLang}: "${originalText}"
        Basic Translation: "${translatedText}"
        
        Provide ONLY a JSON response:
        {
            "enhanced_translation": "A more natural, context-aware translation",
            "cultural_notes": "Cultural context or nuances that might be important",
            "alternatives": ["Alternative way 1", "Alternative way 2", "Alternative way 3"],
            "formality": "formal|informal|neutral",
            "confidence": "high|medium|low"
        }
        `;
        
        return this.callGeminiAPI(prompt);
    }
    
    async explainGrammar(text, language) {
        const prompt = `
        Analyze the grammar of this ${language} text: "${text}"
        
        Provide ONLY a JSON response:
        {
            "grammar_points": ["Key grammatical structure 1", "Key grammatical structure 2"],
            "vocabulary": [
                {"word": "important word", "meaning": "clear explanation", "usage": "example sentence"}
            ],
            "learning_tips": ["Helpful tip 1", "Helpful tip 2"],
            "difficulty_level": "beginner|intermediate|advanced"
        }
        `;
        
        return this.callGeminiAPI(prompt);
    }
    
    async getPronunciationHelp(text, language) {
        const prompt = `
        Provide pronunciation guidance for this ${language} text: "${text}"
        
        Provide ONLY a JSON response:
        {
            "phonetic": "Clear phonetic transcription",
            "pronunciation_tips": ["Specific pronunciation tip 1", "Specific pronunciation tip 2"],
            "common_mistakes": ["Common mistake learners make", "Another common mistake"]
        }
        `;
        
        return this.callGeminiAPI(prompt);
    }
    
    async callGeminiAPI(prompt) {
        if (!this.initialized || !this.apiKey) {
            throw new Error('Please configure your Gemini API key by clicking the ⚙️ settings button');
        }
        
        try {
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.2,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API error (${response.status}): ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const text = data.candidates[0].content.parts[0].text;
                
                try {
                    const cleanedText = text.replace(/```json\n?|```\n?/g, '').trim();
                    return JSON.parse(cleanedText);
                } catch (parseError) {
                    console.warn('Failed to parse JSON response:', text);
                    return { result: text };
                }
            }
            
            throw new Error('No valid response from Gemini AI');
            
        } catch (error) {
            console.error('🚨 Gemini AI Error:', error);
            throw error;
        }
    }
}

// Make it globally available
window.geminiAI = new GeminiAIService();