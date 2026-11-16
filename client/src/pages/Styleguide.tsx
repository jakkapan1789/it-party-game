import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button3D, Card, CloseButton, TabButton, FloatingScore, RibbonBanner, StatBar, TimerBar, IconDock, GiftIcon, EnvelopeIcon, TrophyIcon, CountUp, fx, popIn, fadeUp, shake, staggerChildren } from '../design';
import { Mascot } from '../mascot/Mascot';
import { Avatar, AVATAR_COUNT } from '../mascot/Avatar';

export default function Styleguide() {
  const [timer, setTimer] = useState({ endsAt: Date.now() + 10000, run: 0 });
  const [floats, setFloats] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [demo, setDemo] = useState(0);

  return (
    <main className="mx-auto max-w-md space-y-6 pb-16">
      <StatBar score={2450} index={4} total={10} />

      <RibbonBanner>Styleguide</RibbonBanner>

      <section className="space-y-3 px-4">
        <IconDock
          items={[
            { icon: <GiftIcon size={72} />, label: 'ของขวัญ', badge: 3 },
            { icon: <EnvelopeIcon size={72} />, label: 'อั่งเปา' },
            { icon: <TrophyIcon size={72} />, label: 'รางวัล' },
          ]}
        />
        <div className="flex items-end justify-center gap-3 rounded-2xl bg-cream/90 p-3">
          {[24, 32, 48, 96].map((s) => <GiftIcon key={s} size={s} />)}
          <TrophyIcon size={96} />
        </div>
      </section>

      <div className="flex justify-center gap-4">
        <Mascot size={110} />
        <Mascot size={110} cheer />
      </div>

      <section className="space-y-3 px-4">
        <Card>
          <h2 className="text-xl font-semibold">การ์ดข้อความ</h2>
          <p>พื้นครีม ขอบเข้ม มุมโค้ง 12px เงาล่างทึบ ไม่เบลอ</p>
        </Card>
        <div className="-mt-3 flex gap-2 px-2">
          <TabButton active>หมวด A</TabButton>
          <TabButton tone="purple">หมวด B</TabButton>
        </div>
        <div className="flex justify-center"><CloseButton /></div>

        <Button3D block>ส่งคำตอบ</Button3D>
        <Button3D block variant="stop">กำลังรอ…</Button3D>
        <div className="flex gap-3">
          <Button3D className="flex-1" variant="orange">เลเวลอัป</Button3D>
          <Button3D className="flex-1" variant="go">ส่งคำตอบ</Button3D>
        </div>
        <Button3D block variant="alt">ปุ่มรอง</Button3D>
        <Button3D block disabled>ปิดใช้งาน</Button3D>
      </section>

      <section className="space-y-3 px-4">
        <TimerBar key={timer.run} endsAt={timer.endsAt} durationMs={10000} />
        <Button3D variant="alt" onClick={() => setTimer({ endsAt: Date.now() + 10000, run: timer.run + 1 })}>
          เริ่ม timer ใหม่
        </Button3D>
      </section>

      <section className="px-4">
        <div className="mb-2 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`card-solid grid aspect-square place-items-center text-6xl transition ${
                selected === i ? '!border-[#FFE600] shadow-[0_0_0_4px_#FFE600,0_0_24px_8px_#FFE600aa,0_6px_0_var(--color-ink)]' : ''
              }`}
            >
              {i ? '🧁' : '🐶'}
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-white">ตัวอย่างการ์ดภาพที่ถูกเลือก (ไฮไลต์เหลืองเรือง)</p>
      </section>

      <section className="relative flex h-40 flex-col items-center justify-end gap-2 px-4">
        <div className="pointer-events-none absolute bottom-16">
          {floats.map((k) => (
            <div key={k} className="absolute -translate-x-1/2">
              <FloatingScore value={850} onDone={() => setFloats((f) => f.filter((x) => x !== k))} />
            </div>
          ))}
        </div>
        <Button3D onClick={() => setFloats((f) => [...f, Date.now()])}>ได้คะแนน +850</Button3D>
      </section>

      <section className="space-y-3 px-4">
        <Card className="space-y-3">
          <h2 className="text-xl font-semibold">Motion / FX</h2>
          <p className="text-center font-display text-5xl">
            <CountUp value={count} />
          </p>
          <div className="flex gap-2">
            <Button3D className="flex-1 !text-base" onClick={() => setCount((c) => c + 850)}>+850</Button3D>
            <Button3D className="flex-1 !text-base" variant="alt" onClick={() => setCount(0)}>reset</Button3D>
          </div>
          <div className="flex gap-2">
            <Button3D className="flex-1 !text-base" variant="orange" onClick={() => fx.correct()}>fx.correct</Button3D>
            <Button3D className="flex-1 !text-base" variant="orange" onClick={() => fx.sprinkle()}>fx.sprinkle</Button3D>
            <Button3D className="flex-1 !text-base" variant="orange" onClick={() => fx.win()}>fx.win</Button3D>
          </div>
          <Button3D block variant="alt" className="!text-base" onClick={() => setDemo((d) => d + 1)}>เล่น variants ใหม่</Button3D>
          <div key={demo} className="grid grid-cols-3 gap-2 text-center">
            {(['popIn', 'fadeUp', 'shake'] as const).map((name) => (
              <motion.div
                key={name}
                variants={{ popIn, fadeUp, shake }[name]}
                initial="hidden"
                animate="show"
                className="rounded-xl border-[3px] border-ink bg-white py-3 font-semibold"
              >
                {name}
              </motion.div>
            ))}
          </div>
          <motion.ul key={`s${demo}`} variants={staggerChildren(60)} initial="hidden" animate="show" className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.li key={i} variants={popIn} className="grid aspect-square place-items-center rounded-xl border-[3px] border-ink bg-alt font-display text-2xl">
                {i + 1}
              </motion.li>
            ))}
          </motion.ul>
        </Card>
      </section>

      <section className="px-4">
        <Card>
          <h2 className="mb-2 text-xl font-semibold">Avatar {AVATAR_COUNT} แบบ</h2>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: AVATAR_COUNT }, (_, i) => (
              <Avatar key={i} id={i} size={64} />
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}
