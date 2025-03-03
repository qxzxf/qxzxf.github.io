const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    // логирование для отладки
    console.log('Starting function execution');

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            }
        };
    }

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: "Method Not Allowed" })
        };
    }

    try {
        const { message } = JSON.parse(event.body);
        console.log('Received message:', message);
        
        // Проверяем API ключ
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('API key is missing');
            throw new Error('API key is not configured');
        }
        console.log('API key is present');

        // Инициализация Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-pro",
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7
            }
        });

        console.log('Sending request to Gemini');
        
        // Создаем чат
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: "Пожалуйста, отвечай на русском языке.",
                },
                {
                    role: "model",
                    parts: "Хорошо, я буду отвечать на русском языке.",
                }
            ],
        });

        // Получаем ответ
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();
        
        console.log('Received response from Gemini');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                content: text 
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        
        let errorMessage = 'Internal Server Error';
        let errorDetails = error.message;
        let statusCode = 500;

        if (error.message.includes('API key')) {
            errorMessage = 'API Configuration Error';
            statusCode = 503;
        } else if (error.message.includes('quota')) {
            errorMessage = 'API Quota Exceeded';
            statusCode = 429;
        }

        return {
            statusCode: statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: errorMessage,
                details: errorDetails
            })
        };
    }
}; 
