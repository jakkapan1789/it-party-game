import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { th } from '../i18n/th';

export default function PingPage() {
  const [connected, setConnected] = useState(false);
  const [hello, setHello] = useState('');
  const [result, setResult] = useState<{ rtt: number; offset: number } | null>(null);

  useEffect(() => {
    socket.connect();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('hello', (m) => setHello(m.message));
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('hello');
      socket.disconnect();
    };
  }, []);

  const ping = () => {
    const t0 = Date.now();
    socket.emit('ping', t0, ({ serverNow }) => {
      const t1 = Date.now();
      const rtt = t1 - t0;
      setResult({ rtt, offset: serverNow - (t0 + rtt / 2) });
    });
  };

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{th.ping.title}</h1>
      <p>{connected ? `✅ ${th.ping.connected}` : `❌ ${th.ping.disconnected}`}</p>
      {hello && <p className="text-sm">{hello}</p>}
      <button onClick={ping} className="rounded-full bg-[#6BCB3C] border-4 border-[#2B1D14] px-6 py-3 font-semibold">
        {th.ping.send}
      </button>
      {result && (
        <p className="text-sm">
          {th.ping.latency}: {result.rtt} ms · {th.ping.offset}: {result.offset.toFixed(0)} ms
        </p>
      )}
    </main>
  );
}
