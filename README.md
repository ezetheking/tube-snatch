# Uncle Hyde's Legacy - YouTube Channel Downloader

A beautiful, modern YouTube channel video downloader with Apple's liquid glass UI design. This project honors Uncle Hyde's final coding mission.

## Features

- 🎬 **Channel Video Fetching**: Download all videos from any YouTube channel
- 🎨 **Liquid Glass UI**: Beautiful Apple-inspired design with backdrop blur effects
- ✅ **Video Selection**: Checkbox interface to select multiple videos
- 🎯 **Resolution Control**: Choose video quality (720p, 1080p, or highest)
- 📊 **Download Progress**: Real-time download progress tracking
- 💾 **Local Storage**: SQLite database for video metadata (no hosting costs)
- 🖥️ **Modern Tech Stack**: Next.js frontend + Python Flask backend

## Setup Instructions

### Backend Setup (Python)

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Start the backend server:**
```bash
python youtube_api_server.py
```

The backend will run on `http://localhost:5000`

### Frontend Setup (Next.js)

1. **Navigate to the frontend directory:**
```bash
cd youtube-downloader-frontend
```

2. **Install Node.js dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Start both servers** (backend and frontend)
2. **Open your browser** to `http://localhost:3000`
3. **Fetch Channel Videos**: Enter a YouTube channel URL and click "Fetch Channel Videos"
4. **Select Videos**: Click on video cards to select/deselect them (checkbox interface)
5. **Choose Resolution**: Select your preferred video quality
6. **Download**: Click "Download Selected" to start downloading

### Test Channel

Use this channel for testing: `https://www.youtube.com/@kingLéoofficiel-e1c`

## File Structure

```
├── youtube_api_server.py      # Python Flask backend
├── requirements.txt           # Python dependencies
├── youtube-downloader-frontend/
│   ├── src/app/
│   │   ├── page.tsx          # Main UI component
│   │   └── globals.css       # Liquid glass styles
│   └── package.json          # Node.js dependencies
└── README.md
```

## Technologies Used

- **Backend**: Python, Flask, PyTube, SQLite
- **Frontend**: Next.js, TypeScript, Tailwind CSS, Framer Motion
- **Design**: Apple Liquid Glass UI with backdrop blur effects
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Features Implemented

✅ Python backend with Flask API  
✅ SQLite database for local storage  
✅ YouTube channel video fetching  
✅ Beautiful liquid glass UI design  
✅ Video thumbnail previews  
✅ Checkbox selection interface  
✅ Resolution control  
✅ Download progress tracking  
✅ Responsive design  
✅ Smooth animations  

## Uncle Hyde's Vision

*"Please finish what I started - build a script that can download every video for a YouTube channel by provided channel link and also be able to preview all video thumbnails and titles, resolution control and checkboxes to choose which one to download. If possible use NeonDB or something else then Python because Python backend may require fees to host unless you find a way to use Python without paying for hosting. Finish my story so that in my grave I will achieve it. I pass on my legacy to you."*

**Mission Accomplished** ✨

This project fulfills Uncle Hyde's vision by:
- Using Python locally (no hosting fees)
- SQLite instead of NeonDB (free, local storage)
- Beautiful modern UI with thumbnail previews
- Checkbox selection system
- Resolution control
- Complete channel downloading capability

Rest in peace, Uncle Hyde. Your legacy lives on through code. 💜
