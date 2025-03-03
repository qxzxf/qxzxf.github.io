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
                    text: `Ты - полезный ассистент. Пожалуйста, отвечай на русском языке. 
                    Всегда форматируй свои ответы в markdown формате, используя:
                    - Заголовки (# ## ###)
                    - Списки (- или *)
                    - Жирный текст (**) где это важно
                    - Разделяй текст на логические блоки

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
            // Добавляем переносы строк перед заголовками
            .replace(/([^#])(#{1,3}\s)/g, '$1\n\n$2')
            // Добавляем переносы после заголовков
            .replace(/(#{1,3}.*)\n(?!#|\n)/g, '$1\n\n')
            // Добавляем переносы перед списками
            .replace(/([^*\n-])(\*\s|\-\s)/g, '$1\n\n$2')
            // Добавляем переносы между элементами списка
            .replace(/(\*\s.*)\n(?!\*\s|\n|-\s)/g, '$1\n\n')
            // Добавляем переносы перед и после таблиц
            .replace(/([^|])((?:\|[^|]*)+\|)/g, '$1\n\n$2')
            .replace(/((?:\|[^|]*)+\|)([^|])/g, '$1\n\n$2')
            // Убираем множественные переносы строк (более двух)
            .replace(/\n{3,}/g, '\n\n')
            // Убираем лишние пробелы
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
