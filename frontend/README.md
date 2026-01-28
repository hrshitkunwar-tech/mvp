# Navigator UI - Frontend

Beautiful, modern web interface for the Navigator Procedural Intelligence Platform.

## 🎨 Features

### End-User Guidance Interface
- **Real-time Step Display**: Current step with confidence scores
- **Progress Tracking**: Visual progress bar and completion stats
- **Interactive Timeline**: All steps with status indicators
- **Helpful Hints**: Contextual tips and guidance
- **Pause/Resume**: Control guidance flow

### Admin Dashboard
- **Live Metrics**: Active executions, success rates, latency
- **Execution Monitoring**: Real-time procedure execution tracking
- **Agent Logs**: View all agent decisions and reasoning
- **Tool Logs**: Validation and tool execution history
- **Export & Filter**: Download logs and filter data

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎯 Design Philosophy

### Premium Aesthetics
- **Dark Theme**: Modern, eye-friendly dark mode
- **Glassmorphism**: Frosted glass effects with backdrop blur
- **Vibrant Colors**: Carefully curated HSL color palette
- **Smooth Animations**: Micro-interactions for better UX
- **Responsive**: Works beautifully on all screen sizes

### Component Architecture
- **Modular**: Reusable components with clear separation
- **Type-Safe**: Full TypeScript support
- **Performance**: Optimized rendering and animations
- **Accessible**: WCAG compliant with focus states

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── GuidanceInterface.tsx    # End-user guidance view
│   │   ├── GuidanceInterface.css
│   │   ├── AdminDashboard.tsx       # Admin monitoring view
│   │   └── AdminDashboard.css
│   ├── App.tsx                      # Main app with navigation
│   ├── App.css
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Design system & utilities
├── index.html
├── package.json
└── README.md
```

## 🔌 Integration with Backend

### Convex Real-Time Data (Coming Soon)
The UI is designed to work with Convex real-time subscriptions:

```typescript
// Example: Subscribe to active executions
const executions = useQuery(api.executions.getActive);

// Example: Subscribe to agent logs
const logs = useQuery(api.agent_logs.getRecent);
```

### n8n Webhook Integration
Send events to n8n workflows:

```typescript
// Example: Send screenshot event
await fetch('http://localhost:5678/webhook/navigator-screenshot-event', {
  method: 'POST',
  body: JSON.stringify(screenshotEvent)
});
```

## 🎨 Design System

### Colors
- **Primary**: Purple gradient (`hsl(260, 85%, 65%)`)
- **Secondary**: Blue (`hsl(200, 90%, 60%)`)
- **Success**: Green (`hsl(142, 76%, 56%)`)
- **Warning**: Orange (`hsl(38, 92%, 60%)`)
- **Error**: Red (`hsl(0, 84%, 65%)`)

### Typography
- **Font**: Inter (Google Fonts)
- **Monospace**: JetBrains Mono for code

### Spacing Scale
- xs: 0.25rem, sm: 0.5rem, md: 1rem, lg: 1.5rem, xl: 2rem, 2xl: 3rem, 3xl: 4rem

### Border Radius
- sm: 0.375rem, md: 0.5rem, lg: 0.75rem, xl: 1rem, 2xl: 1.5rem, full: 9999px

## 🛠️ Tech Stack

- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Vite**: Lightning-fast build tool
- **Lucide React**: Beautiful icon library
- **Convex**: Real-time database (integration ready)
- **Recharts**: Data visualization (ready for analytics)

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🎯 Next Steps

1. **Connect to Convex**: Replace mock data with real-time subscriptions
2. **Add Authentication**: User login and session management
3. **Implement Filters**: Advanced filtering for logs and executions
4. **Add Charts**: Visualize success rates and performance metrics
5. **Browser Extension**: Integrate with screenshot capture extension

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Netlify
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Docker
```bash
docker build -t navigator-ui .
docker run -p 3000:3000 navigator-ui
```

## 🎨 Customization

### Change Theme Colors
Edit `src/index.css` and modify CSS variables:

```css
:root {
  --color-primary: hsl(260, 85%, 65%);
  --color-secondary: hsl(200, 90%, 60%);
  /* ... */
}
```

### Add New Components
1. Create component in `src/components/`
2. Import in `App.tsx`
3. Add to navigation if needed

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Submit pull request

---

**Built with ❤️ for Navigator**
