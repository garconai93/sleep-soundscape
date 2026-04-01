# 🌙 SleepSoundscape

**Personalized ambient sound generator** — mix rain, thunder, train, cafe, fire, and wind into your perfect soundscape.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3-cyan)
![Vercel](https://img.shields.io/badge/Vercel-Ready-black)

## ✨ Features

- **6 ambient sounds**: Rain, Thunder, Train, Cafe, Fire, Wind
- **Layer mixing**: Independent volume control per sound
- **Quick presets**: Sleep, Focus, Relax
- **Sleep timer**: 15min, 30min, 1h, 2h with auto-stop
- **Dark mode**: Calming, eye-friendly design
- **Mobile-friendly**: Works on all devices

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/garconai93/sleep-soundscape.git
cd sleep-soundscape

# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build

# Deploy to Vercel
npx vercel --prod
```

## 🎛️ Usage

1. **Select sounds**: Tap any sound layer to activate it
2. **Adjust volumes**: Use sliders to fine-tune each layer
3. **Choose preset**: Click Sleep/Focus/Relax for instant mix
4. **Set timer**: Click timer button → select duration
5. **Play**: Press the big play button to start your mix
6. **Sleep**: Timer auto-stops playback when it expires

## 🆕 Adding New Sounds

### Step 1: Find audio file
Use royalty-free sources like:
- [Freesound.org](https://freesound.org)
- [Pixabay Sound Effects](https://pixabay.com/sound-effects/)
- [Zapsplat](https://zapsplat.com)

### Step 2: Add to SOUNDS array

In `src/app/page.tsx`, find the `SOUNDS` array and add:

```typescript
{ id: 'ocean', name: 'Ocean', icon: '🌊', audioUrl: 'YOUR_AUDIO_URL', color: '#06b6d4' },
```

### Step 3: Update state defaults

In the `SleepSoundscape` component, update the initial `volumes` state:

```typescript
const [volumes, setVolumes] = useState<Record<string, number>>({
  rain: 0, thunder: 0, train: 0, cafe: 0, fire: 0, wind: 0,
  ocean: 0,  // Add your new sound
});
```

### Step 4: Update presets

Each preset's `volumes` object needs the new sound ID:

```typescript
{ id: 'sleep', name: 'Sleep', icon: '🌙', volumes: { rain: 70, ..., ocean: 0 } },
```

## 🔧 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Audio**: Web Audio API + HTML5 Audio
- **Hosting**: Vercel

## 📁 Project Structure

```
sleep-soundscape/
├── src/
│   └── app/
│       ├── page.tsx      # Main app component
│       ├── layout.tsx    # Root layout
│       └── globals.css   # Global styles
├── public/               # Static assets
├── tailwind.config.ts
├── package.json
└── README.md
```

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd sleep-soundscape
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

### Self-hosting

```bash
npm run build
npm start
```

## 💰 Freemium Model

| Feature | Free | Pro (€4/month) |
|---------|------|----------------|
| Sound layers | 3 max | Unlimited |
| Saved mixes | 3 presets | Unlimited |
| Cloud sync | ❌ | ✅ |
| Offline mode | ❌ | ✅ |
| Custom sounds | ❌ | ✅ |

*Pro features coming soon!*

## 📜 License

MIT License - feel free to use for personal or commercial projects.

---

Built with 💜 by [Garcon](https://github.com/garconai93)
