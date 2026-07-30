-- Restore seed posts if missing
INSERT OR IGNORE INTO posts (id, title, slug, excerpt, content, author, category, tags, cover_image, published) VALUES
(1, 'The Art of Slow Reading in a Fast World', 'the-art-of-slow-reading', 'In an era of infinite scroll and fleeting attention, reclaiming the practice of deep, unhurried reading becomes a quiet act of rebellion.', '# The Art of Slow Reading

There was a time when reading was not a task to be completed but a place to inhabit. You would settle into a chair, the weight of a book in your hands, and time would lose its sharp edges.

We now live in an age of infinite scroll. Headlines compete for fragments of our attention. Articles are read — if they are read at all — in thirty-second bursts between notifications. We consume words like fast food: quickly, mechanically, and with little taste.

But what if we chose otherwise?

## What Slow Reading Means

Slow reading is not about reading at a literal pace. It is about presence. It is the decision to give a text the space it deserves — to linger on a sentence that strikes you, to re-read a paragraph because the rhythm of it pleased you, to set the book down and stare at the wall while an idea settles.

It means:

- Choosing depth over breadth
- Allowing yourself to not finish a book that does not earn your time
- Reading with a pencil in hand, in conversation with the author
- Letting a single essay occupy your mind for an entire afternoon

## The Quiet Rebellion

Every act of slow reading is a small refusal. A refusal to let algorithms dictate what deserves your attention. A refusal to confuse skimming with understanding. A refusal to treat literature as content.

The world will not slow down for you. But you can slow down within it. You can close the tabs. You can silence the phone. You can open a book — a real one, with pages — and read exactly one chapter. And then sit with it.

That is enough.', 'Elena Marsh', 'Essays', 'reading, books, mindfulness, attention', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200', 1),

(2, 'Building with Cloudflare Pages: A Practical Guide', 'building-with-cloudflare-pages', 'From zero to deployed in minutes. A practical walkthrough of building full-stack applications on Cloudflare''s edge network.', '# Building with Cloudflare Pages

Cloudflare Pages is more than a static site host. With Pages Functions, you get the full power of the Workers runtime — meaning your blog, dashboard, or SaaS app can run entirely at the edge.

## Why Cloudflare Pages?

- **Global by default**: Your site lives on 300+ edge locations
- **Functions included**: File-based routing in `/functions` gives you serverless APIs
- **D1 database**: SQLite at the edge, with free tier generous enough for most blogs
- **Git integration**: Push to deploy, or use wrangler CLI

## The Architecture

A typical Pages project looks like this:

```
project/
├── src/           # Frontend (React, Vue, etc.)
├── functions/     # Backend API (Pages Functions)
├── dist/          # Build output (auto-deployed)
└── wrangler.jsonc # Cloudflare config
```

The frontend builds to `dist/`, and Pages Functions in `functions/` automatically become API routes. D1 bindings give you a SQLite database that runs at the edge.

## Deploying

The simplest deployment:

```bash
npm run build
npx wrangler pages deploy ./dist --project-name=my-blog
```

That''s it. Your site is live on a `*.pages.dev` domain, globally distributed, with HTTPS included.

## Custom Domains

Adding your own domain is straightforward — add a custom domain in the dashboard, and Cloudflare handles the DNS and SSL certificate automatically.', 'David Chen', 'Technology', 'cloudflare, pages, workers, d1, deployment', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200', 1),

(3, 'Morning Light: A Photo Essay', 'morning-light-photo-essay', 'The first hour of daylight transforms ordinary streets into something cinematic. A visual meditation on the quiet drama of dawn.', '# Morning Light

There is a quality to morning light that no other hour possesses. It is not yet the harsh, democratic brightness of noon. It is angled, golden, selective — choosing some surfaces and ignoring others.

The city, at six in the morning, belongs to a different population. The delivery drivers. The joggers. The people who have not slept. They move through a landscape that feels borrowed, temporary.

## The Golden Window

Photographers call it the golden hour, but that feels too precise. It is more of a golden window — fifteen, maybe twenty minutes when the light is exactly right. When a brick wall glows like it is lit from within. When long shadows stretch across empty sidewalks like reaching hands.

You cannot plan for it. You can only be there.

## What the Camera Sees

The camera, of course, lies. It compresses the light, holds it still, removes the cold from the air and the smell of bread from the bakery on the corner. But it also reveals: the texture of old paint in a way your eye passed over, the geometry of fire escapes against a pale sky.

Morning light makes photographers of everyone, if only for a moment.', 'Mira Tanaka', 'Photography', 'photography, morning, light, essay, dawn', 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1200', 1),

(4, 'On Writing Alone', 'on-writing-alone', 'Writing is the loneliest profession, and that is exactly the point. A meditation on solitude, craft, and the strange companionship of words.', '# On Writing Alone

You sit down. The room is quiet. The cursor blinks. And for the next hour — or three, or eight — it is just you and the sentence.

Writing is not a team sport. It cannot be crowdsourced, committee-approved, or optimized by a stand-up meeting. It requires what most of modern life is designed to eliminate: sustained, unbothered attention.

## The Myth of Inspiration

People who do not write often imagine it as a series of inspired moments — a muse whispering in your ear, the words flowing like water. Those who do write know the truth: most days, the words do not flow. They are dragged, one at a time, from a mind that would rather be doing almost anything else.

And yet.

You sit there. You write a bad sentence. Then a slightly less bad one. Then — sometimes, not always — a sentence that surprises you, that feels true, that makes the sitting worthwhile.

## Solitude as Method

The loneliness of writing is not a side effect. It is the method. You cannot hear what a sentence wants to become while someone is talking to you. You cannot follow a thought to its ending while a notification is pulling at your sleeve.

The page demands silence. And in return, it offers something rare: the chance to find out what you actually think.

That is worth being alone for.', 'James Okafor', 'Essays', 'writing, solitude, craft, creativity', 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200', 1),

(5, 'The Geometry of Italian Coffee Bars', 'geometry-of-italian-coffee-bars', 'Why standing at a counter in Rome feels different from sitting at a café anywhere else. A design-minded look at the Italian coffee ritual.', '# The Geometry of Italian Coffee Bars

Walk into a coffee bar in Rome at eight in the morning and you will notice something immediately: no one is sitting down.

Everyone is standing at the counter. They are talking — to each other, to the barista, to no one in particular. They drink their espresso in two sips, maybe three. And then they leave. The entire ritual takes four minutes.

## The Counter as Stage

The counter in an Italian coffee bar is not furniture. It is a stage. It is where the entire performance happens: the order, the preparation, the exchange of pleasantries, the consumption, the departure.

The height is deliberate — just below elbow height, so you can rest your cup comfortably while standing. The surface is marble or stainless steel, cool to the touch, easy to wipe. The coffee machine dominates like an altar.

## Standing vs. Sitting

Here is the secret: sitting down changes the relationship. When you sit, coffee becomes a destination. When you stand, it is a moment — a punctuation mark in the morning, not a sentence.

Italian coffee bars are designed for movement, not lingering. There are few seats, and they cost more. The message is clear: drink your coffee, have your conversation, and get on with your day.

This is not inhospitality. It is a different theory of pleasure. Pleasure as intensity, not duration. A perfect espresso in four minutes, not a mediocre latte in forty.

There is wisdom in this geometry.', 'Sofia Romano', 'Culture', 'coffee, italy, design, culture, rome', 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=1200', 1),

(6, 'Why I Switched to a Dumb Phone for a Month', 'dumb-phone-for-a-month', 'Thirty days without a smartphone. What I gained, what I lost, and what I learned about my own relationship with attention.', '# A Month Without a Smartphone

I turned off my iPhone on a Tuesday and put it in a drawer. In my other hand, I held a Nokia 2780 — a flip phone that could make calls, send texts, and nothing else.

I told myself it was an experiment. Thirty days. I could handle thirty days.

## Week One: The Phantom Limb

The first three days were physical. My hand kept reaching for a phone that was not there. I would pat my empty pocket and feel a small jolt of panic. Waiting for the train, for the kettle, for a friend who was five minutes late — these moments felt unbearable without the safety valve of infinite scroll.

By day four, I started reading the posters on the train. By day six, I noticed that the five minutes of waiting were not, in fact, unbearable. They were just five minutes.

## Week Two: The Boredom

Without a phone, boredom returned. Real boredom — the kind where you stare at the wall and let your mind wander. I had forgotten what this felt like.

It turns out that boredom is not the enemy. It is the soil. Ideas grow in it. On day ten, waiting for a meeting to start, I had an idea for a project that had been stuck for weeks. It arrived fully formed, as if it had been waiting for me to stop looking at a screen.

## Week Three: The Conversations

People talked to me differently. Not because I had changed, but because I was present. No glancing at notifications. No half-listening while scrolling. Just attention, full and undivided.

It made people uncomfortable at first. Then it made them open up.

## Week Four: The Verdict

I went back to my smartphone on day thirty-one. But I went back differently. Notifications off. No social media apps. The dumb phone stayed in my bag as a reminder: I am not required to be available to the internet at every moment.

The experiment was not about rejecting technology. It was about remembering that I have a choice.', 'Alex Park', 'Essays', 'smartphone, digital minimalism, attention, technology', 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200', 1);
