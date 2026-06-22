import axios from 'axios';
import { Response } from 'express';
import { env } from '../config/env';
import { QueryModel } from '../models/Query.model';
import mongoose from 'mongoose';

export const queryRAGStream = async (
  query: string,
  plantId: string,
  userId: string,
  filters: any,
  res: Response
): Promise<void> => {
  try {
    // 1. Fetch chunks and search context via Python search service
    const searchResponse = await axios.post(`${env.AI_SERVICES_URL}/query/search`, {
      query,
      plantId,
      topK: 20,
      filters,
    });

    const { chunks, scores, entities } = searchResponse.data;

    // 2. Query Python answering streaming service
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const streamResponse = await axios.post(
      `${env.AI_SERVICES_URL}/query/stream`,
      {
        query,
        chunks,
      },
      { responseType: 'stream' }
    );

    let fullAnswer = '';

    streamResponse.data.on('data', (chunk: Buffer) => {
      const dataStr = chunk.toString();
      res.write(dataStr);

      // Parse SSE chunk to accumulate the final answer for logging
      const lines = dataStr.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.substring(6));
            if (parsed.token) {
              fullAnswer += parsed.token;
            }
          } catch (err) {
            // ignore JSON parse errors on incomplete chunk boundaries
          }
        }
      }
    });

    streamResponse.data.on('end', async () => {
      try {
        // Once stream finishes, request final grounded output properties (like confidence, suggested queries)
        const finalAnswerResponse = await axios.post(`${env.AI_SERVICES_URL}/query/answer`, {
          query,
          chunks,
          conversationHistory: [],
        });

        const { confidence, suggestedQueries, sources } = finalAnswerResponse.data;

        // Save query event log to MongoDB
        const queryLog = new QueryModel({
          query,
          answer: fullAnswer || finalAnswerResponse.data.answer,
          sources: (sources || []).map((s: any) => ({
            documentId: new mongoose.Types.ObjectId(s.documentId),
            title: s.title,
            pageNumbers: s.pageNumbers || [],
            confidence: s.confidence || 1.0,
            textPreview: s.textPreview || '',
          })),
          confidence: confidence || 'Medium',
          suggestedQueries: suggestedQueries || [],
          plantId: new mongoose.Types.ObjectId(plantId),
          userId: new mongoose.Types.ObjectId(userId),
        });

        await queryLog.save();

        // Write final JSON metadata package to SSE stream
        res.write(`data: ${JSON.stringify({ event: 'done', data: queryLog })}\n\n`);
        res.end();
      } catch (err: any) {
        console.error('❌ Error saving query logs:', err.message);
        res.end();
      }
    });

    streamResponse.data.on('error', (err: any) => {
      console.error('❌ Python RAG Stream Error:', err.message);
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    });

  } catch (error: any) {
    console.error('❌ RAG Service Error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'AI service unavailable' });
  }
};

export const getQueryHistory = async (plantId: string, userId: string, page = 1, limit = 10) => {
  const query = {
    plantId: new mongoose.Types.ObjectId(plantId),
    userId: new mongoose.Types.ObjectId(userId),
  };
  const skip = (page - 1) * limit;

  const queries = await QueryModel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await QueryModel.countDocuments(query);
  return { queries, total };
};

export const getQueryDetail = async (queryId: string) => {
  return QueryModel.findById(queryId).populate('sources.documentId', 'title docType');
};
