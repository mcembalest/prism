import { invoke } from '@tauri-apps/api/core';

const MOONDREAM_API_KEY = (import.meta as any).env?.VITE_MOONDREAM_API_KEY || '';

export interface Point {
  x: number;
  y: number;
}

export interface QueryResult {
  answer: string;
  request_id?: string;
}

export interface PointResult {
  points: Point[];
  request_id?: string;
}

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface DetectResult {
  objects: BoundingBox[];
  request_id?: string;
}

class MoondreamService {
  constructor() {
    if (!MOONDREAM_API_KEY) {
      console.warn('Moondream API key not found. Set VITE_MOONDREAM_API_KEY in .env file');
    }
  }

  async query(imageDataUrl: string, question: string): Promise<QueryResult> {
    return await invoke<QueryResult>('moondream_query', {
      imageDataUrl,
      question,
      apiKey: MOONDREAM_API_KEY
    });
  }

  async point(imageDataUrl: string, object: string): Promise<PointResult> {
    return await invoke<PointResult>('moondream_point', {
      imageDataUrl,
      object,
      apiKey: MOONDREAM_API_KEY
    });
  }

  async detect(imageDataUrl: string, object: string): Promise<DetectResult> {
    return await invoke<DetectResult>('moondream_detect', {
      imageDataUrl,
      object,
      apiKey: MOONDREAM_API_KEY
    });
  }
}

export const moondreamService = new MoondreamService();
