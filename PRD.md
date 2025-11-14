# Planning Guide

A playful, kid-friendly tower defense game where children place cute defenders to stop colorful monsters from reaching their base.

**Experience Qualities**: 
1. **Playful** - The game should feel fun and whimsical with bright colors and friendly characters that invite exploration
2. **Accessible** - Simple mechanics that a 7-year-old can understand within seconds, with clear visual feedback
3. **Rewarding** - Every action should provide immediate, satisfying feedback that encourages continued play

**Complexity Level**: Light Application (multiple features with basic state)
  - Single-purpose game with multiple interactive systems (placing towers, monster waves, scoring), lightweight state management for game progression, and simple restart mechanics

## Essential Features

### Monster Wave System
- **Functionality**: Spawns cute monsters that follow a simple path toward the player's base
- **Purpose**: Creates the core challenge and urgency that drives gameplay
- **Trigger**: Automatically begins when player clicks "Start Game"
- **Progression**: Wave starts → Monsters spawn at intervals → Monsters move along path → Reach end or get defeated → Next wave begins
- **Success criteria**: Monsters move smoothly, spawn at increasing difficulty, and clearly show when they're defeated

### Tower Placement System
- **Functionality**: Players click/tap grid cells to place defender towers that automatically attack nearby monsters
- **Purpose**: Gives players agency and strategic choices in how they defend
- **Trigger**: Player clicks on empty grid cell when they have enough coins
- **Progression**: Click cell → Tower preview appears → Confirm placement → Tower animates in → Begins attacking monsters in range
- **Success criteria**: Placement feels instant, tower range is visually clear, attacks are satisfying to watch

### Resource & Scoring System
- **Functionality**: Players earn coins for defeating monsters and spend coins to place towers; score tracks overall performance
- **Purpose**: Creates a risk/reward economy and progression feedback
- **Trigger**: Monster defeated or tower purchased
- **Progression**: Defeat monster → Coin reward → Display coin gain animation → Update wallet → Enable/disable tower buttons
- **Success criteria**: Coin balance always visible, costs are clear, rewards feel generous enough to maintain fun

### Health & Game Over System
- **Functionality**: Player has limited hearts that decrease when monsters reach the base; game ends at zero hearts
- **Purpose**: Creates stakes and natural game sessions with clear win/loss conditions
- **Trigger**: Monster reaches end of path or hearts reach zero
- **Progression**: Monster reaches base → Heart lost with animation → Check remaining hearts → Continue or trigger game over screen
- **Success criteria**: Health is always prominently displayed, damage feedback is clear, game over state offers immediate restart

## Edge Case Handling

- **Rapid Clicking**: Debounce tower placement to prevent accidental double-purchases
- **Empty Coin Purse**: Disable tower buttons and show visual feedback when player can't afford towers
- **Path Blocking**: Allow placement anywhere but ensure monsters can still complete their path
- **Monster Pile-up**: Monsters slightly offset positions to remain individually visible even when grouped
- **Mid-Wave Restart**: Pause and reset all game state cleanly when player restarts during active play

## Design Direction

The design should feel playful, colorful, and encouraging—like a Saturday morning cartoon—with a clean, uncluttered interface that puts the game board front and center. A minimal interface serves the fast-paced action better than rich decoration.

## Color Selection

Triadic color scheme creating a vibrant, energetic feel perfect for a kids' game with clear visual hierarchy between UI, game elements, and feedback.

- **Primary Color**: Bright Purple (oklch(0.65 0.25 300)) - Represents the player's team/towers, feels magical and fun
- **Secondary Colors**: Sunny Orange (oklch(0.75 0.18 60)) for monsters creating friendly contrast; Sky Blue (oklch(0.70 0.15 240)) for UI elements and water/background
- **Accent Color**: Lime Green (oklch(0.80 0.20 130)) for positive feedback (coins earned, successful hits, health)
- **Foreground/Background Pairings**:
  - Background (Light Cream oklch(0.97 0.02 90)): Dark text (oklch(0.25 0.05 300)) - Ratio 13.2:1 ✓
  - Card/Game Board (White oklch(0.99 0 0)): Dark text (oklch(0.25 0.05 300)) - Ratio 14.5:1 ✓
  - Primary Purple (oklch(0.65 0.25 300)): White text (oklch(0.99 0 0)) - Ratio 6.8:1 ✓
  - Accent Green (oklch(0.80 0.20 130)): Dark text (oklch(0.25 0.05 300)) - Ratio 12.1:1 ✓
  - Monster Orange (oklch(0.75 0.18 60)): White text (oklch(0.99 0 0)) - Ratio 5.2:1 ✓

## Font Selection

The typeface should be rounded, friendly, and highly legible—something that feels fun but never gimmicky, with generous sizing for young readers.

- **Typographic Hierarchy**: 
  - H1 (Game Title): Fredoka Bold/48px/tight tracking - playful but readable main title
  - H2 (UI Headers): Fredoka SemiBold/24px/normal tracking - section labels like "Defenders"
  - Body (Stats/Labels): Inter Medium/16px/relaxed tracking - coin counts, scores, instructions
  - Button Text: Fredoka Medium/18px/normal tracking - clear action labels
  - Large Numbers (Score/Coins): Fredoka Bold/32px/tight tracking - emphasizes important game data

## Animations

Animations should be snappy and responsive—always reinforcing player actions—with occasional delightful moments (like coins bouncing) that don't slow down gameplay.

- **Purposeful Meaning**: Quick, bouncy animations communicate the playful, energetic personality while ensuring every action feels immediately responsive
- **Hierarchy of Movement**: 
  1. Tower attacks and monster defeats (most important feedback)
  2. Coin collection and UI updates (reward feedback)
  3. Monster movement (continuous background motion)
  4. Subtle button hover states (least important)

## Component Selection

- **Components**: 
  - Card for game board container and stats panels
  - Button for tower placement, start/pause/restart with primary/secondary variants
  - Badge for displaying coins, score, and wave numbers
  - Progress bar for monster health bars
  - Alert for game over/victory messages with clear restart option
  - Separator to divide game area from controls
- **Customizations**: 
  - Custom game grid component using CSS Grid
  - Custom monster and tower sprites using colored divs with emoji or simple SVG shapes
  - Animated projectile elements for tower attacks
  - Heart icons for health display using Phosphor icons
- **States**: 
  - Buttons disabled state when coins insufficient (grayed out, not clickable)
  - Hover state on grid cells showing placement preview with range indicator
  - Active state on selected tower type
  - Pulsing animation on critical health (1-2 hearts remaining)
- **Icon Selection**: 
  - Heart (filled/empty) for health system
  - Coin for currency
  - Play/Pause for game controls
  - ArrowClockwise for restart
  - Lightning/Crosshair for tower types
- **Spacing**: 
  - Game board: p-6 for comfortable frame around play area
  - Control panels: p-4 with gap-4 between sections
  - Grid cells: gap-2 for clear separation
  - Buttons: px-6 py-3 for easy clicking
- **Mobile**: 
  - Stack control panels below game board on small screens
  - Maintain minimum 44px touch targets for all interactive elements
  - Reduce grid cell size proportionally on smaller viewports
  - Single column layout on mobile with game board taking 80% viewport height
