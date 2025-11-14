import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Heart, Coin, Play, Pause, ArrowClockwise, Lightning, Crosshair, Shield, Fire, Snowflake, CloudRain, Bomb, Skull, Sword, Target, Crown } from '@phosphor-icons/react'
import { toast } from 'sonner'

type Position = { x: number; y: number }
type MonsterType = 'normal' | 'fast' | 'tank' | 'boss' | 'flying' | 'armored' | 'swarm'
type Monster = {
  id: string
  position: Position
  health: number
  maxHealth: number
  speed: number
  pathIndex: number
  reward: number
  type: MonsterType
  emoji: string
  color: string
  armor?: number
  isBoss?: boolean
}
type Tower = {
  id: string
  position: Position
  type: 'fast' | 'strong' | 'area' | 'sniper' | 'freeze' | 'bomb'
  lastShot: number
  target: string | null
}
type Projectile = {
  id: string
  start: Position
  target: Position
  towerId: string
  damage: number
  type?: string
}
type GameState = 'menu' | 'playing' | 'paused' | 'gameOver' | 'leaderboard' | 'mapSelect'
type WeatherType = 'clear' | 'storm' | 'snow' | 'volcano' | 'rain'
type LeaderboardEntry = {
  score: number
  wave: number
  timestamp: number
  mapName: string
}
type MapConfig = {
  name: string
  emoji: string
  gridSize: number
  path: Position[]
  description: string
  difficulty: string
}

const MAPS: Record<string, MapConfig> = {
  forest: {
    name: 'Forest Trail',
    emoji: '🌲',
    gridSize: 10,
    description: 'A winding path through the enchanted forest',
    difficulty: 'Easy',
    path: [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
      { x: 2, y: 4 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 8, y: 6 },
      { x: 9, y: 6 },
    ],
  },
  desert: {
    name: 'Desert Dunes',
    emoji: '🏜️',
    gridSize: 12,
    description: 'Navigate the scorching desert sands',
    difficulty: 'Medium',
    path: [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 6, y: 7 },
      { x: 7, y: 7 },
      { x: 8, y: 7 },
      { x: 9, y: 7 },
      { x: 9, y: 8 },
      { x: 10, y: 8 },
      { x: 11, y: 8 },
    ],
  },
  mountain: {
    name: 'Mountain Pass',
    emoji: '⛰️',
    gridSize: 14,
    description: 'Defend the treacherous mountain path',
    difficulty: 'Hard',
    path: [
      { x: 0, y: 7 },
      { x: 1, y: 7 },
      { x: 2, y: 7 },
      { x: 2, y: 6 },
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 4 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 7, y: 3 },
      { x: 8, y: 3 },
      { x: 8, y: 4 },
      { x: 8, y: 5 },
      { x: 9, y: 5 },
      { x: 10, y: 5 },
      { x: 10, y: 6 },
      { x: 10, y: 7 },
      { x: 11, y: 7 },
      { x: 12, y: 7 },
      { x: 13, y: 7 },
    ],
  },
  volcano: {
    name: 'Volcanic Crater',
    emoji: '🌋',
    gridSize: 12,
    description: 'Brave the molten lava flows',
    difficulty: 'Expert',
    path: [
      { x: 0, y: 6 },
      { x: 1, y: 6 },
      { x: 2, y: 6 },
      { x: 3, y: 6 },
      { x: 4, y: 6 },
      { x: 4, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 7, y: 4 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 7, y: 7 },
      { x: 8, y: 7 },
      { x: 9, y: 7 },
      { x: 10, y: 7 },
      { x: 11, y: 7 },
    ],
  },
}

const CELL_SIZE = 50

const MONSTER_TYPES = {
  normal: { emoji: '👾', color: 'oklch(0.75 0.18 60)', healthMult: 1, speedMult: 1, rewardMult: 1, armorMult: 0 },
  fast: { emoji: '🐰', color: 'oklch(0.70 0.20 180)', healthMult: 0.6, speedMult: 1.8, rewardMult: 1.2, armorMult: 0 },
  tank: { emoji: '🦏', color: 'oklch(0.65 0.15 280)', healthMult: 2.5, speedMult: 0.6, rewardMult: 1.5, armorMult: 0 },
  boss: { emoji: '👹', color: 'oklch(0.55 0.25 20)', healthMult: 10, speedMult: 0.3, rewardMult: 5, armorMult: 0.4 },
  flying: { emoji: '🦅', color: 'oklch(0.72 0.16 220)', healthMult: 0.8, speedMult: 1.5, rewardMult: 1.4, armorMult: 0 },
  armored: { emoji: '🛡️', color: 'oklch(0.60 0.12 260)', healthMult: 1.8, speedMult: 0.8, rewardMult: 2, armorMult: 0.3 },
  swarm: { emoji: '🐜', color: 'oklch(0.68 0.18 30)', healthMult: 0.4, speedMult: 1.4, rewardMult: 0.8, armorMult: 0 },
}

const TOWER_TYPES = {
  fast: { cost: 50, damage: 10, range: 1.5, fireRate: 500, color: 'oklch(0.75 0.20 180)', icon: Lightning, name: 'Zapper', desc: 'Rapid fire' },
  strong: { cost: 100, damage: 40, range: 2, fireRate: 1500, color: 'oklch(0.70 0.25 20)', icon: Crosshair, name: 'Blaster', desc: 'High damage' },
  area: { cost: 150, damage: 15, range: 2.5, fireRate: 1000, color: 'oklch(0.65 0.25 300)', icon: Shield, name: 'Guardian', desc: 'Area damage' },
  sniper: { cost: 200, damage: 100, range: 4, fireRate: 2500, color: 'oklch(0.68 0.22 340)', icon: Target, name: 'Sniper', desc: 'Long range' },
  freeze: { cost: 120, damage: 5, range: 2, fireRate: 800, color: 'oklch(0.72 0.18 240)', icon: Snowflake, name: 'Freezer', desc: 'Slows enemies' },
  bomb: { cost: 250, damage: 80, range: 2, fireRate: 3000, color: 'oklch(0.62 0.24 40)', icon: Bomb, name: 'Bomber', desc: 'Explosive' },
}

const WEATHER_EFFECTS = {
  clear: { emoji: '☀️', name: 'Clear', speedMult: 1, color: 'oklch(0.95 0.05 90)' },
  storm: { emoji: '⚡', name: 'Storm', speedMult: 0.85, color: 'oklch(0.70 0.08 260)' },
  snow: { emoji: '❄️', name: 'Snow', speedMult: 0.7, color: 'oklch(0.88 0.03 240)' },
  volcano: { emoji: '🌋', name: 'Volcano', speedMult: 1.2, color: 'oklch(0.72 0.15 30)' },
  rain: { emoji: '🌧️', name: 'Rain', speedMult: 0.9, color: 'oklch(0.82 0.06 220)' },
}

function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [selectedMap, setSelectedMap] = useState<string>('forest')
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [towers, setTowers] = useState<Tower[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [health, setHealth] = useState(10)
  const [coins, setCoins] = useState(200)
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  const [monstersSpawnedThisWave, setMonstersSpawnedThisWave] = useState(0)
  const [selectedTowerType, setSelectedTowerType] = useState<keyof typeof TOWER_TYPES | null>(null)
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null)
  const [weather, setWeather] = useState<WeatherType>('clear')
  const [nextWeatherChange, setNextWeatherChange] = useState(3)
  const [bossSpawned, setBossSpawned] = useState(false)
  const [bossDefeated, setBossDefeated] = useState(false)
  const [leaderboard, setLeaderboard] = useKV<LeaderboardEntry[]>('monster-defenders-leaderboard', [])

  const currentMap = MAPS[selectedMap]
  const PATH = currentMap.path
  const GRID_SIZE = currentMap.gridSize

  const isPathCell = (x: number, y: number) => PATH.some(p => p.x === x && p.y === y)
  const hasTower = (x: number, y: number) => towers.some(t => t.position.x === x && t.position.y === y)

  const distance = (p1: Position, p2: Position) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))

  const getRandomMonsterType = (): MonsterType => {
    const types: MonsterType[] = ['normal', 'fast', 'tank', 'flying', 'armored', 'swarm']
    return types[Math.floor(Math.random() * types.length)]
  }

  const spawnMonster = useCallback((forceBoss: boolean = false) => {
    const id = `monster-${Date.now()}-${Math.random()}`
    const type = forceBoss ? 'boss' : getRandomMonsterType()
    const monsterConfig = MONSTER_TYPES[type]
    
    const difficultyMultiplier = Math.pow(1.5, wave - 1)
    const baseHealth = 30 * difficultyMultiplier
    const baseSpeed = 0.012 + (wave - 1) * 0.0008
    const baseReward = 25 + wave * 8
    
    const weatherMult = WEATHER_EFFECTS[weather].speedMult
    
    const newMonster: Monster = {
      id,
      position: { ...PATH[0] },
      health: baseHealth * monsterConfig.healthMult,
      maxHealth: baseHealth * monsterConfig.healthMult,
      speed: baseSpeed * monsterConfig.speedMult * weatherMult,
      pathIndex: 0,
      reward: Math.floor(baseReward * monsterConfig.rewardMult),
      type,
      emoji: monsterConfig.emoji,
      color: monsterConfig.color,
      armor: monsterConfig.armorMult,
      isBoss: forceBoss,
    }
    
    setMonsters(prev => [...prev, newMonster])
    setMonstersSpawnedThisWave(prev => prev + 1)
    
    if (forceBoss) {
      setBossSpawned(true)
      toast(`Boss incoming! 👹`, { description: 'Defeat the boss to complete the wave!' })
    }
  }, [wave, weather, PATH])

  const startGame = () => {
    setGameState('playing')
    setMonsters([])
    setTowers([])
    setProjectiles([])
    setHealth(10)
    setCoins(200)
    setScore(0)
    setWave(1)
    setMonstersSpawnedThisWave(0)
    setSelectedTowerType(null)
    setWeather('clear')
    setNextWeatherChange(3)
    setBossSpawned(false)
    setBossDefeated(false)
  }

  const addToLeaderboard = (finalScore: number, finalWave: number) => {
    const newEntry: LeaderboardEntry = {
      score: finalScore,
      wave: finalWave,
      timestamp: Date.now(),
      mapName: currentMap.name,
    }
    
    setLeaderboard((currentLeaderboard) => {
      const current = currentLeaderboard || []
      const updated = [...current, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
      return updated
    })
  }

  const placeTower = (x: number, y: number) => {
    if (!selectedTowerType || isPathCell(x, y) || hasTower(x, y)) return
    
    const towerConfig = TOWER_TYPES[selectedTowerType]
    if (coins < towerConfig.cost) {
      toast.error('Not enough coins!')
      return
    }

    const newTower: Tower = {
      id: `tower-${Date.now()}`,
      position: { x, y },
      type: selectedTowerType,
      lastShot: 0,
      target: null,
    }

    setTowers(prev => [...prev, newTower])
    setCoins(prev => prev - towerConfig.cost)
    setSelectedTowerType(null)
    toast.success(`${towerConfig.name} placed!`)
  }

  useEffect(() => {
    if (gameState !== 'playing' || wave > 10) return

    const monstersPerWave = 8 + wave * 3
    
    if (bossSpawned || monstersSpawnedThisWave >= monstersPerWave) return

    const spawnInterval = setInterval(() => {
      if (monstersSpawnedThisWave < monstersPerWave && !bossSpawned) {
        spawnMonster(false)
      } else if (monstersSpawnedThisWave >= monstersPerWave && !bossSpawned) {
        spawnMonster(true)
      }
    }, 1800 - wave * 80)

    return () => clearInterval(spawnInterval)
  }, [gameState, monstersSpawnedThisWave, wave, bossSpawned, spawnMonster])

  useEffect(() => {
    if (gameState !== 'playing') return

    const gameLoop = setInterval(() => {
      const now = Date.now()

      setMonsters(prev => {
        return prev.map(monster => {
          if (monster.pathIndex >= PATH.length - 1) {
            setHealth(h => h - 1)
            toast.error('Monster reached the base!')
            return null
          }

          const target = PATH[monster.pathIndex + 1]
          const current = monster.position
          const dx = target.x - current.x
          const dy = target.y - current.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 0.1) {
            return { ...monster, pathIndex: monster.pathIndex + 1, position: target }
          }

          return {
            ...monster,
            position: {
              x: current.x + (dx / dist) * monster.speed,
              y: current.y + (dy / dist) * monster.speed,
            },
          }
        }).filter(Boolean) as Monster[]
      })

      setTowers(prev => {
        return prev.map(tower => {
          const config = TOWER_TYPES[tower.type]
          if (now - tower.lastShot < config.fireRate) return tower

          const target = monsters.find(m => {
            const d = distance(tower.position, m.position)
            return d <= config.range && m.health > 0
          })

          if (target) {
            const projectile: Projectile = {
              id: `proj-${now}-${Math.random()}`,
              start: { ...tower.position },
              target: { ...target.position },
              towerId: tower.id,
              damage: config.damage,
            }
            setProjectiles(p => [...p, projectile])

            setTimeout(() => {
              setMonsters(prev => prev.map(m => {
                if (m.id === target.id) {
                  const armorReduction = m.armor ? config.damage * m.armor : 0
                  const actualDamage = config.damage - armorReduction
                  const newHealth = m.health - actualDamage
                  if (newHealth <= 0) {
                    setCoins(c => c + m.reward)
                    setScore(s => s + m.reward * wave)
                    toast.success(`+${m.reward} coins!`)
                    
                    if (m.isBoss) {
                      setBossDefeated(true)
                      toast.success('Boss defeated! 🎉')
                    }
                    
                    return null
                  }
                  return { ...m, health: newHealth }
                }
                return m
              }).filter(Boolean) as Monster[])
              setProjectiles(p => p.filter(p => p.id !== projectile.id))
            }, 200)

            return { ...tower, lastShot: now, target: target.id }
          }

          return tower
        })
      })
    }, 16)

    return () => clearInterval(gameLoop)
  }, [gameState, monsters, wave])

  useEffect(() => {
    if (health <= 0 && gameState === 'playing') {
      setGameState('gameOver')
      addToLeaderboard(score, wave)
      if (leaderboard && leaderboard.length > 0 && score >= leaderboard[0].score) {
        toast.success('New High Score!')
      }
    }
  }, [health, gameState, score, wave, leaderboard])

  useEffect(() => {
    if (gameState === 'playing' && bossDefeated && monsters.length === 0) {
      const checkComplete = setTimeout(() => {
        if (monsters.length === 0 && bossDefeated) {
          if (wave >= 10) {
            setGameState('gameOver')
            addToLeaderboard(score, wave)
            toast.success('🎉 Adventure Complete! You conquered all 10 waves! 🎉')
            return
          }
          
          setWave(w => w + 1)
          setMonstersSpawnedThisWave(0)
          setBossSpawned(false)
          setBossDefeated(false)
          toast.success(`Wave ${wave} Complete! 🎉`)
          
          if (wave >= nextWeatherChange) {
            const weatherTypes: WeatherType[] = ['clear', 'storm', 'snow', 'volcano', 'rain']
            const newWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)]
            setWeather(newWeather)
            setNextWeatherChange(wave + 2 + Math.floor(Math.random() * 2))
            toast(`Weather changed to ${WEATHER_EFFECTS[newWeather].name}! ${WEATHER_EFFECTS[newWeather].emoji}`)
          }
        }
      }, 2000)
      return () => clearTimeout(checkComplete)
    }
  }, [gameState, monsters.length, bossDefeated, wave, nextWeatherChange, score])

  const canAfford = (type: keyof typeof TOWER_TYPES) => coins >= TOWER_TYPES[type].cost

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-5xl md:text-6xl font-bold text-primary mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            🛡️ Monster Defenders
          </h1>
          <p className="text-muted-foreground text-lg">Stop the cute monsters from reaching your base!</p>
        </header>

        {gameState === 'menu' && (
          <Card className="max-w-2xl mx-auto p-8 text-center">
            <h2 className="text-3xl font-bold mb-4 text-primary">How to Play</h2>
            <div className="space-y-3 text-left mb-6">
              <p className="text-lg">🎯 Click on empty cells to place defenders that stop monsters</p>
              <p className="text-lg">💰 Earn coins by defeating monsters and use them to buy more defenders</p>
              <p className="text-lg">❤️ Don't let monsters reach your base or you'll lose hearts</p>
              <p className="text-lg">👹 Each wave ends with a BOSS - defeat it to advance!</p>
              <p className="text-lg">🗺️ Complete all 10 waves to conquer the adventure!</p>
              <p className="text-lg">⚡ Watch out for weather events that change gameplay!</p>
            </div>
            {leaderboard && leaderboard.length > 0 && (
              <Badge variant="secondary" className="text-xl px-4 py-2 mb-4">
                High Score: {leaderboard[0].score.toLocaleString()} - {leaderboard[0].mapName}
              </Badge>
            )}
            <div className="flex gap-3 justify-center">
              <Button size="lg" onClick={() => setGameState('mapSelect')} className="text-2xl px-8 py-6">
                <Play className="mr-2" size={32} weight="fill" />
                Start Adventure
              </Button>
              {leaderboard && leaderboard.length > 0 && (
                <Button size="lg" variant="outline" onClick={() => setGameState('leaderboard')} className="text-2xl px-8 py-6">
                  🏆 Leaderboard
                </Button>
              )}
            </div>
          </Card>
        )}

        {gameState === 'mapSelect' && (
          <Card className="max-w-4xl mx-auto p-8">
            <h2 className="text-4xl font-bold mb-6 text-primary text-center">Choose Your Adventure</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {Object.entries(MAPS).map(([key, map]) => (
                <Button
                  key={key}
                  variant={selectedMap === key ? 'default' : 'outline'}
                  className="h-auto p-6 flex flex-col items-start gap-2"
                  onClick={() => setSelectedMap(key)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-4xl">{map.emoji}</span>
                    <div className="flex-1 text-left">
                      <div className="text-xl font-bold">{map.name}</div>
                      <div className="text-sm opacity-75">{map.description}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="self-start">
                    {map.difficulty} • {map.gridSize}x{map.gridSize}
                  </Badge>
                </Button>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <Button size="lg" onClick={startGame} className="text-2xl px-8 py-6">
                <Play className="mr-2" size={32} weight="fill" />
                Start Game
              </Button>
              <Button size="lg" variant="outline" onClick={() => setGameState('menu')} className="text-xl px-6 py-6">
                Back
              </Button>
            </div>
          </Card>
        )}

        {gameState === 'leaderboard' && (
          <Card className="max-w-2xl mx-auto p-8">
            <h2 className="text-4xl font-bold mb-6 text-primary text-center">🏆 Top 10 Scores</h2>
            {leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <div key={entry.timestamp} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant={index === 0 ? 'default' : 'secondary'} className="text-2xl px-3 py-1">
                        #{index + 1}
                      </Badge>
                      <div>
                        <p className="text-xl font-bold">{entry.score.toLocaleString()} pts</p>
                        <p className="text-sm text-muted-foreground">Wave {entry.wave} • {entry.mapName}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No scores yet. Play a game to get on the board!</p>
            )}
            <Button size="lg" onClick={() => setGameState('menu')} className="w-full mt-6 text-xl">
              Back to Menu
            </Button>
          </Card>
        )}

        {gameState === 'gameOver' && (
          <Card className="max-w-2xl mx-auto p-8 text-center">
            <h2 className="text-4xl font-bold mb-4 text-destructive">
              {wave >= 10 ? '🎉 Victory! 🎉' : 'Game Over!'}
            </h2>
            <p className="text-2xl mb-2">{currentMap.emoji} {currentMap.name}</p>
            <p className="text-2xl mb-4">Wave Reached: {wave}/10</p>
            <p className="text-3xl font-bold text-primary mb-6">Final Score: {score.toLocaleString()}</p>
            {leaderboard && leaderboard.length > 0 && score >= leaderboard[0].score && (
              <Badge variant="default" className="text-xl px-4 py-2 mb-4">
                🎉 New High Score! 🎉
              </Badge>
            )}
            <div className="flex gap-3 justify-center">
              <Button size="lg" onClick={startGame} className="text-2xl px-8 py-6">
                <ArrowClockwise className="mr-2" size={32} weight="fill" />
                Play Again
              </Button>
              <Button size="lg" variant="outline" onClick={() => setGameState('menu')} className="text-xl px-6 py-6">
                Main Menu
              </Button>
            </div>
          </Card>
        )}

        {(gameState === 'playing' || gameState === 'paused') && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div>
              <Card className="p-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="destructive" className="text-lg px-3 py-1">
                      <Heart className="mr-1" weight="fill" size={20} />
                      {health}
                    </Badge>
                    <Badge variant="default" className="text-lg px-3 py-1">
                      <Coin className="mr-1" weight="fill" size={20} />
                      {coins}
                    </Badge>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      Wave {wave}
                    </Badge>
                    <Badge variant="outline" className="text-lg px-3 py-1" style={{ backgroundColor: WEATHER_EFFECTS[weather].color }}>
                      {WEATHER_EFFECTS[weather].emoji} {WEATHER_EFFECTS[weather].name}
                    </Badge>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Score: {score.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {gameState === 'playing' && (
                      <Button size="sm" variant="outline" onClick={() => setGameState('paused')}>
                        <Pause weight="fill" />
                      </Button>
                    )}
                    {gameState === 'paused' && (
                      <Button size="sm" variant="outline" onClick={() => setGameState('playing')}>
                        <Play weight="fill" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={startGame}>
                      <ArrowClockwise weight="fill" />
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden">
                {weather === 'rain' && (
                  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                    {Array.from({ length: 50 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-0.5 h-8 bg-blue-400/40"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `-10%`,
                          animation: `fall ${0.5 + Math.random() * 0.5}s linear infinite`,
                          animationDelay: `${Math.random() * 2}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
                {weather === 'snow' && (
                  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute text-white text-xl opacity-80"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `-10%`,
                          animation: `fall ${2 + Math.random()}s linear infinite`,
                          animationDelay: `${Math.random() * 3}s`,
                        }}
                      >
                        ❄️
                      </div>
                    ))}
                  </div>
                )}
                {weather === 'storm' && (
                  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                    <div className="absolute inset-0 bg-gray-700/20" />
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute text-yellow-400 text-3xl animate-pulse"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDuration: `${0.3 + Math.random() * 0.3}s`,
                          animationDelay: `${Math.random() * 2}s`,
                        }}
                      >
                        ⚡
                      </div>
                    ))}
                  </div>
                )}
                {weather === 'volcano' && (
                  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                    <div className="absolute inset-0 bg-orange-500/10" />
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-orange-500"
                        style={{
                          left: `${Math.random() * 100}%`,
                          bottom: `-5%`,
                          animation: `rise ${1 + Math.random()}s ease-out infinite`,
                          animationDelay: `${Math.random() * 2}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
                
                <style>
                  {`
                    @keyframes fall {
                      to { transform: translateY(${GRID_SIZE * CELL_SIZE + 100}px); }
                    }
                    @keyframes rise {
                      to { transform: translateY(-${GRID_SIZE * CELL_SIZE + 100}px); opacity: 0; }
                    }
                  `}
                </style>
                
                <div
                  className="relative mx-auto bg-card rounded-lg shadow-inner"
                  style={{
                    width: GRID_SIZE * CELL_SIZE,
                    height: GRID_SIZE * CELL_SIZE,
                  }}
                >
                  <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
                    <path
                      d={`M ${PATH.map((p, i) => `${p.x * CELL_SIZE + CELL_SIZE / 2} ${p.y * CELL_SIZE + CELL_SIZE / 2}`).join(' L ')}`}
                      stroke="oklch(0.85 0.02 90)"
                      strokeWidth="24"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <div
                    className="absolute flex items-center justify-center text-3xl bg-green-500 rounded-full shadow-lg border-4 border-green-600 animate-pulse"
                    style={{
                      left: PATH[0].x * CELL_SIZE + CELL_SIZE / 4,
                      top: PATH[0].y * CELL_SIZE + CELL_SIZE / 4,
                      width: CELL_SIZE / 2,
                      height: CELL_SIZE / 2,
                      zIndex: 2,
                    }}
                  >
                    ▶️
                  </div>

                  <div
                    className="absolute flex items-center justify-center text-3xl bg-red-500 rounded-full shadow-lg border-4 border-red-600"
                    style={{
                      left: PATH[PATH.length - 1].x * CELL_SIZE + CELL_SIZE / 4,
                      top: PATH[PATH.length - 1].y * CELL_SIZE + CELL_SIZE / 4,
                      width: CELL_SIZE / 2,
                      height: CELL_SIZE / 2,
                      zIndex: 2,
                    }}
                  >
                    🏠
                  </div>

                  {Array.from({ length: GRID_SIZE }).map((_, y) =>
                    Array.from({ length: GRID_SIZE }).map((_, x) => {
                      const isPath = isPathCell(x, y)
                      const isHovered = hoveredCell?.x === x && hoveredCell?.y === y
                      const canPlace = selectedTowerType && !isPath && !hasTower(x, y)

                      return (
                        <div
                          key={`${x}-${y}`}
                          className={`absolute border transition-all ${
                            isPath ? 'bg-muted/30' : 'bg-card/50'
                          } ${canPlace && isHovered ? 'bg-primary/20 ring-2 ring-primary' : ''} ${
                            canPlace ? 'cursor-pointer hover:bg-primary/10' : ''
                          }`}
                          style={{
                            left: x * CELL_SIZE,
                            top: y * CELL_SIZE,
                            width: CELL_SIZE,
                            height: CELL_SIZE,
                            zIndex: 2,
                          }}
                          onMouseEnter={() => setHoveredCell({ x, y })}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => canPlace && placeTower(x, y)}
                        />
                      )
                    })
                  )}

                  {selectedTowerType && hoveredCell && !isPathCell(hoveredCell.x, hoveredCell.y) && !hasTower(hoveredCell.x, hoveredCell.y) && (
                    <div
                      className="absolute rounded-full border-2 border-primary/30 bg-primary/5 pointer-events-none"
                      style={{
                        left: (hoveredCell.x + 0.5) * CELL_SIZE - TOWER_TYPES[selectedTowerType].range * CELL_SIZE,
                        top: (hoveredCell.y + 0.5) * CELL_SIZE - TOWER_TYPES[selectedTowerType].range * CELL_SIZE,
                        width: TOWER_TYPES[selectedTowerType].range * 2 * CELL_SIZE,
                        height: TOWER_TYPES[selectedTowerType].range * 2 * CELL_SIZE,
                        zIndex: 3,
                      }}
                    />
                  )}

                  {towers.map(tower => {
                    const config = TOWER_TYPES[tower.type]
                    const Icon = config.icon
                    return (
                      <div
                        key={tower.id}
                        className="absolute flex items-center justify-center rounded-full shadow-lg animate-in zoom-in duration-300"
                        style={{
                          left: tower.position.x * CELL_SIZE + CELL_SIZE / 4,
                          top: tower.position.y * CELL_SIZE + CELL_SIZE / 4,
                          width: CELL_SIZE / 2,
                          height: CELL_SIZE / 2,
                          backgroundColor: config.color,
                          zIndex: 4,
                        }}
                      >
                        <Icon size={24} weight="fill" color="white" />
                      </div>
                    )
                  })}

                  {monsters.map(monster => (
                    <div
                      key={monster.id}
                      className="absolute transition-all duration-75"
                      style={{
                        left: monster.position.x * CELL_SIZE + CELL_SIZE / 4,
                        top: monster.position.y * CELL_SIZE + CELL_SIZE / 4,
                        width: CELL_SIZE / 2,
                        height: CELL_SIZE / 2,
                        zIndex: 5,
                      }}
                    >
                      <div
                        className="w-full h-full rounded-full flex items-center justify-center text-2xl shadow-lg animate-in zoom-in duration-300 relative"
                        style={{ 
                          backgroundColor: monster.color,
                          transform: monster.isBoss ? 'scale(1.5)' : 'scale(1)',
                        }}
                      >
                        {monster.emoji}
                        {monster.isBoss && (
                          <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
                            <Crown size={24} weight="fill" color="gold" />
                          </div>
                        )}
                        {monster.armor && monster.armor > 0 && (
                          <div className="absolute -bottom-1 -right-1 text-xs">🛡️</div>
                        )}
                      </div>
                      <div className="absolute -top-2 left-0 right-0 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-destructive transition-all duration-150"
                          style={{ width: `${(monster.health / monster.maxHealth) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {projectiles.map(proj => (
                    <div
                      key={proj.id}
                      className="absolute w-2 h-2 bg-accent rounded-full animate-in zoom-in duration-200"
                      style={{
                        left: proj.target.x * CELL_SIZE + CELL_SIZE / 2,
                        top: proj.target.y * CELL_SIZE + CELL_SIZE / 2,
                        zIndex: 6,
                      }}
                    />
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="text-xl font-bold mb-3 text-primary">Defenders</h3>
                <Separator className="mb-3" />
                <div className="space-y-2">
                  {(Object.keys(TOWER_TYPES) as Array<keyof typeof TOWER_TYPES>).map(type => {
                    const config = TOWER_TYPES[type]
                    const Icon = config.icon
                    const affordable = canAfford(type)
                    const selected = selectedTowerType === type

                    return (
                      <Button
                        key={type}
                        variant={selected ? 'default' : 'outline'}
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => setSelectedTowerType(selected ? null : type)}
                        disabled={!affordable}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: config.color }}
                          >
                            <Icon size={20} weight="fill" color="white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{config.name}</div>
                            <div className="text-xs opacity-75">
                              {config.desc}
                            </div>
                          </div>
                          <Badge variant={affordable ? 'secondary' : 'outline'} className="flex-shrink-0">
                            <Coin size={14} weight="fill" className="mr-1" />
                            {config.cost}
                          </Badge>
                        </div>
                      </Button>
                    )
                  })}
                </div>
              </Card>

              <Card className="p-4 bg-secondary/20">
                <h3 className="text-lg font-bold mb-2">Wave {wave}/10</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Monsters: {monstersSpawnedThisWave} / {8 + wave * 3}
                </p>
                {!bossSpawned && (
                  <Badge variant="outline" className="mt-2">
                    Boss incoming...
                  </Badge>
                )}
                {bossSpawned && !bossDefeated && (
                  <Badge variant="destructive" className="mt-2 animate-pulse">
                    👹 BOSS ACTIVE! Defeat to advance!
                  </Badge>
                )}
                {bossDefeated && (
                  <Badge variant="default" className="mt-2">
                    ✓ Boss Defeated!
                  </Badge>
                )}
              </Card>

              <Card className="p-4 bg-accent/10">
                <h3 className="text-lg font-bold mb-2 text-accent-foreground">👾 Enemies</h3>
                <div className="text-sm space-y-1 text-accent-foreground/90">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👾</span>
                    <span>Normal - Balanced</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🐰</span>
                    <span>Fast - Quick</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🦏</span>
                    <span>Tank - Tough</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👹</span>
                    <span>Boss - Wave 5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🦅</span>
                    <span>Flying - Agile</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🛡️</span>
                    <span>Armored</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🐜</span>
                    <span>Swarm - Many</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-muted/50">
                <h3 className="text-lg font-bold mb-2">💡 Tips</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Must defeat boss to advance wave</li>
                  <li>• 10 waves per adventure</li>
                  <li>• Place defenders near curves</li>
                  <li>• Use snipers for long range</li>
                  <li>• Bombers deal area damage</li>
                  <li>• Weather affects monster speed</li>
                  <li>• Armor reduces damage taken</li>
                </ul>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App