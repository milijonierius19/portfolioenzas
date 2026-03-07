"use client";

import Image from "next/image";

type NameIntroProps = {
  opacity: number;
};

export default function NameIntro({ opacity }: NameIntroProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-start justify-center pt-[clamp(2.5rem,8vh,7rem)]"
      style={{
        opacity,
        transform: "translate3d(0, 0, 0)",
        willChange: "opacity"
      }}
      aria-hidden={opacity <= 0}
    >
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/elements/kasparas.svg"
          alt="Kasparas"
          width={520}
          height={120}
          className="h-auto w-[clamp(180px,22vw,420px)]"
          style={{ filter: "brightness(0) invert(1)" }}
          draggable={false}
          priority
        />
        <Image
          src="/elements/sleikus.svg"
          alt="Sleikus"
          width={520}
          height={120}
          className="h-auto w-[clamp(180px,22vw,420px)]"
          style={{ filter: "brightness(0) invert(1)" }}
          draggable={false}
        />
      </div>
    </div>
  );
}
