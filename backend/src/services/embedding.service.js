const EMBEDDING_MODEL = process.env.OPENROUTER_EMBEDDING_MODEL || 'openai/text-embedding-3-small';
const EMBEDDING_DIMENSION = Number(process.env.VECTOR_DIMENSION || 1024);

async function createEmbeddings(input) {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Medical Chatbot',
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input,
            dimensions: EMBEDDING_DIMENSION,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Embedding request failed (${response.status}): ${body}`);
    }

    const payload = await response.json();
    if (!payload?.data?.length) {
        throw new Error('Embedding response missing data');
    }

    return payload.data.map((item) => item.embedding);
}

async function createEmbedding(text) {
    const [embedding] = await createEmbeddings(text);
    return embedding;
}

module.exports = { createEmbedding, createEmbeddings };
