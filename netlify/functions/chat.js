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
            },
            body: ''
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
        const anthropic = new Anthropic({
            apiKey: process.env.CLAUDE_API_KEY,
        });

        const response = await anthropic.messages.create({
            model: "claude-3-opus-20240229",
            max_tokens: 1000,
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
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: "Internal Server Error", 
                details: error.message 
            })
        };
    }
}; 
