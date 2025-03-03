const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    // Обработка CORS preflight запросов
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
        
        // Проверяем наличие API ключа
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('API key is not configured');
        }

        // Инициализация Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Настройка контекста для русского языка
        const prompt = `Ты - полезный ассистент. Отвечай на русском языке. Вопрос пользователя: ${message}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

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
        
        // Более информативные сообщения об ошибках
        let errorMessage = 'Internal Server Error';
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
                details: error.message 
            })
        };
    }
}; 
