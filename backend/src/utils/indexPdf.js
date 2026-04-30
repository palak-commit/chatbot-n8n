require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { Pinecone: PineconeClient } = require('@pinecone-database/pinecone');
const { createEmbeddings } = require('../services/embedding.service');

const UPSERT_BATCH_SIZE = 50;

/**
 * PDF ઇન્ડેક્સ કરવાની મુખ્ય ફંક્શન
 */
async function indexPDF(filePath) {
    try {
        console.log(`[Indexer] Reading PDF: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            console.error(`[Indexer] Error: File not found at ${filePath}`);
            return;
        }

        const dataBuffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: dataBuffer });
        const data = await parser.getText();
        await parser.destroy();
        const text = data.text;
        if (!text) {
            console.error('[Indexer] Error: Could not extract text from PDF');
            return;
        }

        // ટેક્સ્ટના ટુકડા (chunks) કરવા
        const chunks = text.match(/[\s\S]{1,1000}/g) || [];
        if (!chunks.length) {
            console.error('[Indexer] Error: No text chunks found');
            return;
        }

        // Pinecone સેટઅપ
        const pinecone = new PineconeClient({ apiKey: process.env.PINECONE_API_KEY });
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

        const baseName = path.basename(filePath, path.extname(filePath));

        for (let start = 0; start < chunks.length; start += UPSERT_BATCH_SIZE) {
            const batchChunks = chunks.slice(start, start + UPSERT_BATCH_SIZE);
            const batchEmbeddings = await createEmbeddings(batchChunks);

            const vectors = batchChunks.map((chunk, index) => ({
                id: `${baseName}-${start + index}`,
                values: batchEmbeddings[index],
                metadata: {
                    source: path.basename(filePath),
                    type: 'medicine_data',
                    chunkIndex: start + index,
                    content: chunk,
                },
            }));

            await pineconeIndex.upsert(vectors);
        }

        console.log(`[Indexer] Successfully indexed ${chunks.length} chunks from PDF to Pinecone`);
    } catch (error) {
        console.error('[Indexer] Error indexing PDF:', error.message);
    }
}

// CLI દ્વારા રન કરવા માટે
if (require.main === module) {
    const filePath = process.argv[2];
    if (filePath) {
        indexPDF(filePath).catch(err => console.error(err));
    } else {
        console.log('Please provide a PDF file path');
    }
}

module.exports = { indexPDF };
