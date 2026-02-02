/**
 * Vision Service HTTP Server
 *
 * Exposes vision interpretation as REST API
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { VisionInterpretationService, createVisionService } from './vision-service';
import type { VisionInterpretationRequest } from '../../schemas/ui-state.schema';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize vision service
const visionProvider = (process.env.VISION_PROVIDER || 'openai') as 'openai' | 'anthropic' | 'google';
const visionService = createVisionService(visionProvider);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'vision-service',
    provider: visionProvider,
    timestamp: Date.now()
  });
});

// Main interpretation endpoint
app.post('/interpret', async (req, res) => {
  try {
    const request: VisionInterpretationRequest = req.body;

    // Validate request
    if (!request.screenshot_url || !request.viewport) {
      return res.status(400).json({
        error: 'Missing required fields: screenshot_url and viewport'
      });
    }

    console.log(`[Vision] Interpreting screenshot: ${request.screenshot_url}`);

    const result = await visionService.interpret(request);

    console.log(`[Vision] Interpretation complete in ${result.processing_time_ms}ms`);

    res.json(result);
  } catch (error: any) {
    console.error('[Vision] Error:', error);
    res.status(500).json({
      error: 'Vision interpretation failed',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Vision Service running on http://localhost:${PORT}`);
  console.log(`📡 Provider: ${visionProvider}`);

  // Check API key based on provider
  let apiKeyConfigured = false;
  if (visionProvider === 'openai') {
    apiKeyConfigured = !!process.env.OPENAI_API_KEY;
  } else if (visionProvider === 'anthropic') {
    apiKeyConfigured = !!process.env.ANTHROPIC_API_KEY;
  } else if (visionProvider === 'google') {
    apiKeyConfigured = !!process.env.GOOGLE_API_KEY;
  } else if (visionProvider === 'ollama') {
    apiKeyConfigured = true; // Ollama doesn't need an API key
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    console.log(`🖥️  Ollama URL: ${ollamaUrl}`);
  }

  console.log(`🔑 API Key configured: ${apiKeyConfigured ? 'Yes' : 'No'}`);
});
