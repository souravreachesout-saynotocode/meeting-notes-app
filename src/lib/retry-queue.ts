interface RetryJob {
  meetingId: string;
  attempt: number;
  maxAttempts: number;
  nextRetryAt: number;
  type: "transcribe" | "summarize";
}

class RetryQueue {
  private jobs: Map<string, RetryJob> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private baseUrl: string | null = null;

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  add(meetingId: string, type: "transcribe" | "summarize", maxAttempts = 3) {
    const key = `${type}:${meetingId}`;
    const existing = this.jobs.get(key);
    const attempt = existing ? existing.attempt + 1 : 1;

    if (attempt > maxAttempts) {
      this.jobs.delete(key);
      return false;
    }

    // Exponential backoff: 10s, 30s, 90s
    const delayMs = Math.pow(3, attempt - 1) * 10 * 1000;

    this.jobs.set(key, {
      meetingId,
      attempt,
      maxAttempts,
      nextRetryAt: Date.now() + delayMs,
      type,
    });

    this.startProcessing();
    return true;
  }

  private startProcessing() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      const now = Date.now();

      for (const [key, job] of this.jobs) {
        if (now >= job.nextRetryAt) {
          this.jobs.delete(key);
          this.executeRetry(job);
        }
      }

      if (this.jobs.size === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }, 5000); // Check every 5 seconds
  }

  private async executeRetry(job: RetryJob) {
    if (!this.baseUrl) return;

    const endpoint = job.type === "transcribe" ? "/api/transcribe" : "/api/summarize";

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: job.meetingId }),
      });

      if (!res.ok) {
        // Re-add to queue for another attempt
        this.add(job.meetingId, job.type, job.maxAttempts);
      }
    } catch {
      // Network error — re-add to queue
      this.add(job.meetingId, job.type, job.maxAttempts);
    }
  }

  getStatus(): { pending: number; jobs: { meetingId: string; type: string; attempt: number; nextRetryIn: number }[] } {
    const now = Date.now();
    return {
      pending: this.jobs.size,
      jobs: Array.from(this.jobs.values()).map((j) => ({
        meetingId: j.meetingId,
        type: j.type,
        attempt: j.attempt,
        nextRetryIn: Math.max(0, Math.ceil((j.nextRetryAt - now) / 1000)),
      })),
    };
  }
}

// Singleton
export const retryQueue = new RetryQueue();
