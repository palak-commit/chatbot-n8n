const { Pinecone: PineconeClient } = require('@pinecone-database/pinecone');

let pineconeIndex = null;
const EMBEDDING_MODEL = process.env.OPENROUTER_EMBEDDING_MODEL || 'openai/text-embedding-3-small';
const EMBEDDING_DIMENSION = Number(process.env.VECTOR_DIMENSION || 1024);

async function createEmbedding(input) {
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
    if (!payload?.data?.[0]?.embedding) {
        throw new Error('Embedding response missing data');
    }

    return payload.data[0].embedding;
}

/**
 * Initialize the vector store with Pinecone
 */
async function initializeVectorStore() {
    try {
        const pinecone = new PineconeClient({
            apiKey: process.env.PINECONE_API_KEY,
        });

        pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

        console.log('[VectorDB] Pinecone store initialized successfully');
    } catch (error) {
        console.error('[VectorDB] Initialization failed:', error.message);
    }
}

/**
 * Search for relevant context based on user query
 */
async function searchContext(query) {
    if (!pineconeIndex) {
        return '';
    }

    try {
        const queryEmbedding = await createEmbedding(query);
        const results = await pineconeIndex.query({
            vector: queryEmbedding,
            topK: Number(process.env.VECTOR_SEARCH_LIMIT || 2),
            includeMetadata: true,
        });

        return (results?.matches || [])
            .map((match) => match?.metadata?.content || '')
            .filter(Boolean)
            .join('\n');
    } catch (error) {
        console.error('[VectorDB] Search failed:', error.message);
        return '';
    }
}

module.exports = {
    initializeVectorStore,
    searchContext
};
