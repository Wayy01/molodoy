/**
 * Seeds Molodoy with the real catalogue scraped from molodoybarbershop.md (branches, barbers,
 * services, photos) plus ~3 months of DEMO appointments so the dashboard has something to show.
 * Demo rows are flagged `demo = true`; remove them with `bun run db:clear-demo`.
 *
 *   bun run db:seed
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { sql } from "drizzle-orm";
import { TZDate } from "@date-fns/tz";
import * as s from "./schema";
import type { BarberLevel, Localized, WeeklyHours } from "./schema";

const client = postgres(process.env.DATABASE_URL!, { max: 4, prepare: false });
const db = drizzle(client, { schema: s });
const TZ = "Europe/Chisinau";

// Deterministic randomness so re-seeding gives the same dashboard.
let seed = 20261115;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
function weighted<T>(items: Array<[T, number]>) {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) {
    if ((r -= w) <= 0) return v;
  }
  return items[items.length - 1][0];
}
const L = (ro: string, ru: string): Localized => ({ ro, ru });

const LOCATIONS = [
  {
    slug: "centru",
    name: L("Centru", "Центр"),
    address: L("Strada Pușkin 35, Chișinău", "ул. Пушкина 35, Кишинёв"),
    photo: "/media/barbers/grigori.webp",
    // This branch isn't listed on Google Maps (the place id from the old site is dead), so the map pins the street address.
    mapEmbedUrl:
      "https://maps.google.com/maps?q=Strada%20Pu%C8%99kin%2035%2C%20Chi%C8%99in%C4%83u&z=17&output=embed",
  },
  {
    slug: "botanica",
    name: L("Botanica", "Ботаника"),
    address: L("Strada Nicolae Zelinski 5/1, Chișinău", "ул. Николае Зелински 5/1, Кишинёв"),
    photo: "/media/barbers/elena.webp",
    mapEmbedUrl:
      "https://maps.google.com/maps?cid=7055099052628381882&z=16&output=embed",
  },
  {
    slug: "riscani",
    name: L("Râșcani", "Рышкановка"),
    address: L("Bulevardul Moscova 1/1, Chișinău", "бул. Москова 1/1, Кишинёв"),
    photo: "/media/barbers/daniel.webp",
    mapEmbedUrl:
      "https://maps.google.com/maps?cid=2536238425001921184&z=16&output=embed",
  },
  {
    slug: "buiucani",
    name: L("Buiucani", "Буюканы"),
    address: L("Strada Alba Iulia 23/6, Chișinău", "ул. Алба Юлия 23/6, Кишинёв"),
    photo: "/media/barbers/max.webp",
    mapEmbedUrl:
      "https://maps.google.com/maps?cid=16874108229439280062&z=16&output=embed",
  },
] as const;

const BARBERS: Array<{ slug: string; name: string; level: BarberLevel; loc: string; photo: boolean }> = [
  { slug: "gioni", name: "Gioni", level: "top", loc: "centru", photo: true },
  { slug: "grigori", name: "Grigori", level: "top", loc: "centru", photo: true },
  { slug: "cristi", name: "Cristi", level: "pro", loc: "centru", photo: true },
  { slug: "evelina", name: "Evelina", level: "pro", loc: "centru", photo: true },
  { slug: "marina", name: "Marina", level: "barber", loc: "centru", photo: true },
  { slug: "nikita", name: "Nikita", level: "barber", loc: "centru", photo: true },
  { slug: "marcel", name: "Marcel", level: "top", loc: "botanica", photo: true },
  { slug: "dima", name: "Dima", level: "top", loc: "botanica", photo: true },
  { slug: "elena", name: "Elena", level: "pro", loc: "botanica", photo: true },
  { slug: "eugen", name: "Eugen", level: "pro", loc: "botanica", photo: true },
  { slug: "kolea", name: "Kolea", level: "barber", loc: "botanica", photo: true },
  { slug: "valeriu", name: "Valeriu", level: "barber", loc: "botanica", photo: true },
  { slug: "andrian", name: "Andrian", level: "top", loc: "riscani", photo: true },
  { slug: "daniel", name: "Daniel", level: "top", loc: "riscani", photo: true },
  { slug: "danik", name: "Danik", level: "top", loc: "riscani", photo: true },
  { slug: "andrei", name: "Andrei", level: "pro", loc: "riscani", photo: true },
  { slug: "colea", name: "Colea", level: "pro", loc: "riscani", photo: true },
  { slug: "socolov", name: "Socolov", level: "pro", loc: "riscani", photo: true },
  { slug: "iulyk", name: "Iulyk", level: "barber", loc: "riscani", photo: true },
  { slug: "max", name: "Max", level: "top", loc: "buiucani", photo: true },
  { slug: "danu", name: "Danu", level: "barber", loc: "buiucani", photo: false },
];

const BIO: Record<BarberLevel, Localized> = {
  top: L(
    "Barber TOP. Fade-uri curate, texturi moderne și contururi precise. Lucrează pe programare.",
    "Барбер уровня TOP. Чистые фейды, современные текстуры и точные контуры. Работает по записи.",
  ),
  pro: L(
    "Barber PRO. Tunsori clasice și moderne, barbă conturată la brici.",
    "Барбер уровня PRO. Классические и современные стрижки, борода под опасную бритву.",
  ),
  barber: L(
    "Barber Molodoy. Tunsori îngrijite la cel mai bun preț din echipă.",
    "Барбер Molodoy. Аккуратные стрижки по самой доступной цене в команде.",
  ),
};

const SERVICES = [
  {
    slug: "tunsoare",
    category: "hair" as const,
    name: L("Tunsoare bărbătească", "Мужская стрижка"),
    description: L("Consultație, spălat, tunsoare, styling.", "Консультация, мытьё, стрижка, укладка."),
    durationMin: 30,
    prices: [150, 200, 250],
  },
  {
    slug: "tunsoare-barba",
    category: "combo" as const,
    name: L("Tunsoare + barbă", "Стрижка + борода"),
    description: L("Complexul complet: tunsoare și barbă conturată.", "Полный комплекс: стрижка и оформление бороды."),
    durationMin: 60,
    prices: [250, 300, 400],
  },
  {
    slug: "tunsoare-barba-tonare",
    category: "combo" as const,
    name: L("Tunsoare + barbă + tonare", "Стрижка + борода + тонирование"),
    description: L("Complex cu tonarea bărbii pentru un contur uniform.", "Комплекс с тонированием бороды для ровного цвета."),
    durationMin: 60,
    prices: [null, null, 550],
  },
  {
    slug: "barba",
    category: "beard" as const,
    name: L("Barbă", "Борода"),
    description: L("Formă, contur la brici, prosop cald.", "Форма, контур опасной бритвой, горячее полотенце."),
    durationMin: 30,
    prices: [150, 150, 150],
  },
  {
    slug: "tonare-barba",
    category: "beard" as const,
    name: L("Tonare barbă", "Тонирование бороды"),
    description: L("Acoperă firele albe, aspect natural.", "Закрывает седину, естественный вид."),
    durationMin: 30,
    prices: [null, 150, 150],
  },
  {
    slug: "epilare-ceara",
    category: "extra" as const,
    name: L("Epilare cu ceară", "Восковая депиляция"),
    description: L("Nas, urechi sau obraji.", "Нос, уши или скулы."),
    durationMin: 30,
    prices: [50, 50, 50],
  },
  {
    slug: "sprancene",
    category: "extra" as const,
    name: L("Corectarea sprâncenelor", "Коррекция бровей"),
    description: L("Formă curată, fără să pară făcută.", "Аккуратная форма без эффекта «сделанных» бровей."),
    durationMin: 30,
    prices: [50, 50, 50],
  },
];

const FIRST_NAMES = [
  "Alexandru", "Andrei", "Ion", "Mihai", "Vlad", "Dan", "Victor", "Sergiu", "Nicolae", "Cristian", "Radu", "Eugen",
  "Vadim", "Artiom", "Maxim", "Denis", "Igor", "Dmitri", "Nichita", "Pavel", "Oleg", "Stanislav", "Roman", "Vitalie",
  "Iurie", "Gheorghe", "Petru", "Ilie", "Tudor", "Daniel", "Marcel", "Valentin", "Constantin", "Alexei", "Serghei",
  "Ruslan", "Evghenii", "Bogdan", "Mircea", "Dorin", "Liviu", "Corneliu", "Anatol", "Vasile", "Ștefan", "Leonid",
];
const LAST_NAMES = [
  "Rusu", "Ceban", "Ciobanu", "Popa", "Lungu", "Munteanu", "Rotaru", "Cojocaru", "Sârbu", "Țurcan", "Guțu", "Bivol",
  "Morari", "Melnic", "Croitoru", "Moraru", "Bodrug", "Botnari", "Ursu", "Cebotari", "Grosu", "Plămădeală", "Ivanov",
  "Petrov", "Smirnov", "Kuznețov", "Volkov", "Novac", "Sandu", "Vasilache", "Furtună", "Răileanu", "Bălan", "Prodan",
];

const DAY_OFF_PATTERNS: number[][] = [[1], [2], [3], [1, 4], [2], [3], [4], [1]];
function hoursFor(i: number): WeeklyHours {
  const off = DAY_OFF_PATTERNS[i % DAY_OFF_PATTERNS.length];
  return Array.from({ length: 7 }, (_, d) => (off.includes(d) ? null : { start: "10:00", end: "20:00" }));
}

function wall(date: Date, minutes: number) {
  return new Date(
    new TZDate(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minutes / 60), minutes % 60, 0, TZ).getTime(),
  );
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const code = () => Array.from({ length: 10 }, () => CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)]).join("");

async function main() {
  const existing = await db.select({ n: sql<number>`count(*)::int` }).from(s.locations);
  if (existing[0].n > 0 && !process.argv.includes("--force")) {
    console.log("Already seeded. Re-run with --force to wipe the molodoy schema data and seed again.");
    await client.end();
    return;
  }

  await db.execute(sql`TRUNCATE molodoy.appointments, molodoy.time_off, molodoy.media, molodoy.posts, molodoy.users,
    molodoy.clients, molodoy.barbers, molodoy.services, molodoy.locations, molodoy.settings RESTART IDENTITY CASCADE`);

  const locRows = await db
    .insert(s.locations)
    .values(
      LOCATIONS.map((l, i) => ({
        slug: l.slug,
        name: l.name,
        address: l.address,
        phone: "+37361090123",
        photo: l.photo,
        mapEmbedUrl: l.mapEmbedUrl,
        mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Molodoy Barbershop ${l.address.ro}`)}`,
        sortOrder: i,
      })),
    )
    .returning();
  const locBySlug = Object.fromEntries(locRows.map((l) => [l.slug, l]));

  const barberRows = await db
    .insert(s.barbers)
    .values(
      BARBERS.map((b, i) => ({
        slug: b.slug,
        name: b.name,
        level: b.level,
        locationId: locBySlug[b.loc].id,
        photo: b.photo ? `/media/barbers/${b.slug}.webp` : null,
        bio: BIO[b.level],
        workingHours: hoursFor(i),
        sortOrder: i,
      })),
    )
    .returning();

  const serviceRows = await db
    .insert(s.services)
    .values(
      SERVICES.map((sv, i) => ({
        slug: sv.slug,
        category: sv.category,
        name: sv.name,
        description: sv.description,
        durationMin: sv.durationMin,
        priceBarber: sv.prices[0],
        pricePro: sv.prices[1],
        priceTop: sv.prices[2],
        sortOrder: i,
      })),
    )
    .returning();

  await db.insert(s.settings).values({
    key: "site",
    value: {
      phone: "+37361090123",
      email: "",
      instagram: "",
      tiktok: "",
      facebook: "",
      bookingHorizonDays: 14,
      slotStepMin: 30,
      firstVisitDiscount: 50,
    } satisfies s.SiteSettings,
  });

  // Staff accounts
  const pw = () => Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 6)).join("-");
  const creds = [
    { email: "owner@molodoy.md", name: "Molodoy Owner", role: "owner" as const, password: pw() },
    { email: "centru@molodoy.md", name: "Manager Centru", role: "manager" as const, password: pw(), locationId: locBySlug.centru.id },
    {
      email: "gioni@molodoy.md",
      name: "Gioni",
      role: "barber" as const,
      password: pw(),
      barberId: barberRows.find((b) => b.slug === "gioni")!.id,
      locationId: locBySlug.centru.id,
    },
  ];
  const userRows = await db
    .insert(s.users)
    .values(
      await Promise.all(
        creds.map(async (c) => ({
          email: c.email,
          name: c.name,
          role: c.role,
          passwordHash: await bcrypt.hash(c.password, 11),
          locationId: "locationId" in c ? c.locationId : null,
          barberId: "barberId" in c ? c.barberId : null,
        })),
      ),
    )
    .returning();

  // Media: real barber photos from the current site + licensed stock clips (Mixkit free license)
  const reelCaptions = [
    L("Skin fade, finisaj la mașină", "Скин фейд, финиш машинкой"),
    L("Contur la ceafă", "Окантовка на затылке"),
    L("Tunsoare + barbă", "Стрижка + борода"),
    L("Barbă conturată", "Оформление бороды"),
    L("Pregătirea clientului", "Подготовка клиента"),
    L("Linii curate", "Чистые линии"),
    L("Styling final", "Финальная укладка"),
    L("Barbă pieptănată", "Расчёсанная борода"),
  ];
  const workCaptions = [
    L("Rezultatul final", "Финальный результат"),
    L("Foarfecă și pieptene", "Ножницы и расчёска"),
    L("Fade lucrat de aproape", "Фейд крупным планом"),
    L("Tunsoare + barbă", "Стрижка + борода"),
    L("Barbă la brici", "Борода под бритву"),
    L("Mașina în lucru", "Машинка в работе"),
    L("Pe scaun", "В кресле"),
    L("Contur la barbă", "Контур бороды"),
    L("Atmosfera", "Атмосфера"),
    L("Spray final", "Финальный спрей"),
  ];
  const barberBySlug = Object.fromEntries(barberRows.map((b) => [b.slug, b]));
  const dims = async (src: string) => {
    const m = await sharp(`public${src}`).metadata();
    return { width: m.width ?? null, height: m.height ?? null };
  };
  const photoRows = await Promise.all([
    ...BARBERS.filter((b) => b.photo).map(async (b, i) => ({
      kind: "photo" as const,
      src: `/media/barbers/${b.slug}.webp`,
      caption: L(`${b.name} la lucru`, `${b.name} за работой`),
      barberId: barberBySlug[b.slug].id,
      featured: ["grigori", "daniel", "danik", "elena", "gioni", "eugen"].includes(b.slug),
      sortOrder: 20 + i,
      ...(await dims(`/media/barbers/${b.slug}.webp`)),
    })),
    ...workCaptions.map(async (caption, i) => ({
      kind: "photo" as const,
      src: `/media/gallery/work-${i + 1}.webp`,
      caption,
      featured: false,
      sortOrder: 50 + i,
      ...(await dims(`/media/gallery/work-${i + 1}.webp`)),
    })),
  ]);
  await db.insert(s.media).values([
    ...reelCaptions.map((caption, i) => ({
      kind: "video" as const,
      src: `/media/reels/reel-${i + 1}.mp4`,
      poster: `/media/reels/reel-${i + 1}.webp`,
      caption,
      featured: i < 6,
      width: 540,
      height: 960,
      sortOrder: i,
    })),
    ...photoRows,
  ]);

  // Blog
  const owner = userRows.find((u) => u.role === "owner")!;
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
  await db.insert(s.posts).values([
    {
      slug: "fade-potrivit-formei-fetei",
      title: L("Cum alegi fade-ul potrivit formei feței", "Как выбрать фейд под форму лица"),
      excerpt: L(
        "Low, mid sau high? Forma feței și tipul de păr decid cât de sus pornește tranziția.",
        "Low, mid или high? Форма лица и тип волос решают, откуда начинается переход.",
      ),
      body: L(
        "Un fade bun nu începe de la mașină, ci de la oglindă. Înainte să alegi, uită-te la forma feței și la cum crește părul la ceafă.\n\n## Low fade\n\nTranziția pornește aproape de linia urechii. Merge la fețe alungite și la cei care vor un look discret, potrivit la birou.\n\n## Mid fade\n\nVarianta universală. Pornește la nivelul tâmplei și echilibrează aproape orice formă de față.\n\n## High fade\n\nContrast maxim, sus pe cap. Arată cel mai bine la fețe rotunde și la părul des, pentru că alungește vizual silueta.\n\n**Sfat:** spune-i barberului cât de des vii. Un high fade arată perfect o săptămână, un low fade rezistă trei.",
        "Хороший фейд начинается не с машинки, а с зеркала. Прежде чем выбирать, посмотрите на форму лица и на то, как растут волосы на затылке.\n\n## Low fade\n\nПереход начинается у линии ушей. Подходит вытянутым лицам и тем, кому нужен сдержанный образ для офиса.\n\n## Mid fade\n\nУниверсальный вариант. Начинается на уровне висков и уравновешивает почти любую форму лица.\n\n## High fade\n\nМаксимальный контраст, высоко на голове. Лучше всего смотрится на круглых лицах и густых волосах, визуально вытягивая силуэт.\n\n**Совет:** скажите барберу, как часто вы приходите. High fade идеален неделю, low fade держится три.",
      ),
      cover: "/media/gallery/work-3.webp",
      status: "published" as const,
      publishedAt: daysAgo(4),
      authorId: owner.id,
    },
    {
      slug: "ingrijirea-barbii",
      title: L("Îngrijirea bărbii între vizite", "Уход за бородой между визитами"),
      excerpt: L(
        "Cinci obiceiuri simple care țin barba în formă până la următoarea programare.",
        "Пять простых привычек, которые держат бороду в форме до следующей записи.",
      ),
      body: L(
        "Barba arată bine în ziua în care ieși de la noi. Restul depinde de tine.\n\n1. **Spal-o separat.** Șamponul de păr usucă pielea de sub barbă. Folosește un gel special de 2-3 ori pe săptămână.\n2. **Ulei, nu balsam, dimineața.** Câteva picături pe barba încă umedă, apoi pieptene.\n3. **Pieptene în direcția creșterii.** Așa se formează linia, nu se rupe firul.\n4. **Nu tăia conturul singur.** Linia gâtului se mută ușor. Lasă conturul pe seama barberului.\n5. **Revino la 3-4 săptămâni.** Atât durează până se pierde forma.",
        "Борода отлично выглядит в день, когда вы выходите от нас. Дальше всё зависит от вас.\n\n1. **Мойте отдельно.** Шампунь для волос сушит кожу под бородой. Используйте специальный гель 2-3 раза в неделю.\n2. **Масло утром, на влажную бороду.** Несколько капель, затем расчёска.\n3. **Расчёсывайте по росту.** Так формируется линия и не ломается волос.\n4. **Не правьте контур сами.** Линия шеи легко съезжает. Оставьте контур барберу.\n5. **Возвращайтесь раз в 3-4 недели.** Примерно столько держится форма.",
      ),
      cover: "/media/gallery/work-8.webp",
      status: "published" as const,
      publishedAt: daysAgo(12),
      authorId: owner.id,
    },
    {
      slug: "cat-de-des-sa-te-tunzi",
      title: L("Cât de des să te tunzi", "Как часто стричься"),
      excerpt: L(
        "Depinde de tunsoare. Iată intervalele cu care lucrăm noi la Molodoy.",
        "Зависит от стрижки. Вот интервалы, с которыми работаем мы в Molodoy.",
      ),
      body: L(
        "Părul crește în medie 1-1,5 cm pe lună. Pe o tunsoare scurtă, asta se vede repede.\n\n## Fade și tunsori scurte\n\nLa 2-3 săptămâni. Tranziția se estompează prima.\n\n## Lungime medie\n\nLa 4-5 săptămâni, ca să păstrezi forma fără să pierzi lungimea.\n\n## Păr lung\n\nLa 6-8 săptămâni, pentru vârfuri și formă.\n\nProgramează-te direct pentru următoarea vizită când ești încă pe scaun. Locurile la barberii TOP se ocupă cu o săptămână înainte.",
        "Волосы растут в среднем на 1-1,5 см в месяц. На короткой стрижке это заметно быстро.\n\n## Фейд и короткие стрижки\n\nРаз в 2-3 недели. Первым размывается переход.\n\n## Средняя длина\n\nРаз в 4-5 недель, чтобы сохранить форму и не потерять длину.\n\n## Длинные волосы\n\nРаз в 6-8 недель, чтобы освежить кончики и форму.\n\nЗаписывайтесь на следующий визит, пока ещё сидите в кресле. Места к барберам TOP разбирают за неделю.",
      ),
      cover: "/media/gallery/work-2.webp",
      status: "published" as const,
      publishedAt: daysAgo(26),
      authorId: owner.id,
    },
  ]);

  // ---- DEMO data: clients + appointments (90 days back, 14 days ahead) ----
  const clientCount = 900;
  const usedPhones = new Set<string>();
  const clientValues = Array.from({ length: clientCount }, () => {
    let phone: string;
    do {
      phone = `+373${pick(["60", "61", "62", "67", "68", "69", "78", "79"])}${String(Math.floor(rand() * 1e6)).padStart(6, "0")}`;
    } while (usedPhones.has(phone));
    usedPhones.add(phone);
    return { name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, phone, demo: true, createdAt: daysAgo(100) };
  });
  const clientRows = await db.insert(s.clients).values(clientValues).returning({ id: s.clients.id });
  // Regulars: each barber has a pool of loyal clients; the rest walk in once or twice.
  const regulars = new Map<number, number[]>();
  barberRows.forEach((b, i) => {
    regulars.set(
      b.id,
      clientRows.slice(i * 30, i * 30 + 30).map((c) => c.id),
    );
  });
  const casual = clientRows.slice(barberRows.length * 30).map((c) => c.id);

  const svc = Object.fromEntries(serviceRows.map((x) => [x.slug, x]));
  const priceOf = (slug: string, level: BarberLevel) => {
    const x = svc[slug];
    return level === "top" ? x.priceTop : level === "pro" ? x.pricePro : x.priceBarber;
  };

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90);
  const firstVisit = new Map<number, Date>();
  const rows: Array<typeof s.appointments.$inferInsert> = [];

  for (let d = 0; d < 104; d++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
    const progress = d / 104;
    const isWeekend = day.getDay() === 5 || day.getDay() === 6;
    for (const b of barberRows) {
      const hours = b.workingHours[day.getDay()];
      if (!hours) continue;
      const base = b.level === "top" ? 0.62 : b.level === "pro" ? 0.52 : 0.4;
      const occupancy = Math.min(0.92, base + progress * 0.12 + (isWeekend ? 0.12 : 0));
      let t = 10 * 60;
      while (t < 20 * 60) {
        if (rand() > occupancy) {
          t += 30;
          continue;
        }
        const options: Array<[string, number]> = [
          ["tunsoare", 52],
          ["tunsoare-barba", 26],
          ["barba", 10],
          ["sprancene", 3],
          ["epilare-ceara", 3],
        ];
        if (b.level === "top") options.push(["tunsoare-barba-tonare", 5]);
        if (b.level !== "barber") options.push(["tonare-barba", 3]);
        const slug = weighted(options);
        const service = svc[slug];
        if (t + service.durationMin > 20 * 60) break;
        const startsAt = wall(day, t);
        const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);
        const past = endsAt.getTime() < Date.now();
        // The walk-in pool grows over time, so "new clients" keeps ticking up like a real shop.
        const reachable = casual.slice(0, Math.max(20, Math.floor(casual.length * (0.2 + 0.8 * progress))));
        const clientId = rand() < 0.62 ? pick(regulars.get(b.id)!) : pick(reachable);
        const status = past
          ? weighted<s.AppointmentStatus>([["completed", 88], ["no_show", 4], ["cancelled", 8]])
          : weighted<s.AppointmentStatus>([["booked", 94], ["cancelled", 6]]);
        rows.push({
          code: code(),
          locationId: b.locationId,
          barberId: b.id,
          serviceId: service.id,
          clientId,
          startsAt,
          endsAt,
          price: priceOf(slug, b.level)!,
          status,
          source: weighted<"online" | "phone" | "walk_in">([["online", 58], ["phone", 27], ["walk_in", 15]]),
          demo: true,
          createdAt: new Date(startsAt.getTime() - Math.floor(rand() * 6 + 1) * 86_400_000),
        });
        if (!firstVisit.has(clientId) || firstVisit.get(clientId)! > startsAt) firstVisit.set(clientId, startsAt);
        t += service.durationMin;
      }
    }
  }

  for (let i = 0; i < rows.length; i += 1000) {
    await db.insert(s.appointments).values(rows.slice(i, i + 1000));
  }
  // A client's account is as old as their first visit, so "new clients" charts are meaningful.
  const fv = [...firstVisit.entries()];
  for (let i = 0; i < fv.length; i += 500) {
    const chunk = fv.slice(i, i + 500);
    await db.execute(sql`
      UPDATE molodoy.clients AS c SET created_at = v.first_visit
      FROM (VALUES ${sql.join(
        chunk.map(([id, at]) => sql`(${id}::int, ${at.toISOString()}::timestamptz)`),
        sql`, `,
      )}) AS v(id, first_visit)
      WHERE c.id = v.id`);
  }

  console.log(`Seeded ${locRows.length} locations, ${barberRows.length} barbers, ${serviceRows.length} services.`);
  console.log(`Demo: ${clientRows.length} clients, ${rows.length} appointments.`);
  console.log("\nStaff logins (save these, they are not stored anywhere else):");
  for (const c of creds) console.log(`  ${c.role.padEnd(8)} ${c.email.padEnd(22)} ${c.password}`);
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
