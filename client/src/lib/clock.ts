import { socket } from './socket';

// offset = serverClock - localClock. Server timestamps (endsAt) are converted to local time
// with it, so the countdown matches the server's deadline even if the phone's clock is off.
let offset = 0;
let synced = false;

export const clock = {
  toLocal: (serverTs: number) => serverTs - offset,
  /** Fallback until the ping-based sync lands: trust a server timestamp we just received. */
  observe(serverNow: number) {
    if (!synced) offset = serverNow - Date.now();
  },
};

/** 5 pings, keep the lowest-RTT sample (least network noise). */
async function sync() {
  let best: { rtt: number; off: number } | null = null;
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    const res = await new Promise<{ serverNow: number } | null>((resolve) => {
      const t = setTimeout(() => resolve(null), 1500);
      socket.emit('ping', t0, (r) => (clearTimeout(t), resolve(r)));
    });
    if (!res) continue;
    const rtt = Date.now() - t0;
    if (!best || rtt < best.rtt) best = { rtt, off: res.serverNow - (t0 + rtt / 2) };
  }
  if (best) {
    offset = best.off;
    synced = true;
  }
}

socket.on('connect', () => void sync());
