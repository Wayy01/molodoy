import Image from "next/image";
import { ClipReveal } from "@/components/motion/clip-reveal";
import { cn } from "@/lib/utils";

type Photo = { id: number; src: string; alt: string };

// Five cells that tile a 6x2 grid exactly: big | wide | tall / small small.
const CELLS = [
  "col-span-2 aspect-[4/5] md:col-span-3 md:row-span-2 md:aspect-auto",
  "aspect-square md:col-span-2 md:aspect-auto",
  "row-span-2 aspect-auto md:col-start-6 md:row-span-2 md:row-start-1",
  "aspect-square md:col-start-4 md:row-start-2 md:aspect-auto",
  "col-span-2 aspect-[16/9] md:col-span-1 md:col-start-5 md:row-start-2 md:aspect-auto",
];

export function WorkBento({ photos }: { photos: Photo[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:h-[min(78vh,760px)] md:grid-cols-6 md:grid-rows-2">
      {photos.slice(0, 5).map((p, i) => (
        <ClipReveal key={p.id} delay={i * 0.06} className={cn("relative rounded-2xl bg-surface-2", CELLS[i])}>
          <div className="absolute inset-0">
            <Image
              src={p.src}
              alt={p.alt}
              fill
              sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
              className="object-cover"
            />
          </div>
        </ClipReveal>
      ))}
    </div>
  );
}
