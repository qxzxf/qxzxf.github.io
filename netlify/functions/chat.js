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

        // Используем новую версию модели
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash"
        });

        console.log('Sending request to Gemini');
        
        // Создаем промпт с инструкциями по форматированию
        const prompt = {
            contents: [{
                parts: [{
                    text: `Ты - технический эксперт. Отвечай на русском языке.
                    
                    При ответе следуй этим правилам форматирования:
                    1. Начинай с краткого вступления
                    2. Используй четкую нумерацию разделов (1., 2., 3. и т.д.)
                    3. Выделяй названия моделей и важные термины жирным шрифтом (**текст**)
                    4. Используй маркированные списки (•) для подпунктов
                    5. Добавляй пустую строку между разделами
                    6. Если есть технические характеристики, представляй их в виде списка
                    7. В конце делай краткое заключение
                    
                    Вопрос: ${message}`
                }]
            }]
        };

        // Генерируем ответ
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Улучшенное форматирование текста
        const formattedText = text
            // Добавляем переносы строк перед нумерованными заголовками
            .replace(/(\d+\.\s+[^\n]+)/g, '\n$1\n')
            // Форматируем маркированные списки
            .replace(/([^\n])(\*\s)/g, '$1\n• ')
            // Добавляем отступы между разделами
            .replace(/\n(\d+\.)/g, '\n\n$1')
            // Форматируем жирный текст
            .replace(/\*\*([^*]+)\*\*/g, '**$1**')
            // Убираем множественные переносы строк
            .replace(/\n{3,}/g, '\n\n')
            // Добавляем горизонтальные линии между основными разделами
            .replace(/\n\n(\d+\.\s+[^\n]+)\n/g, '\n\n---\n\n$1\n')
            .trim();

        console.log('Received response from Gemini');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                content: formattedText 
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
