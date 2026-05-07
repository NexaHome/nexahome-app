import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import axios from 'axios';
import { DeviceRecommendation } from '../../models/device-recommendation.model';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { toObjectId, toObjectIds } from '../../common/utils/object-id.util';

@Injectable()
export class DeviceRecommendationsService {
  constructor(
    @InjectModel(DeviceRecommendation) private readonly recModel: typeof DeviceRecommendation,
    @InjectModel(Device) private readonly deviceModel: typeof Device,
    @InjectModel(Room) private readonly roomModel: typeof Room,
  ) {}

  async findByDevice(deviceId: string) {
    return this.recModel
      .where('device_id', toObjectId(deviceId))
      .orderBy('createdAt', 'desc')
      .get();
  }

  async findByHome(homeId: string) {
    return this.recModel
      .where('home_id', homeId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
  }

  // Generate AI recommendations based on actual IoT sensor data for the entire home
  async generateForHome(homeId: string) {
    // 1. Get all rooms in this home
    const rooms = await this.roomModel.where('home_id', toObjectId(homeId)).get();
    if (rooms.length === 0) return [];

    const roomIds = rooms.map((r) => this.toIdString(r._id)).filter((id) => id.length > 0);
    const roomMap: Record<string, string> = {};
    rooms.forEach((r) => { roomMap[this.toIdString(r._id)] = r.name; });

    // 2. Get all devices across these rooms
    const devices = await this.deviceModel.whereIn('room_id', toObjectIds(roomIds)).get();
    if (devices.length === 0) return [];

    // 3. Build sensor summary for AI prompt
    const sensorSummaries = devices
      .filter((d) => d.type === 'sensor')
      .map((d) => {
        let valObj: any = {};
        if (d.last_value) {
          try {
            valObj = typeof d.last_value === 'string' ? JSON.parse(d.last_value) : d.last_value;
          } catch {}
        }
        return {
          name: d.name,
          category: d.category || 'unknown',
          room: roomMap[this.toIdString(d.room_id)] || 'Unknown Room',
          status: d.status || 'unknown',
          value: valObj.formatted || valObj.value || '-',
          unit: valObj.unit || '',
          rawStatus: valObj.status || d.status || 'unknown',
        };
      });

    if (sensorSummaries.length === 0) return [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return this.generateHeuristicForHome(homeId, sensorSummaries);
    }

    try {
      const sensorDataText = sensorSummaries
        .map((s) => `- ${s.name} (${s.category}) di ${s.room}: status=${s.rawStatus}, nilai=${s.value} ${s.unit}`)
        .join('\n');

      const prompt = `Kamu adalah sistem cerdas (AI) penganalisis keamanan dan kenyamanan Smart Home. Berikut adalah data sensor IoT terbaru dari rumah pengguna:

DATA SENSOR SAAT INI:
${sensorDataText}

PANDUAN KONTEKS SENSOR:
- "Water" / "Air": Sensor ketinggian genangan air/Banjir. Jika nilainya menunjukkan adanya air atau status bahaya, peringatkan pengguna akan potensi BANJIR di area tersebut (Prioritas tinggi).
- "Rain" / "Hujan": Sensor cuaca hujan di luar rumah. Terkait dengan otomatisasi atap/jemuran.
- "Fire" / "Api": Sensor pendeteksi api/kebakaran darurat.
- "Gas": Sensor pendeteksi kebocoran gas berbahaya.
- "Light" / "Cahaya": Tingkat pencahayaan (Lux) untuk mengelola efisiensi lampu cerdas.

TUGAS ANDA:
Berikan 3-5 rekomendasi *insight* spesifik berdasarkan data di atas. Output WAJIB berupa JSON Array murni tanpa markdown \`\`\`json.
Setiap objek dalam JSON harus memiliki atribut:
- "title": Judul insight singkat dan menarik (Bahasa Indonesia).
- "description": Penjelasan detail 1-2 kalimat. Jika ada bahaya (seperti banjir/api), berikan instruksi langsung. Jika aman, berikan saran preventif atau efisiensi energi.
- "priority": "high" | "medium" | "low" (Gunakan "high" untuk bahaya/banjir/api/gas).
- "category": "safety" | "comfort" | "energy" | "maintenance"
- "icon": Emoji yang sesuai (contoh: 🌊 untuk banjir, 🔥 untuk api, 💨 untuk gas, 💡 untuk cahaya, ✅ untuk aman).

Pastikan format output HANYA array JSON yang valid [{}, {}].`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      };

      const res = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      if (res.status >= 200 && res.status < 300) {
        const output = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Extract JSON from response
        const jsonMatch = output.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error('No JSON array found in Gemini response:', output);
          return this.generateHeuristicForHome(homeId, sensorSummaries);
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Delete old recommendations for this home
        await this.recModel.where('home_id', homeId).delete();

        // Save new recommendations
        const saved: any[] = [];
        for (const item of parsed.slice(0, 5)) {
          const rec = new this.recModel();
          rec.device_id = toObjectId('000000000000000000000000'); // placeholder for home-level
          (rec as any).home_id = homeId;
          rec.title = item.title || 'Rekomendasi';
          rec.description = item.description || '';
          rec.suggestedActions = [];
          rec.confidence = item.priority === 'high' ? 0.9 : item.priority === 'medium' ? 0.7 : 0.5;
          rec.tags = [item.category || 'general', item.priority || 'medium'];
          rec.source = 'ai';
          rec.createdAt = new Date();
          rec.active = true;
          (rec as any).priority = item.priority || 'medium';
          (rec as any).category = item.category || 'general';
          (rec as any).icon = item.icon || '💡';
          await rec.save();
          saved.push(rec);
        }

        return saved;
      }
    } catch (err: any) {
      console.error('Gemini generate error:', err?.message || err);
    }

    // Fallback to heuristic
    return this.generateHeuristicForHome(homeId, sensorSummaries);
  }

  // Generate per-device recommendation (legacy)
  async generate(deviceId: string) {
    const device = await this.deviceModel.find(deviceId);
    if (!device) return [];
    return this.generateForHome(this.toIdString(device.room_id));
  }

  // Heuristic fallback when AI is unavailable
  private async generateHeuristicForHome(
    homeId: string,
    sensors: Array<{ name: string; category: string; room: string; status: string; rawStatus: string; value: string; unit: string }>,
  ) {
    // Delete old heuristic recommendations
    await this.recModel.where('home_id', homeId).where('source', 'heuristic').delete();

    const recommendations: any[] = [];

    for (const sensor of sensors) {
      const val = parseFloat(sensor.value) || 0;
      const st = sensor.rawStatus.toLowerCase();
      let rec: any = null;

      // Logika Penentuan Bahaya Berdasarkan Threshold Baru
      const isCritical = 
        ['danger', 'urgent', 'emergency', 'critical'].includes(st) ||
        (sensor.category === 'gas' && val > 2500) ||
        (sensor.category === 'water' && val > 4000) ||
        (sensor.category === 'fire' && (val === 0 || (val > 1 && val < 500)));

      if (isCritical) {
        rec = {
          title: `🚨 BAHAYA: ${sensor.name}`,
          description: `Terdeteksi kondisi KRITIS di ${sensor.room} (${sensor.value} ${sensor.unit}). Segera ambil tindakan pencegahan!`,
          priority: 'high',
          category: 'safety',
          icon: '🚨',
        };
      } else if (sensor.category === 'rain' && val < 300) {
        rec = {
          title: `🌧️ Hujan Lebat Terdeteksi`,
          description: `Sensor di ${sensor.room} mendeteksi hujan lebat. Pastikan jemuran dan jendela sudah aman.`,
          priority: 'medium',
          category: 'comfort',
          icon: '🌧️',
        };
      } else if (['warning', 'medium'].includes(st)) {
        rec = {
          title: `⚡ Perhatian: ${sensor.name}`,
          description: `Sensor ${sensor.name} di ${sensor.room} menunjukkan status ${sensor.rawStatus} (${sensor.value} ${sensor.unit}). Pantau secara berkala.`,
          priority: 'medium',
          category: sensor.category === 'water' ? 'maintenance' : 'comfort',
          icon: '⚡',
        };
      }

      if (rec) {
        const model = new this.recModel();
        model.device_id = toObjectId('000000000000000000000000');
        (model as any).home_id = homeId;
        model.title = rec.title;
        model.description = rec.description;
        model.suggestedActions = [];
        model.confidence = rec.priority === 'high' ? 0.9 : 0.7;
        model.tags = [rec.category, rec.priority];
        model.source = 'heuristic';
        model.createdAt = new Date();
        model.active = true;
        (model as any).priority = rec.priority;
        (model as any).category = rec.category;
        (model as any).icon = rec.icon;
        await model.save();
        recommendations.push(model);
      }
    }

    // Add a general tip if all sensors are normal
    if (recommendations.length === 0) {
      const model = new this.recModel();
      model.device_id = toObjectId('000000000000000000000000');
      (model as any).home_id = homeId;
      model.title = '✅ Semua Sensor Normal';
      model.description = 'Semua sensor dalam kondisi baik. Pastikan untuk melakukan pengecekan rutin setiap minggu.';
      model.suggestedActions = [];
      model.confidence = 1.0;
      model.tags = ['maintenance', 'low'];
      model.source = 'heuristic';
      model.createdAt = new Date();
      model.active = true;
      (model as any).priority = 'low';
      (model as any).category = 'maintenance';
      (model as any).icon = '✅';
      await model.save();
      recommendations.push(model);
    }

    return recommendations;
  }

  private toIdString(value: unknown): string {
    if (!value) return '';
    return typeof value === 'object' && 'toString' in value ? value.toString() : String(value);
  }
}
