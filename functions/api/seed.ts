// GET /api/seed → initialize database schema + insert seed posts
// Useful for first-time setup on a fresh D1 database.

import { json, error } from './_helpers'

export async function onRequestGet(context: { env: { DB: D1Database } }) {
  const { DB } = context.env

  try {
    // Create table
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT 'Anonymous',
        category TEXT NOT NULL DEFAULT 'General',
        tags TEXT DEFAULT '',
        cover_image TEXT DEFAULT '',
        published INTEGER NOT NULL DEFAULT 1,
        views INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run()

    await DB.prepare('CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug)').run()
    await DB.prepare('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)').run()
    await DB.prepare('CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category)').run()

    // Check if already seeded
    const count = await DB.prepare('SELECT COUNT(*) as cnt FROM posts').first()
    if (count && count.cnt > 0) {
      return json({ message: 'Database already has posts', count: count.cnt })
    }

    // Insert seed posts
    const seeds = [
      {
        title: 'The Art of Slow Reading in a Fast World',
        slug: 'the-art-of-slow-reading',
        excerpt: 'In an era of infinite scroll and fleeting attention, reclaiming the practice of deep, unhurried reading becomes a quiet act of rebellion.',
        content: '# The Art of Slow Reading\n\nThere was a time when reading was not a task to be completed but a place to inhabit. You would settle into a chair, the weight of a book in your hands, and time would lose its sharp edges.\n\nWe now live in an age of infinite scroll. Headlines compete for fragments of our attention. Articles are read — if they are read at all — in thirty-second bursts between notifications. We consume words like fast food: quickly, mechanically, and with little taste.\n\nBut what if we chose otherwise?\n\n## What Slow Reading Means\n\nSlow reading is not about reading at a literal pace. It is about presence. It is the decision to give a text the space it deserves — to linger on a sentence that strikes you, to re-read a paragraph because the rhythm of it pleased you, to set the book down and stare at the wall while an idea settles.\n\nIt means:\n\n- Choosing depth over breadth\n- Allowing yourself to not finish a book that does not earn your time\n- Reading with a pencil in hand, in conversation with the author\n- Letting a single essay occupy your mind for an entire afternoon\n\n## The Quiet Rebellion\n\nEvery act of slow reading is a small refusal. A refusal to let algorithms dictate what deserves your attention. A refusal to confuse skimming with understanding. A refusal to treat literature as content.\n\nThe world will not slow down for you. But you can slow down within it.',
        author: 'Elena Marsh',
        category: 'Essays',
        tags: 'reading, books, mindfulness, attention',
        cover_image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200'
      },
      {
        title: 'Building with Cloudflare Pages: A Practical Guide',
        slug: 'building-with-cloudflare-pages',
        excerpt: 'From zero to deployed in minutes. A practical walkthrough of building full-stack applications on Cloudflare\'s edge network.',
        content: '# Building with Cloudflare Pages\n\nCloudflare Pages is more than a static site host. With Pages Functions, you get the full power of the Workers runtime — meaning your blog, dashboard, or SaaS app can run entirely at the edge.\n\n## Why Cloudflare Pages?\n\n- **Global by default**: Your site lives on 300+ edge locations\n- **Functions included**: File-based routing in `/functions` gives you serverless APIs\n- **D1 database**: SQLite at the edge, with free tier generous enough for most blogs\n- **Git integration**: Push to deploy, or use wrangler CLI\n\n## The Architecture\n\nA typical Pages project looks like this:\n\n```\nproject/\n├── src/           # Frontend (React, Vue, etc.)\n├── functions/     # Backend API (Pages Functions)\n├── dist/          # Build output (auto-deployed)\n└── wrangler.jsonc # Cloudflare config\n```\n\nThe frontend builds to `dist/`, and Pages Functions in `functions/` automatically become API routes. D1 bindings give you a SQLite database that runs at the edge.\n\n## Deploying\n\nThe simplest deployment:\n\n```bash\nnpm run build\nnpx wrangler pages deploy ./dist --project-name=my-blog\n```\n\nThat\'s it. Your site is live on a `*.pages.dev` domain, globally distributed, with HTTPS included.',
        author: 'David Chen',
        category: 'Technology',
        tags: 'cloudflare, pages, workers, d1, deployment',
        cover_image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200'
      },
      {
        title: 'Morning Light: A Photo Essay',
        slug: 'morning-light-photo-essay',
        excerpt: 'The first hour of daylight transforms ordinary streets into something cinematic. A visual meditation on the quiet drama of dawn.',
        content: '# Morning Light\n\nThere is a quality to morning light that no other hour possesses. It is not yet the harsh, democratic brightness of noon. It is angled, golden, selective — choosing some surfaces and ignoring others.\n\nThe city, at six in the morning, belongs to a different population. The delivery drivers. The joggers. The people who have not slept.\n\n## The Golden Window\n\nPhotographers call it the golden hour, but that feels too precise. It is more of a golden window — fifteen, maybe twenty minutes when the light is exactly right.\n\nYou cannot plan for it. You can only be there.\n\n## What the Camera Sees\n\nThe camera, of course, lies. It compresses the light, holds it still, removes the cold from the air and the smell of bread from the bakery on the corner. But it also reveals: the texture of old paint in a way your eye passed over, the geometry of fire escapes against a pale sky.\n\nMorning light makes photographers of everyone, if only for a moment.',
        author: 'Mira Tanaka',
        category: 'Photography',
        tags: 'photography, morning, light, essay, dawn',
        cover_image: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1200'
      },
      {
        title: 'On Writing Alone',
        slug: 'on-writing-alone',
        excerpt: 'Writing is the loneliest profession, and that is exactly the point. A meditation on solitude, craft, and the strange companionship of words.',
        content: '# On Writing Alone\n\nYou sit down. The room is quiet. The cursor blinks. And for the next hour — or three, or eight — it is just you and the sentence.\n\nWriting is not a team sport. It cannot be crowdsourced, committee-approved, or optimized by a stand-up meeting. It requires what most of modern life is designed to eliminate: sustained, unbothered attention.\n\n## The Myth of Inspiration\n\nPeople who do not write often imagine it as a series of inspired moments — a muse whispering in your ear, the words flowing like water. Those who do write know the truth: most days, the words do not flow. They are dragged, one at a time, from a mind that would rather be doing almost anything else.\n\nAnd yet. You sit there. You write a bad sentence. Then a slightly less bad one. Then — sometimes, not always — a sentence that surprises you, that feels true, that makes the sitting worthwhile.\n\n## Solitude as Method\n\nThe loneliness of writing is not a side effect. It is the method. You cannot hear what a sentence wants to become while someone is talking to you.\n\nThe page demands silence. And in return, it offers something rare: the chance to find out what you actually think.\n\nThat is worth being alone for.',
        author: 'James Okafor',
        category: 'Essays',
        tags: 'writing, solitude, craft, creativity',
        cover_image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200'
      },
      {
        title: 'The Geometry of Italian Coffee Bars',
        slug: 'geometry-of-italian-coffee-bars',
        excerpt: 'Why standing at a counter in Rome feels different from sitting at a café anywhere else. A design-minded look at the Italian coffee ritual.',
        content: '# The Geometry of Italian Coffee Bars\n\nWalk into a coffee bar in Rome at eight in the morning and you will notice something immediately: no one is sitting down.\n\nEveryone is standing at the counter. They are talking — to each other, to the barista, to no one in particular. They drink their espresso in two sips, maybe three. And then they leave. The entire ritual takes four minutes.\n\n## The Counter as Stage\n\nThe counter in an Italian coffee bar is not furniture. It is a stage. It is where the entire performance happens: the order, the preparation, the exchange of pleasantries, the consumption, the departure.\n\nThe height is deliberate — just below elbow height, so you can rest your cup comfortably while standing. The surface is marble or stainless steel, cool to the touch, easy to wipe.\n\n## Standing vs. Sitting\n\nHere is the secret: sitting down changes the relationship. When you sit, coffee becomes a destination. When you stand, it is a moment — a punctuation mark in the morning, not a sentence.\n\nItalian coffee bars are designed for movement, not lingering. There are few seats, and they cost more. The message is clear: drink your coffee, have your conversation, and get on with your day.\n\nThis is not inhospitality. It is a different theory of pleasure. Pleasure as intensity, not duration.\n\nThere is wisdom in this geometry.',
        author: 'Sofia Romano',
        category: 'Culture',
        tags: 'coffee, italy, design, culture, rome',
        cover_image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=1200'
      },
      {
        title: 'Why I Switched to a Dumb Phone for a Month',
        slug: 'dumb-phone-for-a-month',
        excerpt: 'Thirty days without a smartphone. What I gained, what I lost, and what I learned about my own relationship with attention.',
        content: '# A Month Without a Smartphone\n\nI turned off my iPhone on a Tuesday and put it in a drawer. In my other hand, I held a Nokia 2780 — a flip phone that could make calls, send texts, and nothing else.\n\nI told myself it was an experiment. Thirty days. I could handle thirty days.\n\n## Week One: The Phantom Limb\n\nThe first three days were physical. My hand kept reaching for a phone that was not there. I would pat my empty pocket and feel a small jolt of panic.\n\nBy day four, I started reading the posters on the train. By day six, I noticed that the five minutes of waiting were not, in fact, unbearable. They were just five minutes.\n\n## Week Two: The Boredom\n\nWithout a phone, boredom returned. Real boredom — the kind where you stare at the wall and let your mind wander. I had forgotten what this felt like.\n\nIt turns out that boredom is not the enemy. It is the soil. Ideas grow in it.\n\n## Week Three: The Conversations\n\nPeople talked to me differently. Not because I had changed, but because I was present. No glancing at notifications. No half-listening while scrolling. Just attention, full and undivided.\n\n## Week Four: The Verdict\n\nI went back to my smartphone on day thirty-one. But I went back differently. Notifications off. No social media apps.\n\nThe experiment was not about rejecting technology. It was about remembering that I have a choice.',
        author: 'Alex Park',
        category: 'Essays',
        tags: 'smartphone, digital minimalism, attention, technology',
        cover_image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200'
      },
    ]

    for (const seed of seeds) {
      await DB.prepare(
        `INSERT INTO posts (title, slug, excerpt, content, author, category, tags, cover_image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          seed.title,
          seed.slug,
          seed.excerpt,
          seed.content,
          seed.author,
          seed.category,
          seed.tags,
          seed.cover_image
        )
        .run()
    }

    return json({ message: 'Database seeded successfully', count: seeds.length })
  } catch (err) {
    return error('Seed failed: ' + String(err), 500)
  }
}
