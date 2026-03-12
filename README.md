# QA Copilot — AI-Powered Testing Assistant

QA Copilot is a premium, AI-powered assistant designed for QA engineers to automate documentation and impact analysis with a high-end "Obsidian Dark" aesthetic.

## 🚀 Features

- **Test Case Generator**: Convert requirements into structured test cases with priority, preconditions, test data, and detailed steps.
- **Bug Report Enhancer**: Transform unstructured bug descriptions into professional, structured reports.
- **Regression Impact Analyzer**: Identify impacted modules and risk areas from PR summaries or file changes.
- **AI Build Smoke Tester**: Automated health checks for web builds, capturing console and network errors.
- **Test Flow Recorder**: Visually record user actions to generate production-ready Playwright scripts.
- **Data Export**: Export test cases directly to CSV or JSON format.
- **AI Dashboard**: Track real-time productivity stats and manual time saved metrics.

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, Lucide Icons
- **Backend**: Next.js API Routes, Mongoose (MongoDB)
- **AI**: Google Gemini 2.5 Flash
- **Styling**: Premium Obsidian Dark CSS with glassmorphism components

## 🚦 Getting Started

### 1. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=your_mongodb_connection_string
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📦 Deployment

Optimized for deployment on the [Vercel Platform](https://vercel.com/new). Add your `GEMINI_API_KEY` and `MONGODB_URI` to project settings.
