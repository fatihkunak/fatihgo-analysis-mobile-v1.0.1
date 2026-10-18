# Fatihgo Analysis Mobile — Interface Design

## Overview
A professional YouTube video analysis tool for mobile devices. Users can analyze videos, scan niches, and generate video plans using a tab-based navigation interface.

## Screen List

1. **Video Analysis Tab** — Main analysis interface
2. **Niche Scanning Tab** — Channel discovery and filtering
3. **Video Planner Tab** — 6-phase video planning tool
4. **Settings Tab** — API key management and preferences

## Primary Content and Functionality

### Screen 1: Video Analysis
- **URL Input Field:** Paste YouTube video or Shorts link
- **Video Info Display:** Video ID, title, channel name
- **Analysis Button:** Trigger 6-phase analysis
- **Results Display:**
  - Detailed scene breakdown table (Scene, Duration, Description, Script)
  - Intensity/Progression chart
  - Video statistics (views, likes, comments, engagement rate)
- **Export Options:**
  - Download PDF report
  - Download all assets as ZIP

### Screen 2: Niche Scanning
- **Search Filters:**
  - Search term input
  - Channel age filter (dropdown: 30/90/180/365 days)
  - Min/Max subscriber range
  - Outlier threshold percentage
  - Max results limit
- **Scan Button:** Trigger niche search
- **Results Table:**
  - Channel name
  - Subscriber count
  - Channel age
  - View count
  - Engagement ratio
  - Growth score
  - Outlier status badge
  - Link to watch video

### Screen 3: Video Planner
- **Input Fields:**
  - Niche/Category input
  - Video topic input
- **Generate Button:** Create 6-phase plan
- **Plan Display:**
  - Phase breakdown cards (Declare, Assess, Isolate, Process, Build, Reveal)
  - Each card shows: phase name, time range, description, script snippet
- **Export:** Download plan as PDF

### Screen 4: Settings
- **API Key Input:**
  - YouTube Data API v3 key field (password input with toggle)
  - Save button
- **Gemini API Key (Optional):**
  - Gemini API key field
  - Save button
- **Status Messages:** Success/error feedback

## Key User Flows

### Flow 1: Analyze a Video
1. User taps "Video Analysis" tab
2. Pastes YouTube URL into input field
3. System extracts video ID and displays it
4. User taps "Analyze" button
5. Loading bar shows progress
6. Results appear: table, chart, statistics
7. User can download PDF or ZIP

### Flow 2: Scan for Niches
1. User taps "Niche Scanning" tab
2. Enters search term and adjusts filters
3. Taps "Scan" button
4. Loading indicator appears
5. Results table displays matching channels
6. User can tap video links to watch

### Flow 3: Create Video Plan
1. User taps "Video Planner" tab
2. Enters niche and topic
3. Taps "Generate Plan"
4. Plan cards appear with 6 phases
5. User can download plan as PDF

### Flow 4: Configure API Keys
1. User taps Settings tab
2. Enters YouTube API key
3. Taps "Save"
4. Success message appears
5. (Optional) Enters Gemini API key

## Color Choices

| Element | Light Mode | Dark Mode | Usage |
|---------|-----------|-----------|-------|
| Primary | #7c5cfc | #7c5cfc | Buttons, accents, active states |
| Background | #ffffff | #151718 | Screen background |
| Surface | #f5f5f5 | #1e2022 | Cards, elevated surfaces |
| Foreground | #11181c | #ecedee | Primary text |
| Muted | #687076 | #9ba1a6 | Secondary text |
| Border | #e5e7eb | #334155 | Dividers, borders |
| Success | #22c55e | #4ade80 | Success messages |
| Error | #ef4444 | #f87171 | Error messages |

## Responsive Behavior

- **Portrait Orientation:** Primary layout (9:16 aspect ratio)
- **Landscape:** Optimized table layouts with horizontal scrolling
- **Safe Areas:** Respect notch and home indicator areas
- **Tab Bar:** Always visible at bottom, 56px height + safe area insets
