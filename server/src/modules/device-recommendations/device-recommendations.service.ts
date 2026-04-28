import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import axios from 'axios';
import { DeviceRecommendation } from '../../models/device-recommendation.model';
import { Device } from '../../models/device.model';
import { toObjectId } from '../../common/utils/object-id.util';

@Injectable()
export class DeviceRecommendationsService {
  constructor(
    @InjectModel(DeviceRecommendation) private readonly recModel: typeof DeviceRecommendation,
    @InjectModel(Device) private readonly deviceModel: typeof Device,
  ) {}

  async findByDevice(deviceId: string) {
    return this.recModel
      .where('device_id', toObjectId(deviceId))
      .orderBy('createdAt', 'desc')
      .get();
  }

  // AI-backed generator using Gemini / Generative Language API with a safe heuristic fallback
  async generate(deviceId: string) {
    const device = await this.deviceModel.find(deviceId);
    if (!device) return [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `
You are an assistant that outputs JSON array of device recommendation objects.
Each recommendation must have: title, description, suggestedActions (array of {actionType, params}), confidence (0-1), tags (array).
Only output valid JSON. Device name: ${device.name}. Device type: ${device.type}.
Provide up to 3 recommendations focused on energy saving, reliability or UX improvements.
`;

        const url = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${apiKey}`;
        const body = {
          prompt: { text: prompt },
          maxOutputTokens: 512,
        };

        const res = await axios.post(url, body, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.status >= 200 && res.status < 300) {
          const data = res.data;
          const output = data?.candidates?.[0]?.output || data?.candidates?.[0]?.content || '';
          // Try to extract JSON from output
          const jsonStart = output.indexOf('[');
          const jsonText = jsonStart >= 0 ? output.slice(jsonStart) : output;
          const parsed = JSON.parse(jsonText);

          // Normalize and save recommendations
          const saved: any[] = [];
          for (const item of parsed.slice(0, 5)) {
            const rec = new this.recModel();
            rec.device_id = toObjectId(deviceId);
            rec.title = item.title || item.name || 'Rekomendasi';
            rec.description = item.description || item.desc || '';
            rec.suggestedActions = item.suggestedActions || item.suggested_actions || [];
            rec.confidence = typeof item.confidence === 'number' ? item.confidence : 0.6;
            rec.tags = item.tags || [];
            rec.source = 'ai';
            rec.createdAt = new Date();
            rec.active = true;
            await rec.save();
            saved.push(rec);
          }

          return saved;
        }
      } catch (err) {
        // ignore and fallback to heuristic
        console.error('Gemini generate error:', err);
      }
    }

    // Fallback heuristic
    const rec = new this.recModel();
    rec.device_id = toObjectId(deviceId);
    rec.title = `Optimalkan penggunaan ${device.name}`;
    rec.description = `Pertimbangkan untuk menjadwalkan perangkat ini saat tidak digunakan untuk menghemat energi.`;
    rec.suggestedActions = [
      { actionType: 'schedule', params: { start: '23:00', end: '06:00', state: 'off' } },
    ];
    rec.confidence = 0.7;
    rec.tags = ['energy', 'schedule'];
    rec.source = 'heuristic';
    rec.createdAt = new Date();
    rec.active = true;

    await rec.save();
    return [rec];
  }
}
