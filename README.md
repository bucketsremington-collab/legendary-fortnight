# MBA Social - Minecraft Basketball Association

A social platform for the Minecraft Basketball Association (MBA) server. Connect with players, follow teams, track stats, and stay updated on all the action.

![MBA Social Banner](https://via.placeholder.com/1200x400/E85D04/FFFFFF?text=MBA+Social)

## 🏀 Features

- **User Authentication** - Sign up, login, and manage your profile
- **Player Profiles** - View player stats, accolades, and post history
- **Team Pages** - Explore team rosters, schedules, and standings
- **Statistics Dashboard** - League-wide stats and rankings
- **Accolades System** - Championships, MVPs, and achievements
- **Social Feed** - Post updates, like, comment, and follow players
- **Game Schedule** - Upcoming games and recent results
- **Responsive Design** - Works on desktop, tablet, and mobile

## 🛠️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Deployment**: Netlify

## 📦 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- (Optional) Supabase account for backend

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mba-social.git
   cd mba-social
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Supabase credentials (or leave `VITE_DEMO_MODE=true` for demo mode):
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_DEMO_MODE=false
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:5173`

## 🗄️ Database Setup (Supabase)

### Option 1: Use Demo Mode

The app works out of the box with mock data. Just set `VITE_DEMO_MODE=true` in your `.env` file.

### Option 2: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)

2. Go to the SQL Editor and run the schema from `supabase/schema.sql`

3. Copy your project URL and anon key from Settings > API

4. Update your `.env` file with the credentials

5. (Optional) Run the seed data script to populate initial data

## 📁 Project Structure

```
mba-social/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── AccoladeCard.tsx
│   │   ├── GameCard.tsx
│   │   ├── Layout.tsx
│   │   ├── Navbar.tsx
│   │   ├── PlayerCard.tsx
│   │   ├── PostCard.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatsTable.tsx
│   │   └── TeamCard.tsx
│   ├── context/           # React context providers
│   │   └── AuthContext.tsx
│   ├── data/              # Mock data for demo mode
│   │   └── mockData.ts
│   ├── lib/               # External library configs
│   │   └── supabase.ts
│   ├── pages/             # Page components
│   │   ├── Accolades.tsx
│   │   ├── Games.tsx
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Profile.tsx
│   │   ├── Register.tsx
│   │   ├── Stats.tsx
│   │   ├── Team.tsx
│   │   └── Teams.tsx
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/             # Utility functions
│   │   └── helpers.ts
│   ├── App.tsx            # Main app component
│   ├── index.css          # Global styles
│   └── main.tsx           # App entry point
├── supabase/
│   └── schema.sql         # Database schema
├── .env.example           # Environment template
├── index.html             # HTML template
├── netlify.toml           # Netlify config
├── package.json           # Dependencies
├── tailwind.config.js     # Tailwind config
├── tsconfig.json          # TypeScript config
└── vite.config.ts         # Vite config
```

## 🚀 Deployment

### Deploy to Netlify

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect your GitHub repository
   - Configure build settings (auto-detected from `netlify.toml`)

3. **Set Environment Variables**
   - Go to Site settings > Build & deploy > Environment
   - Add your Supabase credentials:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

4. **Deploy**
   - Trigger a deploy from the Deploys tab
   - Your site will be live at `your-site.netlify.app`

### Manual Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🎨 Customization

### Colors

Edit `tailwind.config.js` to customize the color scheme:

```js
colors: {
  court: {
    orange: '#E85D04',      // Primary orange
    wood: '#8B4513',        // Wood brown
  },
  mba: {
    primary: '#E85D04',
    background: '#1A1A1A',
    surface: '#2D2D2D',
  }
}
```

### Teams

Edit `src/data/mockData.ts` to add or modify teams:

```ts
{
  id: 'team-new',
  name: 'New Team Name',
  abbreviation: 'NTN',
  primary_color: '#FF0000',
  secondary_color: '#000000',
  // ...
}
```

## 📱 Demo Users

In demo mode, you can log in as any of these users:

| Username | Role | Team |
|----------|------|------|
| BlockMaster23 | Player | Block City Blazers |
| NetherFlame | Player | Nether Knights |
| EnderTeleport | Player | Ender Dynasty |
| MBACommish | Admin | - |
| CoachCraft | Coach | Block City Blazers |

Use any password to log in during demo mode.

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📄 License

MIT License - feel free to use this project for your own MBA server!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For questions or issues, please open a GitHub issue or contact the MBA administrators.

---

Built with ❤️ for the Minecraft Basketball Association
