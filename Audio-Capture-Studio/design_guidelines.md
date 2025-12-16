# Design Guidelines: Radio-Style Podcast Recording Studio

## Design Approach
**System**: Custom design inspired by professional audio applications (Riverside.fm, StreamYard) combined with Material Design principles for complex interactions and real-time feedback.

**Rationale**: This is a utility-focused professional tool requiring clear visual feedback for recording states, audio levels, and participant management. The design prioritizes functionality and usability over marketing aesthetics.

## Core Design Principles
1. **Studio Professionalism**: Clean, focused interface that feels like a professional recording environment
2. **Real-time Clarity**: Instant visual feedback for all audio states and recording status
3. **Control Hierarchy**: Critical recording controls always accessible and unmistakable
4. **Participant Focus**: Clear visual representation of all connected guests and their audio states

## Typography
- **Primary Font**: Inter (via Google Fonts) - modern, highly legible for UI
- **Accent Font**: Space Mono (via Google Fonts) - monospace for timers, technical data
- **Hierarchy**:
  - Main heading: text-2xl font-semibold
  - Section headers: text-lg font-medium
  - Body text: text-base font-normal
  - Labels/metadata: text-sm font-medium
  - Technical data (time, levels): font-mono text-sm

## Layout System
**Spacing Scale**: Use Tailwind units of 2, 4, 6, and 8 for consistency
- Micro spacing: gap-2, p-2 (8px)
- Standard spacing: gap-4, p-4 (16px)
- Section spacing: gap-6, p-6 (24px)
- Major sections: gap-8, p-8 (32px)

**Grid Structure**: Dashboard-style layout with fixed header and flexible content zones

## Component Library

### Navigation & Header
- **Studio Header**: Fixed top bar (h-16) with app logo, session name, recording timer, and recording status indicator
- **Recording Status Badge**: Prominent visual indicator (LIVE/RECORDING/PAUSED) with pulsing animation when active
- **Global Controls**: Recording start/stop, pause buttons with clear iconography

### Participant Management
- **Participant Grid**: 2-4 column responsive grid displaying all connected guests
- **Participant Card**: Includes avatar/initials, name, audio level meter (vertical bar), mute status, connection quality indicator
- **Audio Waveform**: Simple real-time waveform visualization per participant showing active speaking
- **Host Badge**: Visual distinction for session host with additional controls

### Music Player Integration
- **Spotify Panel**: Sidebar or collapsible panel (w-80) with music search, currently playing track, playback controls
- **Track Display**: Album art (w-16 h-16), track name, artist, playback progress bar
- **Volume Mixer**: Dual sliders for participant audio vs. music volume balance
- **Quick Access**: Mini player view when collapsed showing current track and volume control

### Recording Controls
- **Control Panel**: Fixed bottom toolbar (h-20) with primary recording actions
- **Time Display**: Elapsed recording time in monospace font (00:00:00 format)
- **Action Buttons**: Large, clearly labeled buttons for Start Recording, Stop Recording, Pause, Download
- **Audio Input Selector**: Dropdown to select microphone/audio source

### Session Management
- **Join Link Display**: Prominent, easily copyable link with share button
- **Session Info Panel**: Shows session ID, number of participants, recording status, start time
- **Guest Waiting Room**: Queue view for guests waiting to join, with approve/deny controls for host

### Audio Visualization
- **Master Waveform**: Large horizontal waveform at bottom showing combined audio output
- **Level Meters**: VU-style meters for monitoring audio levels, with peak indicators
- **Clipping Warnings**: Red visual alerts when audio levels are too high

## Icons
Use **Heroicons** (outline and solid variants) via CDN for all interface icons:
- Microphone, speaker, music note, play/pause, stop
- Users, video camera, settings, share
- Download, trash, chevrons for navigation

## Responsive Behavior
- **Desktop (lg+)**: Full dashboard with participant grid, music panel, all controls visible
- **Tablet (md)**: 2-column participant grid, collapsible music panel
- **Mobile (sm)**: Single column, tab-based navigation between Participants/Music/Controls

## State Indicators
- **Recording**: Red accent, pulsing dot animation
- **Paused**: Yellow/amber accent, static indicator  
- **Idle**: Neutral gray state
- **Connected**: Green indicator on participant cards
- **Poor Connection**: Yellow/red warning badges
- **Speaking**: Active border/glow on participant card when audio detected

## Animations
Use sparingly and purposefully:
- Recording indicator: Subtle pulse (animate-pulse)
- Audio levels: Smooth height transitions (transition-all duration-75)
- Participant join/leave: Fade in/out (transition-opacity)
- Waveform: Real-time canvas animation (no Tailwind)

## Images
**No hero images needed** - this is a functional application dashboard, not a marketing page. Focus on clean UI with iconography and real-time data visualization.