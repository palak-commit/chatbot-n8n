const { Pinecone: PineconeClient } = require('@pinecone-database/pinecone');
const { createEmbedding } = require('./embedding.service');

let pineconeIndex = null;

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
