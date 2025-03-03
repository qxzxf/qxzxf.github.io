const { Anthropic } = require('@anthropic-ai/sdk');

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
        if (!process.env.CLAUDE_API_KEY) {
            throw new Error('API key is not configured');
        }

        const client = new Anthropic({
            apiKey: process.env.CLAUDE_API_KEY,
        });

        const response = await client.messages.create({
            model: "claude-3-opus-20240229",
            max_tokens: 4096,
            system: "You are Claude, an AI assistant. Respond in Russian language.",
            messages: [
                {
                    role: "user",
                    content: message
                }
            ]
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                content: response.content[0].text 
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
        } else if (error.message.includes('credits')) {
            errorMessage = 'API Credit Limit Reached';
            statusCode = 402;
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
