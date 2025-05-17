interface AudioCache {
  [key: string]: {
    audioUrl: string;
    timestamp: number;
  };
}

class AudioCacheService {
  private cache: AudioCache = {};
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  async getAudio(text: string): Promise<string> {
    const cacheKey = this.generateCacheKey(text);
    const cached = this.cache[cacheKey];

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.audioUrl;
    }

    const audioUrl = await this.generateAudio(text);
    this.cache[cacheKey] = {
      audioUrl,
      timestamp: Date.now(),
    };

    return audioUrl;
  }

  private generateCacheKey(text: string): string {
    return text.toLowerCase().trim();
  }

  private async generateAudio(text: string): Promise<string> {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate audio');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  clearCache() {
    this.cache = {};
  }
}

export const audioCache = new AudioCacheService(); 