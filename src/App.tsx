import { useState, useEffect, useCallback, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Heart, Coin, Play, Pause, ArrowClockwise, Lightning, Crosshair, Shield, Fire, Snowflake, CloudRain, Bomb, Skull, Sword, Target, Crown, CaretLeft, CaretRight, Question, MapPin } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

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
  type: 'spark' | 'cannon' | 'vortex' | 'laser' | 'frost' | 'inferno' | 'void' | 'storm'
  lastShot: number
  target: string | null
  kills: number
  level: number
  experience: number
}
type Projectile = {
  id: string
  start: Position
  target: Position
  towerId: string
  damage: number
  towerType: keyof typeof TOWER_TYPES
  progress: number
  trail: Position[]
}
type DamageNumber = {
  id: string
  position: Position
  damage: number
  timestamp: number
}
type Particle = {
  id: string
  position: Position
  velocity: { x: number; y: number }
  color: string
  size: number
  timestamp: number
  lifetime: number
  shape: 'circle' | 'star' | 'square' | 'triangle' | 'diamond' | 'snowflake' | 'spark'
  rotation: number
}
type LevelUpEffect = {
  id: string
  position: Position
  timestamp: number
  level: number
  towerColor: string
}
type Explosion = {
  id: string
  position: Position
  color: string
  timestamp: number
  towerType: keyof typeof TOWER_TYPES
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
  gridWidth: number
  gridHeight: number
  path: Position[]
  description: string
  difficulty: string
}

const MAPS: Record<string, MapConfig> = {
  forest: {
    name: 'Forest Trail',
    emoji: '🌲',
    gridWidth: 20,
    gridHeight: 15,
    description: 'A winding path through the enchanted forest',
    difficulty: 'Easy',
    path: [
      { x: 0, y: 7 },
      { x: 1, y: 7 },
      { x: 2, y: 7 },
      { x: 3, y: 7 },
      { x: 4, y: 7 },
      { x: 4, y: 6 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 8, y: 5 },
      { x: 8, y: 6 },
      { x: 8, y: 7 },
      { x: 9, y: 7 },
      { x: 10, y: 7 },
      { x: 11, y: 7 },
      { x: 12, y: 7 },
      { x: 12, y: 8 },
      { x: 13, y: 8 },
      { x: 14, y: 8 },
      { x: 15, y: 8 },
      { x: 16, y: 8 },
      { x: 17, y: 8 },
      { x: 18, y: 8 },
      { x: 19, y: 8 },
    ],
  },
  desert: {
    name: 'Desert Dunes',
    emoji: '🏜️',
    gridWidth: 20,
    gridHeight: 15,
    description: 'Navigate the scorching desert sands',
    difficulty: 'Medium',
    path: [
      { x: 0, y: 3 },
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 8, y: 5 },
      { x: 9, y: 5 },
      { x: 9, y: 6 },
      { x: 9, y: 7 },
      { x: 9, y: 8 },
      { x: 10, y: 8 },
      { x: 11, y: 8 },
      { x: 12, y: 8 },
      { x: 12, y: 9 },
      { x: 12, y: 10 },
      { x: 13, y: 10 },
      { x: 14, y: 10 },
      { x: 15, y: 10 },
      { x: 16, y: 10 },
      { x: 17, y: 10 },
      { x: 18, y: 10 },
      { x: 19, y: 10 },
    ],
  },
  mountain: {
    name: 'Mountain Pass',
    emoji: '⛰️',
    gridWidth: 20,
    gridHeight: 15,
    description: 'Defend the treacherous mountain path',
    difficulty: 'Hard',
    path: [
      { x: 0, y: 7 },
      { x: 1, y: 7 },
      { x: 2, y: 7 },
      { x: 3, y: 7 },
      { x: 3, y: 6 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 7, y: 4 },
      { x: 7, y: 3 },
      { x: 8, y: 3 },
      { x: 9, y: 3 },
      { x: 10, y: 3 },
      { x: 11, y: 3 },
      { x: 11, y: 4 },
      { x: 11, y: 5 },
      { x: 12, y: 5 },
      { x: 13, y: 5 },
      { x: 14, y: 5 },
      { x: 14, y: 6 },
      { x: 14, y: 7 },
      { x: 15, y: 7 },
      { x: 16, y: 7 },
      { x: 17, y: 7 },
      { x: 18, y: 7 },
      { x: 19, y: 7 },
    ],
  },
  volcano: {
    name: 'Volcanic Crater',
    emoji: '🌋',
    gridWidth: 20,
    gridHeight: 15,
    description: 'Brave the molten lava flows',
    difficulty: 'Expert',
    path: [
      { x: 0, y: 7 },
      { x: 1, y: 7 },
      { x: 2, y: 7 },
      { x: 3, y: 7 },
      { x: 4, y: 7 },
      { x: 5, y: 7 },
      { x: 6, y: 7 },
      { x: 7, y: 7 },
      { x: 7, y: 6 },
      { x: 7, y: 5 },
      { x: 8, y: 5 },
      { x: 9, y: 5 },
      { x: 10, y: 5 },
      { x: 11, y: 5 },
      { x: 11, y: 6 },
      { x: 11, y: 7 },
      { x: 11, y: 8 },
      { x: 12, y: 8 },
      { x: 13, y: 8 },
      { x: 14, y: 8 },
      { x: 15, y: 8 },
      { x: 16, y: 8 },
      { x: 17, y: 8 },
      { x: 18, y: 8 },
      { x: 19, y: 8 },
    ],
  },
}

const CELL_SIZE = 56

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
  spark: { 
    cost: 150, 
    damage: 12, 
    range: 2.0, 
    fireRate: 500, 
    color: 'oklch(0.60 0.25 265)', 
    icon: Lightning, 
    name: 'Arc Spark', 
    desc: 'Chain lightning',
    specialty: 'Chains to 2 nearby targets',
    damagePerLevel: 3,
    rangePerLevel: 0.08,
    fireRatePerLevel: -15,
  },
  cannon: { 
    cost: 225, 
    damage: 40, 
    range: 2.5, 
    fireRate: 1400, 
    color: 'oklch(0.55 0.20 35)', 
    icon: Crosshair, 
    name: 'Rail Cannon', 
    desc: 'Armor piercing',
    specialty: 'Ignores 50% armor, high single-target',
    damagePerLevel: 8,
    rangePerLevel: 0.12,
    fireRatePerLevel: -40,
  },
  frost: { 
    cost: 300, 
    damage: 8, 
    range: 2.2, 
    fireRate: 600, 
    color: 'oklch(0.65 0.20 220)', 
    icon: Snowflake, 
    name: 'Frost Shard', 
    desc: 'Slows enemies',
    specialty: 'Slows by 30%, splash damage',
    damagePerLevel: 2,
    rangePerLevel: 0.10,
    fireRatePerLevel: -20,
  },
  inferno: { 
    cost: 400, 
    damage: 18, 
    range: 2.0, 
    fireRate: 800, 
    color: 'oklch(0.58 0.25 15)', 
    icon: Fire, 
    name: 'Flame Caster', 
    desc: 'Burning DOT',
    specialty: 'Burns for 5 DPS over 3 seconds',
    damagePerLevel: 4,
    rangePerLevel: 0.09,
    fireRatePerLevel: -25,
  },
  vortex: { 
    cost: 550, 
    damage: 6, 
    range: 2.8, 
    fireRate: 300, 
    color: 'oklch(0.55 0.22 300)', 
    icon: CloudRain, 
    name: 'Void Vortex', 
    desc: 'Area control',
    specialty: 'Pulls & damages all in range',
    damagePerLevel: 2,
    rangePerLevel: 0.15,
    fireRatePerLevel: -10,
  },
  laser: { 
    cost: 700, 
    damage: 4, 
    range: 3.5, 
    fireRate: 80, 
    color: 'oklch(0.62 0.24 340)', 
    icon: Target, 
    name: 'Beam Laser', 
    desc: 'Rapid continuous',
    specialty: 'Locks on, damage ramps up over time',
    damagePerLevel: 1,
    rangePerLevel: 0.12,
    fireRatePerLevel: -3,
  },
  void: { 
    cost: 900, 
    damage: 55, 
    range: 2.3, 
    fireRate: 2000, 
    color: 'oklch(0.35 0.18 285)', 
    icon: Skull, 
    name: 'Void Reaper', 
    desc: 'Pure damage',
    specialty: 'True damage ignores all defenses',
    damagePerLevel: 12,
    rangePerLevel: 0.10,
    fireRatePerLevel: -50,
  },
  storm: { 
    cost: 1200, 
    damage: 32, 
    range: 3.2, 
    fireRate: 1600, 
    color: 'oklch(0.60 0.20 150)', 
    icon: CloudRain, 
    name: 'Storm Caller', 
    desc: 'Area strikes',
    specialty: 'Hits 3 enemies in range simultaneously',
    damagePerLevel: 7,
    rangePerLevel: 0.14,
    fireRatePerLevel: -45,
  },
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
  const [coins, setCoins] = useState(500)
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
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const [explosions, setExplosions] = useState<Explosion[]>([])
  const [levelUpEffects, setLevelUpEffects] = useState<LevelUpEffect[]>([])
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [mapSelectModalOpen, setMapSelectModalOpen] = useState(false)
  const [hoveredTower, setHoveredTower] = useState<string | null>(null)
  const gameContainerRef = useRef<HTMLDivElement>(null)
  
  const [displayCoins, setDisplayCoins] = useState(coins)
  const [displayScore, setDisplayScore] = useState(score)
  const [prevHealth, setPrevHealth] = useState(health)
  const [prevMonsterCount, setPrevMonsterCount] = useState(0)
  const [prevBossStatus, setPrevBossStatus] = useState({ spawned: false, defeated: false })

  const currentMap = MAPS[selectedMap]
  const PATH = currentMap.path
  const GRID_WIDTH = currentMap.gridWidth
  const GRID_HEIGHT = currentMap.gridHeight

  const isPathCell = (x: number, y: number) => PATH.some(p => p.x === x && p.y === y)
  const hasTower = (x: number, y: number) => towers.some(t => t.position.x === x && t.position.y === y)

  const distance = (p1: Position, p2: Position) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))

  const getExpNeededForLevel = (level: number): number => {
    return Math.floor(5 * Math.pow(1.5, level - 1))
  }

  const getTowerStats = (tower: Tower) => {
    const config = TOWER_TYPES[tower.type]
    const level = tower.level
    
    return {
      damage: config.damage + (config.damagePerLevel * (level - 1)),
      range: config.range + (config.rangePerLevel * (level - 1)),
      fireRate: Math.max(50, config.fireRate + (config.fireRatePerLevel * (level - 1))),
      level: level,
    }
  }

  const getRandomMonsterType = (): MonsterType => {
    const types: MonsterType[] = ['normal', 'fast', 'tank', 'flying', 'armored', 'swarm']
    return types[Math.floor(Math.random() * types.length)]
  }

  const spawnMonster = useCallback((forceBoss: boolean = false) => {
    const id = `monster-${Date.now()}-${Math.random()}`
    const type = forceBoss ? 'boss' : getRandomMonsterType()
    const monsterConfig = MONSTER_TYPES[type]
    
    const difficultyMultiplier = Math.pow(1.2, wave - 1)
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
    setCoins(500)
    setScore(0)
    setWave(1)
    setMonstersSpawnedThisWave(0)
    setSelectedTowerType(null)
    setWeather('clear')
    setNextWeatherChange(3)
    setBossSpawned(false)
    setBossDefeated(false)
    setDamageNumbers([])
    setParticles([])
    setExplosions([])
    setLevelUpEffects([])
    setDisplayCoins(500)
    setDisplayScore(0)
    setPrevHealth(10)
    setPrevMonsterCount(0)
    setPrevBossStatus({ spawned: false, defeated: false })
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
      kills: 0,
      level: 1,
      experience: 0,
    }

    setTowers(prev => [...prev, newTower])
    setCoins(prev => prev - towerConfig.cost)
    setSelectedTowerType(null)
    toast.success(`${towerConfig.name} placed!`)
  }

  useEffect(() => {
    if (gameState !== 'playing') return

    const particleLoop = setInterval(() => {
      setParticles(prev => {
        return prev.map(particle => {
          const age = Date.now() - particle.timestamp
          if (age > particle.lifetime) return null
          
          return {
            ...particle,
            position: {
              x: particle.position.x + particle.velocity.x,
              y: particle.position.y + particle.velocity.y,
            },
            velocity: {
              x: particle.velocity.x * 0.98,
              y: particle.velocity.y + 0.002,
            },
            rotation: particle.rotation + 0.1,
          }
        }).filter(Boolean) as Particle[]
      })
    }, 16)

    return () => clearInterval(particleLoop)
  }, [gameState])

  useEffect(() => {
    if (gameState !== 'playing') return

    const explosionLoop = setInterval(() => {
      const now = Date.now()
      setExplosions(prev => prev.filter(exp => now - exp.timestamp < 500))
      setLevelUpEffects(prev => prev.filter(eff => now - eff.timestamp < 2000))
    }, 50)

    return () => clearInterval(explosionLoop)
  }, [gameState])

  useEffect(() => {
    if (gameState !== 'playing') return

    const coinInterval = setInterval(() => {
      setCoins(prev => prev + 1)
    }, 1000)

    return () => clearInterval(coinInterval)
  }, [gameState])

  const getMonstersPerWave = (waveNum: number) => 10 + waveNum * 5

  useEffect(() => {
    if (gameState !== 'playing' || wave > 10) return
    if (bossSpawned) return

    const monstersPerWave = getMonstersPerWave(wave)
    
    if (monstersSpawnedThisWave >= monstersPerWave) {
      const timer = setTimeout(() => {
        spawnMonster(true)
      }, 500)
      return () => clearTimeout(timer)
    }

    const spawnInterval = setInterval(() => {
      if (monstersSpawnedThisWave < monstersPerWave) {
        spawnMonster(false)
      }
    }, 1800 - wave * 80)

    return () => clearInterval(spawnInterval)
  }, [gameState, monstersSpawnedThisWave, wave, bossSpawned, spawnMonster])

  useEffect(() => {
    if (gameState !== 'playing') return

    const projectileLoop = setInterval(() => {
      setProjectiles(prev => {
        return prev.map(proj => {
          const startX = proj.start.x * CELL_SIZE + CELL_SIZE / 2
          const startY = proj.start.y * CELL_SIZE + CELL_SIZE / 2
          const targetX = proj.target.x * CELL_SIZE + CELL_SIZE / 2
          const targetY = proj.target.y * CELL_SIZE + CELL_SIZE / 2
          
          const currentX = startX + (targetX - startX) * proj.progress
          const currentY = startY + (targetY - startY) * proj.progress
          
          const newTrail = [...proj.trail, { x: currentX / CELL_SIZE, y: currentY / CELL_SIZE }]
          if (newTrail.length > 20) {
            newTrail.shift()
          }
          
          return {
            ...proj,
            progress: Math.min(proj.progress + 0.15, 1),
            trail: newTrail
          }
        })
      })
    }, 16)

    return () => clearInterval(projectileLoop)
  }, [gameState])

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
          const stats = getTowerStats(tower)
          
          if (now - tower.lastShot < stats.fireRate) return tower

          const target = monsters.find(m => {
            const d = distance(tower.position, m.position)
            return d <= stats.range && m.health > 0
          })

          if (target) {
            const projectile: Projectile = {
              id: `proj-${now}-${Math.random()}`,
              start: { ...tower.position },
              target: { ...target.position },
              towerId: tower.id,
              damage: stats.damage,
              towerType: tower.type,
              progress: 0,
              trail: [],
            }
            setProjectiles(p => [...p, projectile])

            setTimeout(() => {
              setMonsters(prev => prev.map(m => {
                if (m.id === target.id) {
                  const armorReduction = m.armor && m.armor > 0 && tower.type !== 'void' ? stats.damage * m.armor : 0
                  const actualDamage = Math.max(1, stats.damage - armorReduction)
                  const newHealth = m.health - actualDamage
                  
                  const damageNum: DamageNumber = {
                    id: `dmg-${Date.now()}-${Math.random()}`,
                    position: { ...m.position },
                    damage: Math.floor(actualDamage),
                    timestamp: Date.now(),
                  }
                  setDamageNumbers(prev => [...prev, damageNum])
                  
                  setTimeout(() => {
                    setDamageNumbers(prev => prev.filter(d => d.id !== damageNum.id))
                  }, 1500)
                  
                  const explosion: Explosion = {
                    id: `exp-${Date.now()}-${Math.random()}`,
                    position: { ...m.position },
                    color: config.color,
                    timestamp: Date.now(),
                    towerType: tower.type,
                  }
                  setExplosions(prev => [...prev, explosion])
                  
                  const particleCount = tower.type === 'vortex' || tower.type === 'inferno' || tower.type === 'storm' ? 20 : 12
                  const newParticles: Particle[] = []
                  
                  let particleShape: Particle['shape'] = 'circle'
                  if (tower.type === 'spark') particleShape = 'star'
                  else if (tower.type === 'cannon') particleShape = 'square'
                  else if (tower.type === 'vortex') particleShape = 'triangle'
                  else if (tower.type === 'laser') particleShape = 'diamond'
                  else if (tower.type === 'frost') particleShape = 'snowflake'
                  else if (tower.type === 'inferno') particleShape = 'spark'
                  else if (tower.type === 'void') particleShape = 'circle'
                  else if (tower.type === 'storm') particleShape = 'star'
                  
                  for (let i = 0; i < particleCount; i++) {
                    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
                    const speed = 0.02 + Math.random() * 0.03
                    newParticles.push({
                      id: `particle-${Date.now()}-${i}-${Math.random()}`,
                      position: { ...m.position },
                      velocity: {
                        x: Math.cos(angle) * speed,
                        y: Math.sin(angle) * speed,
                      },
                      color: config.color,
                      size: tower.type === 'inferno' || tower.type === 'vortex' || tower.type === 'storm' ? 8 : 5,
                      timestamp: Date.now(),
                      lifetime: 800 + Math.random() * 400,
                      shape: particleShape,
                      rotation: Math.random() * Math.PI * 2,
                    })
                  }
                  setParticles(prev => [...prev, ...newParticles])
                  
                  if (newHealth <= 0) {
                    setCoins(c => c + m.reward)
                    setScore(s => s + m.reward * wave)
                    toast.success(`+${m.reward} coins!`)
                    
                    setTowers(prevTowers => prevTowers.map(t => {
                      if (t.id === tower.id) {
                        const newKills = t.kills + 1
                        const expGain = m.isBoss ? 10 : 1
                        const newExp = t.experience + expGain
                        const expNeeded = getExpNeededForLevel(t.level + 1)
                        
                        if (newExp >= expNeeded) {
                          const upgradedTower = {
                            ...t,
                            kills: newKills,
                            experience: newExp - expNeeded,
                            level: t.level + 1,
                          }
                          
                          const levelUpEffect: LevelUpEffect = {
                            id: `levelup-${Date.now()}-${Math.random()}`,
                            position: { ...t.position },
                            timestamp: Date.now(),
                            level: t.level + 1,
                            towerColor: config.color,
                          }
                          setLevelUpEffects(prev => [...prev, levelUpEffect])
                          
                          const burstParticles: Particle[] = []
                          for (let i = 0; i < 30; i++) {
                            const angle = (Math.PI * 2 * i) / 30
                            const speed = 0.04 + Math.random() * 0.04
                            burstParticles.push({
                              id: `lvlup-particle-${Date.now()}-${i}-${Math.random()}`,
                              position: { ...t.position },
                              velocity: {
                                x: Math.cos(angle) * speed,
                                y: Math.sin(angle) * speed - 0.02,
                              },
                              color: '#FFD700',
                              size: 6 + Math.random() * 4,
                              timestamp: Date.now(),
                              lifetime: 1200 + Math.random() * 600,
                              shape: 'star',
                              rotation: Math.random() * Math.PI * 2,
                            })
                          }
                          setParticles(prev => [...prev, ...burstParticles])
                          
                          toast.success(`${config.name} reached level ${t.level + 1}! ⚡`, {
                            description: `+${config.damagePerLevel} DMG, +${config.rangePerLevel.toFixed(2)} Range, ${config.fireRatePerLevel}ms Rate`
                          })
                          return upgradedTower
                        }
                        
                        return { ...t, kills: newKills, experience: newExp }
                      }
                      return t
                    }))
                    
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
    if (gameState !== 'playing') return
    if (!bossDefeated) return
    if (monsters.length > 0) return
    
    const checkComplete = setTimeout(() => {
      if (wave >= 10) {
        setGameState('gameOver')
        addToLeaderboard(score, wave)
        toast.success('🎉 Adventure Complete! You conquered all 10 waves! 🎉')
        return
      }
      
      const currentWave = wave
      setWave(w => w + 1)
      setMonstersSpawnedThisWave(0)
      setBossSpawned(false)
      setBossDefeated(false)
      toast.success(`Wave ${currentWave} Complete! 🎉`)
      
      if (currentWave >= nextWeatherChange) {
        const weatherTypes: WeatherType[] = ['clear', 'storm', 'snow', 'volcano', 'rain']
        const newWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)]
        setWeather(newWeather)
        setNextWeatherChange(currentWave + 2 + Math.floor(Math.random() * 2))
        toast(`Weather changed to ${WEATHER_EFFECTS[newWeather].name}! ${WEATHER_EFFECTS[newWeather].emoji}`)
      }
    }, 1500)
    
    return () => clearTimeout(checkComplete)
  }, [gameState, monsters.length, bossDefeated, wave, nextWeatherChange, score])

  const canAfford = (type: keyof typeof TOWER_TYPES) => coins >= TOWER_TYPES[type].cost

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayCoins(current => {
        if (current < coins) {
          const diff = coins - current
          const increment = Math.max(1, Math.ceil(diff / 5))
          return Math.min(current + increment, coins)
        } else if (current > coins) {
          return coins
        }
        return current
      })
    }, 30)
    
    return () => clearInterval(interval)
  }, [coins])
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayScore(current => {
        if (current < score) {
          const diff = score - current
          const increment = Math.max(1, Math.ceil(diff / 8))
          return Math.min(current + increment, score)
        } else if (current > score) {
          return score
        }
        return current
      })
    }, 40)
    
    return () => clearInterval(interval)
  }, [score])
  
  useEffect(() => {
    setPrevHealth(health)
  }, [health])
  
  useEffect(() => {
    setPrevMonsterCount(monsters.length)
  }, [monsters.length])
  
  useEffect(() => {
    setPrevBossStatus({ spawned: bossSpawned, defeated: bossDefeated })
  }, [bossSpawned, bossDefeated])

  useEffect(() => {
    if (gameState === 'playing' && gameContainerRef.current) {
      const pathMidX = (PATH[Math.floor(PATH.length / 2)]?.x || PATH[0].x) * CELL_SIZE
      const pathMidY = (PATH[Math.floor(PATH.length / 2)]?.y || PATH[0].y) * CELL_SIZE
      
      const container = gameContainerRef.current
      const scrollLeft = pathMidX - container.clientWidth / 2 + CELL_SIZE / 2
      const scrollTop = pathMidY - container.clientHeight / 2 + CELL_SIZE / 2
      
      container.scrollTo({
        left: scrollLeft,
        top: scrollTop,
        behavior: 'smooth'
      })
    }
  }, [gameState, selectedMap])

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      {(gameState === 'menu' || gameState === 'mapSelect' || gameState === 'leaderboard' || gameState === 'gameOver') && (
        <header className="text-center py-4 shrink-0">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            🛡️ Monster Defenders
          </h1>
          <p className="text-muted-foreground text-sm">Stop the cute monsters from reaching your base!</p>
        </header>
      )}
      
      <div className="flex-1 overflow-auto px-4 pb-4">
        {gameState === 'menu' && (
          <div className="max-w-4xl mx-auto">
            <Card className="p-6 text-center bg-card border-border">
              <h2 className="text-2xl font-bold mb-3 text-foreground">How to Play</h2>
              <div className="space-y-1.5 text-left mb-4 text-sm text-muted-foreground">
                <p>🎯 Click on empty cells to place defenders that stop monsters</p>
                <p>💰 Earn coins by defeating monsters and use them to buy more defenders</p>
                <p>❤️ Don't let monsters reach your base or you'll lose hearts</p>
                <p>👹 Each wave ends with a BOSS - defeat it to advance!</p>
                <p>🗺️ Complete all 10 waves to conquer the adventure!</p>
                <p>⚡ Watch out for weather events that change gameplay!</p>
              </div>
              {leaderboard && leaderboard.length > 0 && (
                <Badge variant="secondary" className="text-base px-3 py-1 mb-3">
                  High Score: {leaderboard[0].score.toLocaleString()} - {leaderboard[0].mapName}
                </Badge>
              )}
              <div className="flex gap-2 justify-center">
                <Button size="lg" onClick={() => setGameState('mapSelect')} className="text-lg px-6 py-5">
                  <Play className="mr-2" size={24} weight="fill" />
                  Start Adventure
                </Button>
                {leaderboard && leaderboard.length > 0 && (
                  <Button size="lg" variant="outline" onClick={() => setGameState('leaderboard')} className="text-lg px-6 py-5">
                    🏆 Leaderboard
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}

        {gameState === 'mapSelect' && (
          <div className="max-w-4xl mx-auto">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-2xl font-bold mb-4 text-foreground text-center">Choose Your Adventure</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {Object.entries(MAPS).map(([key, map]) => (
                  <Button
                    key={key}
                    variant={selectedMap === key ? 'default' : 'outline'}
                    className="h-auto p-4 flex flex-col items-start gap-2"
                    onClick={() => setSelectedMap(key)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-3xl">{map.emoji}</span>
                      <div className="flex-1 text-left">
                        <div className="text-lg font-bold">{map.name}</div>
                        <div className="text-xs opacity-75">{map.description}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="self-start text-xs">
                      {map.difficulty} • {map.gridWidth}x{map.gridHeight}
                    </Badge>
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 justify-center">
                <Button size="lg" onClick={startGame} className="text-lg px-6 py-5">
                  <Play className="mr-2" size={24} weight="fill" />
                  Start Game
                </Button>
                <Button size="lg" variant="outline" onClick={() => setGameState('menu')} className="text-base px-5 py-5">
                  Back
                </Button>
              </div>
            </Card>
          </div>
        )}

        {gameState === 'leaderboard' && (
          <div className="max-w-4xl mx-auto">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-2xl font-bold mb-4 text-foreground text-center">🏆 Top 10 Scores</h2>
              {leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {leaderboard.map((entry, index) => (
                    <div key={entry.timestamp} className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? 'default' : 'secondary'} className="text-lg px-2 py-0.5">
                          #{index + 1}
                        </Badge>
                        <div>
                          <p className="text-base font-bold text-foreground">{entry.score.toLocaleString()} pts</p>
                          <p className="text-xs text-muted-foreground">Wave {entry.wave} • {entry.mapName}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground mb-4">No scores yet. Play a game to get on the board!</p>
              )}
              <Button size="lg" onClick={() => setGameState('menu')} className="w-full text-base">
                Back to Menu
              </Button>
            </Card>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="max-w-4xl mx-auto">
            <Card className="p-6 text-center bg-card border-border">
              <h2 className="text-2xl font-bold mb-3 text-destructive">
                {wave >= 10 ? '🎉 Victory! 🎉' : 'Game Over!'}
              </h2>
              <p className="text-lg mb-1 text-foreground">{currentMap.emoji} {currentMap.name}</p>
              <p className="text-lg mb-2 text-foreground">Wave Reached: {wave}/10</p>
              <p className="text-2xl font-bold text-primary mb-4">Final Score: {score.toLocaleString()}</p>
              {leaderboard && leaderboard.length > 0 && score >= leaderboard[0].score && (
                <Badge variant="default" className="text-base px-3 py-1 mb-3">
                  🎉 New High Score! 🎉
                </Badge>
              )}
              <div className="flex gap-2 justify-center">
                <Button size="lg" onClick={startGame} className="text-lg px-6 py-5">
                  <ArrowClockwise className="mr-2" size={24} weight="fill" />
                  Play Again
                </Button>
                <Button size="lg" variant="outline" onClick={() => setGameState('menu')} className="text-base px-5 py-5">
                  Main Menu
                </Button>
              </div>
            </Card>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'paused') && (
          <div className="h-full flex flex-col gap-2">
            <Card className="p-3 shrink-0 bg-slate-900/98 border-slate-700 backdrop-blur-sm shadow-xl">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <motion.div
                  key={`health-${health}`}
                  animate={health < prevHealth ? {
                    scale: [1, 1.3, 1],
                    filter: ['brightness(1)', 'brightness(2)', 'brightness(1)']
                  } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <Badge className="text-base px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white border-red-500 shadow-lg shadow-red-900/50">
                    <Heart className="mr-1.5" weight="fill" size={18} />
                    {health}
                  </Badge>
                </motion.div>
                
                <motion.div
                  key={`coins-flash-${Math.floor(coins / 50)}`}
                  animate={{
                    scale: [1, 1.15, 1],
                    filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)']
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Badge className="text-base px-3 py-1.5 tabular-nums bg-amber-600 hover:bg-amber-700 text-white border-amber-500 shadow-lg shadow-amber-900/50">
                    <Coin className="mr-1.5" weight="fill" size={18} />
                    {Math.floor(displayCoins)}
                  </Badge>
                </motion.div>
                
                <Badge className="text-base px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white border-purple-500 shadow-lg shadow-purple-900/50">
                  <Crown className="mr-1.5" weight="fill" size={16} />
                  Wave {wave}/10
                </Badge>
                
                <motion.div
                  key={`score-flash-${Math.floor(score / 200)}`}
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 0.25 }}
                >
                  <Badge className="text-base px-3 py-1.5 tabular-nums bg-blue-600 hover:bg-blue-700 text-white border-blue-500 shadow-lg shadow-blue-900/50">
                    <Target className="mr-1.5" weight="fill" size={16} />
                    {Math.floor(displayScore).toLocaleString()}
                  </Badge>
                </motion.div>
                
                <Separator orientation="vertical" className="h-7 bg-slate-600" />
                
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border-2 border-slate-600 rounded-md shadow-inner">
                  <motion.div 
                    className="flex items-center gap-1"
                    animate={monsters.length < prevMonsterCount && monsters.length > 0 ? {
                      scale: [1, 1.2, 1],
                      filter: ['brightness(1)', 'brightness(1.8)', 'brightness(1)']
                    } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-xs font-medium text-slate-300">Enemies:</span>
                    <span className="text-base font-bold tabular-nums text-white">
                      {bossDefeated 
                        ? monsters.length 
                        : bossSpawned 
                          ? monsters.length 
                          : monsters.length + (getMonstersPerWave(wave) - monstersSpawnedThisWave) + 1
                      }
                    </span>
                  </motion.div>
                  <Separator orientation="vertical" className="h-5 bg-slate-600" />
                  <div className="flex items-center gap-1">
                    <AnimatePresence mode="wait">
                      {bossSpawned ? (
                        bossDefeated ? (
                          <motion.div
                            key="defeated"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ 
                              scale: [0.8, 1.3, 1], 
                              opacity: 1,
                              filter: ['brightness(1)', 'brightness(2)', 'brightness(1)']
                            }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Badge className="text-sm px-2 py-1 bg-slate-600 text-white border-slate-500">
                              <Skull className="mr-1" size={14} weight="fill" />
                              Defeated
                            </Badge>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="active"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ 
                              scale: [0.8, 1.2, 1],
                              opacity: 1,
                              filter: ['brightness(1)', 'brightness(2)', 'brightness(1)']
                            }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.6 }}
                          >
                            <Badge className="text-sm px-2 py-1 animate-pulse bg-red-700 text-white border-red-600">
                              <Crown className="mr-1" size={14} weight="fill" />
                              BOSS
                            </Badge>
                          </motion.div>
                        )
                      ) : (
                        <motion.div
                          key="incoming"
                          initial={{ scale: 1, opacity: 1 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                        >
                          <Badge className="text-sm px-2 py-1 bg-yellow-600 text-white border-yellow-500">
                            <Crown className="mr-1" size={14} weight="fill" />
                            Boss Soon
                          </Badge>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                <Separator orientation="vertical" className="h-7 bg-slate-600" />
                
                <div className="flex gap-1.5">
                  <Dialog open={helpModalOpen} onOpenChange={setHelpModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-green-500 px-2 py-1.5 shadow-lg shadow-green-900/50" title="Help & Tips">
                        <Question weight="fill" size={18} />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-2xl text-foreground">Game Help & Tips</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-foreground">
                            👾 Enemy Types
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Card className="p-3 bg-slate-800/50 border-slate-700/50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">👾</span>
                                <span className="font-semibold text-foreground">Normal</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Balanced health and speed</p>
                            </Card>
                            <Card className="p-3 bg-slate-800/50 border-slate-700/50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">🐰</span>
                                <span className="font-semibold text-foreground">Fast</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Quick but weak, hard to catch</p>
                            </Card>
                            <Card className="p-3 bg-slate-800/50 border-slate-700/50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">🦏</span>
                                <span className="font-semibold text-foreground">Tank</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Slow but very tough</p>
                            </Card>
                            <Card className="p-3 bg-slate-800/50 border-slate-700/50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">👹</span>
                                <span className="font-semibold text-foreground">Boss</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Massive health, defeat to advance wave</p>
                            </Card>
                            <Card className="p-3 bg-slate-800/50 border-slate-700/50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">🦅</span>
                                <span className="font-semibold text-foreground">Flying</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Fast airborne enemy</p>
                            </Card>
                            <Card className="p-3 bg-slate-800/50 border-slate-700/50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">🛡️</span>
                                <span className="font-semibold text-foreground">Armored</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Reduces incoming damage significantly</p>
                            </Card>
                            <Card className="p-3 bg-slate-800/50 border-slate-700/50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">🐜</span>
                                <span className="font-semibold text-foreground">Swarm</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Weak but comes in large numbers</p>
                            </Card>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-foreground">
                            🗼 Tower Types
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(Object.keys(TOWER_TYPES) as Array<keyof typeof TOWER_TYPES>).map(type => {
                              const config = TOWER_TYPES[type]
                              const Icon = config.icon
                              return (
                                <Card key={type} className="p-3 bg-slate-800/50 border-slate-700/50">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div
                                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                      style={{ backgroundColor: config.color }}
                                    >
                                      <Icon size={18} weight="fill" color="white" />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-foreground">{config.name}</div>
                                      <Badge variant="secondary" className="text-xs">
                                        <Coin size={10} weight="fill" className="mr-0.5" />
                                        {config.cost}
                                      </Badge>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-2">{config.specialty}</p>
                                  <div className="text-xs space-y-0.5 text-muted-foreground mb-2">
                                    <div>💥 Damage: {config.damage}</div>
                                    <div>🎯 Range: {config.range} cells</div>
                                    <div>⚡ Fire Rate: {config.fireRate}ms</div>
                                  </div>
                                  <Separator className="my-2" />
                                  <div className="text-xs space-y-1">
                                    <div className="font-semibold text-amber-400">⚡ Progression:</div>
                                    <div className="text-[10px] text-slate-300 ml-2">
                                      <span className="text-green-400">+{config.damagePerLevel} DMG</span> per level
                                    </div>
                                    <div className="text-[10px] text-slate-300 ml-2">
                                      <span className="text-blue-400">+{config.rangePerLevel.toFixed(2)} RNG</span> per level
                                    </div>
                                    <div className="text-[10px] text-slate-300 ml-2">
                                      <span className="text-purple-400">{config.fireRatePerLevel} ms</span> per level
                                    </div>
                                    <div className="text-[10px] text-yellow-300 ml-2 mt-1 italic">
                                      Unlimited levels - keep fighting!
                                    </div>
                                  </div>
                                </Card>
                              )
                            })}
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-foreground">
                            💡 Strategy Tips
                          </h3>
                          <Card className="p-4 bg-slate-800/50 border-slate-700/50">
                            <ul className="text-sm space-y-2 text-muted-foreground">
                              <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span><strong>Towers level up infinitely!</strong> Each kill gives XP - bosses give 10x XP</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span><strong>Hover over towers</strong> to see their upgraded range and stats</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span><strong>Early game:</strong> Arc Sparks chain lightning to multiple enemies efficiently</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span><strong>Against armor:</strong> Rail Cannons and Void Reapers pierce defenses</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span><strong>Crowd control:</strong> Frost Shards slow enemies, Void Vortex pulls them together</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span><strong>Beam Lasers</strong> deal continuous damage that ramps up the longer they focus</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span><strong>Storm Callers</strong> hit multiple enemies at once - excellent for swarms</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span><strong>Flame Casters</strong> apply burning damage over time that can spread</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span><strong>Place towers at curves</strong> in the path for maximum time on target</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span><strong>Weather changes</strong> affect enemy speed - snow slows, volcano speeds up</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span><strong>Defeat the boss</strong> at the end of each wave to advance to the next level</span>
                              </li>
                            </ul>
                          </Card>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={mapSelectModalOpen} onOpenChange={setMapSelectModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white border-teal-500 px-2 py-1.5 shadow-lg shadow-teal-900/50" title="Change Map">
                        <MapPin weight="fill" size={18} />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-2xl text-foreground">Change Map</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Select a new map. Your current game will restart.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(MAPS).map(([key, map]) => (
                            <Button
                              key={key}
                              variant={selectedMap === key ? 'default' : 'outline'}
                              className="h-auto p-4 flex flex-col items-start gap-2"
                              onClick={() => {
                                setSelectedMap(key)
                                setMapSelectModalOpen(false)
                                setTimeout(startGame, 100)
                              }}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-3xl">{map.emoji}</span>
                                <div className="flex-1 text-left">
                                  <div className="text-lg font-bold">{map.name}</div>
                                  <div className="text-xs opacity-75">{map.description}</div>
                                </div>
                              </div>
                              <Badge variant="secondary" className="self-start text-xs">
                                {map.difficulty} • {map.gridWidth}x{map.gridHeight}
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {gameState === 'playing' && (
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 px-2 py-1.5 shadow-lg shadow-indigo-900/50" onClick={() => setGameState('paused')} title="Pause">
                      <Pause weight="fill" size={18} />
                    </Button>
                  )}
                  {gameState === 'paused' && (
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 px-2 py-1.5 shadow-lg shadow-indigo-900/50" onClick={() => setGameState('playing')} title="Resume">
                      <Play weight="fill" size={18} />
                    </Button>
                  )}
                  <Button size="sm" className="bg-slate-600 hover:bg-slate-700 text-white border-slate-500 px-2 py-1.5 shadow-lg shadow-slate-900/50" onClick={startGame} title="Restart">
                    <ArrowClockwise weight="fill" size={18} />
                  </Button>
                </div>
              </div>
            </Card>

            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                <Card ref={gameContainerRef} className="flex-1 p-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-x-auto overflow-y-hidden border-border">
                  <div className="relative flex items-center justify-center h-full">
                    <div 
                      className="relative bg-slate-800/50 rounded-lg shadow-inner border border-slate-700/50"
                      style={{
                        width: `${GRID_WIDTH * CELL_SIZE}px`,
                        height: `${GRID_HEIGHT * CELL_SIZE}px`,
                        maxHeight: '100%',
                      }}
                    >
                      <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ zIndex: 1 }} width={GRID_WIDTH * CELL_SIZE} height={GRID_HEIGHT * CELL_SIZE}>
                        <path
                          d={`M ${PATH.map((p, i) => `${p.x * CELL_SIZE + CELL_SIZE / 2} ${p.y * CELL_SIZE + CELL_SIZE / 2}`).join(' L ')}`}
                          stroke="oklch(0.25 0.02 260)"
                          strokeWidth="24"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      
                      <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ zIndex: 100, overflow: 'visible' }} width={GRID_WIDTH * CELL_SIZE} height={GRID_HEIGHT * CELL_SIZE}>
                        <defs>
                          <filter id="glow">
                            <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                          <filter id="strong-glow">
                            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                        {projectiles.map(proj => {
                          const startX = proj.start.x * CELL_SIZE + CELL_SIZE / 2
                          const startY = proj.start.y * CELL_SIZE + CELL_SIZE / 2
                          const targetX = proj.target.x * CELL_SIZE + CELL_SIZE / 2
                          const targetY = proj.target.y * CELL_SIZE + CELL_SIZE / 2
                          
                          const currentX = startX + (targetX - startX) * proj.progress
                          const currentY = startY + (targetY - startY) * proj.progress
                          
                          const towerConfig = TOWER_TYPES[proj.towerType]
                          const color = towerConfig.color
                          
                          return (
                            <g key={proj.id}>
                              {proj.towerType === 'spark' && (
                                <>
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke={color}
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    opacity="0.9"
                                    filter="url(#glow)"
                                  />
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke="white"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    opacity="1"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={12}
                                    fill={color}
                                    filter="url(#glow)"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={7}
                                    fill="white"
                                    opacity="1"
                                  />
                                </>
                              )}
                              
                              {proj.towerType === 'cannon' && (
                                <>
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke={color}
                                    strokeWidth="16"
                                    strokeLinecap="round"
                                    opacity="0.95"
                                    filter="url(#strong-glow)"
                                  />
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke="white"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    opacity="1"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={14}
                                    fill={color}
                                    filter="url(#strong-glow)"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={8}
                                    fill="white"
                                    opacity="1"
                                  />
                                </>
                              )}
                              
                              {proj.towerType === 'vortex' && (
                                <>
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke={color}
                                    strokeWidth="14"
                                    strokeLinecap="round"
                                    opacity="0.85"
                                    filter="url(#glow)"
                                  />
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke="white"
                                    strokeWidth="7"
                                    strokeLinecap="round"
                                    opacity="0.9"
                                  />
                                  {proj.trail.slice(-10).map((p, i) => (
                                    <circle
                                      key={i}
                                      cx={p.x * CELL_SIZE}
                                      cy={p.y * CELL_SIZE}
                                      r={10 - i * 0.8}
                                      fill={color}
                                      opacity={0.5 + (i / 10) * 0.5}
                                      filter="url(#glow)"
                                    />
                                  ))}
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={15}
                                    fill={color}
                                    filter="url(#glow)"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={9}
                                    fill="white"
                                    opacity="0.9"
                                  />
                                </>
                              )}
                              
                              {proj.towerType === 'laser' && (
                                <>
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke={color}
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    opacity="1"
                                    filter="url(#glow)"
                                  />
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke="white"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    opacity="1"
                                  />
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke="#ffff00"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    opacity="1"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={10}
                                    fill={color}
                                    filter="url(#glow)"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={5}
                                    fill="white"
                                    opacity="1"
                                  />
                                </>
                              )}
                              
                              {proj.towerType === 'frost' && (
                                <>
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke={color}
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    opacity="0.9"
                                    filter="url(#glow)"
                                  />
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke="#a0d0ff"
                                    strokeWidth="7"
                                    strokeLinecap="round"
                                    opacity="1"
                                  />
                                  {proj.trail.slice(-8).map((p, i) => (
                                    <g key={i}>
                                      <circle
                                        cx={p.x * CELL_SIZE}
                                        cy={p.y * CELL_SIZE}
                                        r={8}
                                        fill={color}
                                        opacity={0.6 + (i / 8) * 0.4}
                                        filter="url(#glow)"
                                      />
                                      {i % 2 === 0 && (
                                        <text
                                          x={p.x * CELL_SIZE}
                                          y={p.y * CELL_SIZE + 1}
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                          fontSize="12"
                                          opacity={0.8}
                                        >
                                          ❄️
                                        </text>
                                      )}
                                    </g>
                                  ))}
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={12}
                                    fill={color}
                                    filter="url(#glow)"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={8}
                                    fill="white"
                                    opacity="0.9"
                                  />
                                </>
                              )}
                              
                              {proj.towerType === 'inferno' && (
                                <>
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke={color}
                                    strokeWidth="14"
                                    strokeLinecap="round"
                                    strokeDasharray="16,8"
                                    opacity="0.9"
                                    filter="url(#glow)"
                                  />
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke="oklch(0.85 0.25 50)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray="16,8"
                                    opacity="1"
                                  />
                                  {proj.trail.slice(-8).map((p, i) => (
                                    i % 2 === 0 && (
                                      <circle
                                        key={i}
                                        cx={p.x * CELL_SIZE}
                                        cy={p.y * CELL_SIZE}
                                        r={7}
                                        fill="oklch(0.85 0.25 50)"
                                        opacity={0.7 + (i / 8) * 0.3}
                                        filter="url(#glow)"
                                      />
                                    )
                                  ))}
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={15}
                                    fill={color}
                                    filter="url(#glow)"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={10}
                                    fill="oklch(0.85 0.25 50)"
                                    opacity="1"
                                  />
                                </>
                              )}
                              
                              {proj.towerType === 'void' && (
                                <>
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke={color}
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    opacity="0.95"
                                    filter="url(#strong-glow)"
                                  />
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke="oklch(0.30 0.20 290)"
                                    strokeWidth="7"
                                    strokeLinecap="round"
                                    opacity="1"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={13}
                                    fill={color}
                                    filter="url(#strong-glow)"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={6}
                                    fill="oklch(0.20 0.15 290)"
                                    opacity="1"
                                  />
                                </>
                              )}
                              
                              {proj.towerType === 'storm' && (
                                <>
                                  {proj.trail.slice(-12).map((p, i) => (
                                    <circle
                                      key={i}
                                      cx={p.x * CELL_SIZE}
                                      cy={p.y * CELL_SIZE}
                                      r={12 - i * 0.7}
                                      fill={color}
                                      opacity={0.4 + (i / 12) * 0.6}
                                      filter="url(#glow)"
                                    />
                                  ))}
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke={color}
                                    strokeWidth="14"
                                    strokeLinecap="round"
                                    opacity="0.9"
                                    filter="url(#glow)"
                                  />
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={currentX}
                                    y2={currentY}
                                    stroke="oklch(0.85 0.30 110)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    opacity="1"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={15}
                                    fill={color}
                                    filter="url(#glow)"
                                  />
                                  <circle
                                    cx={currentX}
                                    cy={currentY}
                                    r={9}
                                    fill="oklch(0.85 0.30 110)"
                                    opacity="1"
                                  />
                                </>
                              )}
                            </g>
                          )
                        })}
                      </svg>

                      <div
                        className="absolute flex items-center justify-center text-3xl bg-green-500 rounded-full shadow-lg border-4 border-green-600 animate-pulse"
                        style={{
                          left: `${PATH[0].x * CELL_SIZE}px`,
                          top: `${PATH[0].y * CELL_SIZE}px`,
                          width: `${CELL_SIZE * 0.5}px`,
                          height: `${CELL_SIZE * 0.5}px`,
                          transform: 'translate(50%, 50%)',
                          zIndex: 2,
                        }}
                      >
                        ▶️
                      </div>

                      <div
                        className="absolute flex items-center justify-center text-3xl bg-red-500 rounded-full shadow-lg border-4 border-red-600"
                        style={{
                          left: `${PATH[PATH.length - 1].x * CELL_SIZE}px`,
                          top: `${PATH[PATH.length - 1].y * CELL_SIZE}px`,
                          width: `${CELL_SIZE * 0.5}px`,
                          height: `${CELL_SIZE * 0.5}px`,
                          transform: 'translate(50%, 50%)',
                          zIndex: 2,
                        }}
                      >
                        🏠
                      </div>

                      {Array.from({ length: GRID_HEIGHT }).map((_, y) =>
                        Array.from({ length: GRID_WIDTH }).map((_, x) => {
                          const isPath = isPathCell(x, y)
                          const isHovered = hoveredCell?.x === x && hoveredCell?.y === y
                          const canPlace = selectedTowerType && !isPath && !hasTower(x, y)

                          return (
                            <div
                              key={`${x}-${y}`}
                              className={`absolute border border-slate-700/30 transition-all ${
                                isPath ? 'bg-slate-700/30' : 'bg-slate-800/30'
                              } ${canPlace && isHovered ? 'bg-primary/20 ring-2 ring-primary' : ''} ${
                                canPlace ? 'cursor-pointer hover:bg-primary/10' : ''
                              }`}
                              style={{
                                left: `${x * CELL_SIZE}px`,
                                top: `${y * CELL_SIZE}px`,
                                width: `${CELL_SIZE}px`,
                                height: `${CELL_SIZE}px`,
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
                            left: `${(hoveredCell.x + 0.5 - TOWER_TYPES[selectedTowerType].range) * CELL_SIZE}px`,
                            top: `${(hoveredCell.y + 0.5 - TOWER_TYPES[selectedTowerType].range) * CELL_SIZE}px`,
                            width: `${TOWER_TYPES[selectedTowerType].range * 2 * CELL_SIZE}px`,
                            height: `${TOWER_TYPES[selectedTowerType].range * 2 * CELL_SIZE}px`,
                            zIndex: 3,
                          }}
                        />
                      )}

                      {towers.map(tower => {
                        const config = TOWER_TYPES[tower.type]
                        const Icon = config.icon
                        const stats = getTowerStats(tower)
                        const towerLevel = tower.level
                        
                        const baseTowerSize = CELL_SIZE * 0.5
                        const finalTowerSize = baseTowerSize
                        const glowIntensity = Math.min(50, 10 + towerLevel * 2)
                        
                        const expNeeded = getExpNeededForLevel(towerLevel + 1)
                        const expPercent = (tower.experience / expNeeded) * 100
                        const isHovered = hoveredTower === tower.id
                        
                        const towerCenterX = tower.position.x * CELL_SIZE + CELL_SIZE / 2
                        const towerCenterY = tower.position.y * CELL_SIZE + CELL_SIZE / 2
                        
                        const expBarWidth = 48
                        const expBarHeight = 12
                        const levelCircleSize = 20
                        
                        return (
                          <div key={tower.id}>
                            {isHovered && (
                              <>
                                <div
                                  className="absolute rounded-full border-2 border-primary/50 bg-primary/10 pointer-events-none animate-pulse"
                                  style={{
                                    left: `${(tower.position.x + 0.5 - stats.range) * CELL_SIZE}px`,
                                    top: `${(tower.position.y + 0.5 - stats.range) * CELL_SIZE}px`,
                                    width: `${stats.range * 2 * CELL_SIZE}px`,
                                    height: `${stats.range * 2 * CELL_SIZE}px`,
                                    zIndex: 3,
                                  }}
                                />
                                <div
                                  className="absolute bg-slate-900/95 rounded-lg px-3 py-2 pointer-events-none shadow-xl border-2 border-primary/50 backdrop-blur-sm"
                                  style={{
                                    left: `${towerCenterX}px`,
                                    top: `${towerCenterY - finalTowerSize / 2 - 8}px`,
                                    transform: 'translate(-50%, -100%)',
                                    zIndex: 50,
                                    minWidth: '180px',
                                  }}
                                >
                                  <div className="text-center space-y-1">
                                    <div className="font-bold text-sm text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                                      {config.name}
                                    </div>
                                    <div className="text-xs text-yellow-400 font-bold">
                                      LEVEL {towerLevel}
                                    </div>
                                    <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent my-1" />
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                                      <div className="text-left text-slate-400">Damage:</div>
                                      <div className="text-right text-green-400 font-bold">{Math.floor(stats.damage)}</div>
                                      <div className="text-left text-slate-400">Range:</div>
                                      <div className="text-right text-blue-400 font-bold">{stats.range.toFixed(2)}</div>
                                      <div className="text-left text-slate-400">Fire Rate:</div>
                                      <div className="text-right text-purple-400 font-bold">{Math.floor(stats.fireRate)}ms</div>
                                      <div className="text-left text-slate-400">Kills:</div>
                                      <div className="text-right text-red-400 font-bold">{tower.kills}</div>
                                    </div>
                                    <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent my-1" />
                                    <div className="text-[10px] text-slate-300">
                                      XP: <span className="text-amber-400 font-bold">{tower.experience}</span> / <span className="text-slate-400">{expNeeded}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                      <div
                                        className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 transition-all duration-300 relative"
                                        style={{ width: `${expPercent}%` }}
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                            <div
                              className="absolute flex items-center justify-center rounded-full shadow-lg cursor-pointer"
                              style={{
                                left: `${towerCenterX}px`,
                                top: `${towerCenterY}px`,
                                width: `${finalTowerSize}px`,
                                height: `${finalTowerSize}px`,
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: config.color,
                                zIndex: 4,
                                boxShadow: `0 0 ${glowIntensity}px ${config.color}, 0 4px 20px rgba(0,0,0,0.5)`,
                              }}
                              onMouseEnter={() => setHoveredTower(tower.id)}
                              onMouseLeave={() => setHoveredTower(null)}
                            >
                              <Icon size={Math.floor(finalTowerSize * 0.6)} weight="fill" color="white" />
                            </div>
                            
                            <div
                              className="absolute pointer-events-none flex items-center"
                              style={{
                                left: `${towerCenterX}px`,
                                top: `${towerCenterY + finalTowerSize / 2 + 6}px`,
                                transform: 'translate(-50%, 0)',
                                zIndex: 5,
                                height: `${expBarHeight}px`,
                              }}
                            >
                              <motion.div 
                                className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white font-bold rounded-full flex items-center justify-center border-2 border-amber-500/80 shadow-lg shrink-0"
                                style={{ 
                                  fontSize: towerLevel >= 10 ? '8px' : '9px',
                                  width: `${levelCircleSize}px`,
                                  height: `${levelCircleSize}px`,
                                  fontFamily: 'var(--font-heading)',
                                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                  boxShadow: `0 0 12px rgba(251, 191, 36, 0.5), inset 0 1px 2px rgba(255,255,255,0.2)`,
                                }}
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                              >
                                {towerLevel}
                              </motion.div>
                              
                              <div 
                                className="h-full bg-slate-900/90 rounded-r-full overflow-hidden border-2 border-l-0 border-slate-700/80 shadow-lg backdrop-blur-sm"
                                style={{ width: `${expBarWidth}px` }}
                              >
                                <motion.div
                                  className="h-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 relative"
                                  style={{ width: `${expPercent}%` }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${expPercent}%` }}
                                  transition={{ duration: 0.5, ease: 'easeOut' }}
                                >
                                  <motion.div 
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                                    animate={{ x: ['-100%', '200%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                  />
                                </motion.div>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {monsters.map(monster => (
                        <div
                          key={monster.id}
                          className="absolute transition-all duration-75"
                          style={{
                            left: `${monster.position.x * CELL_SIZE}px`,
                            top: `${monster.position.y * CELL_SIZE}px`,
                            width: `${CELL_SIZE * 0.5}px`,
                            height: `${CELL_SIZE * 0.5}px`,
                            transform: 'translate(50%, 50%)',
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
                            {monster.armor !== undefined && monster.armor > 0 && (
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
                      
                      {damageNumbers.map(dmg => {
                        const age = Date.now() - dmg.timestamp
                        const opacity = Math.max(0, 1 - age / 1500)
                        const yOffset = (age / 1500) * 60
                        const scale = Math.min(1.3, 1 + (age / 500))
                        
                        return (
                          <div
                            key={dmg.id}
                            className="absolute pointer-events-none font-bold"
                            style={{
                              left: `${dmg.position.x * CELL_SIZE}px`,
                              top: `calc(${dmg.position.y * CELL_SIZE}px - ${yOffset}px)`,
                              transform: `translate(-50%, -50%) scale(${scale})`,
                              opacity: opacity,
                              zIndex: 10,
                              textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)',
                              fontSize: '20px',
                              color: '#ff4444',
                              fontFamily: 'var(--font-heading)',
                            }}
                          >
                            -{dmg.damage}
                          </div>
                        )
                      })}
                      
                      <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ zIndex: 9, overflow: 'visible' }} width={GRID_WIDTH * CELL_SIZE} height={GRID_HEIGHT * CELL_SIZE}>
                        {particles.map(particle => {
                          const age = Date.now() - particle.timestamp
                          const opacity = Math.max(0, 1 - age / particle.lifetime)
                          const x = particle.position.x * CELL_SIZE + CELL_SIZE / 2
                          const y = particle.position.y * CELL_SIZE + CELL_SIZE / 2
                          const size = particle.size
                          
                          return (
                            <g key={particle.id} opacity={opacity}>
                              <filter id={`particle-glow-${particle.id}`}>
                                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                              
                              {particle.shape === 'circle' && (
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={size / 2}
                                  fill={particle.color}
                                  filter={`url(#particle-glow-${particle.id})`}
                                />
                              )}
                              
                              {particle.shape === 'star' && (
                                <path
                                  d={`M ${x} ${y - size} L ${x + size * 0.3} ${y - size * 0.3} L ${x + size} ${y} L ${x + size * 0.3} ${y + size * 0.3} L ${x} ${y + size} L ${x - size * 0.3} ${y + size * 0.3} L ${x - size} ${y} L ${x - size * 0.3} ${y - size * 0.3} Z`}
                                  fill={particle.color}
                                  transform={`rotate(${particle.rotation * 180 / Math.PI} ${x} ${y})`}
                                  filter={`url(#particle-glow-${particle.id})`}
                                />
                              )}
                              
                              {particle.shape === 'square' && (
                                <rect
                                  x={x - size / 2}
                                  y={y - size / 2}
                                  width={size}
                                  height={size}
                                  fill={particle.color}
                                  transform={`rotate(${particle.rotation * 180 / Math.PI} ${x} ${y})`}
                                  filter={`url(#particle-glow-${particle.id})`}
                                />
                              )}
                              
                              {particle.shape === 'triangle' && (
                                <path
                                  d={`M ${x} ${y - size} L ${x + size} ${y + size / 2} L ${x - size} ${y + size / 2} Z`}
                                  fill={particle.color}
                                  transform={`rotate(${particle.rotation * 180 / Math.PI} ${x} ${y})`}
                                  filter={`url(#particle-glow-${particle.id})`}
                                />
                              )}
                              
                              {particle.shape === 'diamond' && (
                                <path
                                  d={`M ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} L ${x - size} ${y} Z`}
                                  fill={particle.color}
                                  transform={`rotate(${particle.rotation * 180 / Math.PI} ${x} ${y})`}
                                  filter={`url(#particle-glow-${particle.id})`}
                                />
                              )}
                              
                              {particle.shape === 'snowflake' && (
                                <g transform={`translate(${x} ${y}) rotate(${particle.rotation * 180 / Math.PI})`}>
                                  <line x1={-size} y1="0" x2={size} y2="0" stroke={particle.color} strokeWidth="1.5" />
                                  <line x1="0" y1={-size} x2="0" y2={size} stroke={particle.color} strokeWidth="1.5" />
                                  <line x1={-size * 0.7} y1={-size * 0.7} x2={size * 0.7} y2={size * 0.7} stroke={particle.color} strokeWidth="1.5" />
                                  <line x1={-size * 0.7} y1={size * 0.7} x2={size * 0.7} y2={-size * 0.7} stroke={particle.color} strokeWidth="1.5" />
                                </g>
                              )}
                              
                              {particle.shape === 'spark' && (
                                <g transform={`translate(${x} ${y}) rotate(${particle.rotation * 180 / Math.PI})`}>
                                  <line x1="0" y1={-size} x2="0" y2={size} stroke={particle.color} strokeWidth="2.5" strokeLinecap="round" filter={`url(#particle-glow-${particle.id})`} />
                                  <line x1={-size} y1="0" x2={size} y2="0" stroke={particle.color} strokeWidth="2.5" strokeLinecap="round" filter={`url(#particle-glow-${particle.id})`} />
                                  <circle cx="0" cy="0" r={size / 3} fill={particle.color} filter={`url(#particle-glow-${particle.id})`} />
                                </g>
                              )}
                            </g>
                          )
                        })}
                      </svg>
                      
                      {explosions.map(exp => {
                        const age = Date.now() - exp.timestamp
                        const progress = age / 500
                        const scale = 0.5 + progress * 2
                        const opacity = Math.max(0, 1 - progress)
                        
                        return (
                          <div
                            key={exp.id}
                            className="absolute pointer-events-none"
                            style={{
                              left: `${exp.position.x * CELL_SIZE}px`,
                              top: `${exp.position.y * CELL_SIZE}px`,
                              transform: `translate(-50%, -50%) scale(${scale})`,
                              zIndex: 8,
                            }}
                          >
                            {(exp.towerType === 'inferno' || exp.towerType === 'storm') && (
                              <>
                                <div
                                  className="absolute rounded-full"
                                  style={{
                                    width: 60,
                                    height: 60,
                                    backgroundColor: 'oklch(0.85 0.25 50)',
                                    opacity: opacity * 0.8,
                                    transform: 'translate(-50%, -50%)',
                                    boxShadow: `0 0 40px oklch(0.85 0.25 50)`,
                                  }}
                                />
                                <div
                                  className="absolute rounded-full"
                                  style={{
                                    width: 40,
                                    height: 40,
                                    backgroundColor: 'oklch(0.75 0.28 40)',
                                    opacity: opacity,
                                    transform: 'translate(-50%, -50%)',
                                  }}
                                />
                              </>
                            )}
                            {(exp.towerType === 'vortex' || exp.towerType === 'void') && (
                              <>
                                <div
                                  className="absolute rounded-full"
                                  style={{
                                    width: 50,
                                    height: 50,
                                    backgroundColor: exp.color,
                                    opacity: opacity * 0.6,
                                    transform: 'translate(-50%, -50%)',
                                    boxShadow: `0 0 30px ${exp.color}`,
                                  }}
                                />
                                <div
                                  className="absolute rounded-full"
                                  style={{
                                    width: 30,
                                    height: 30,
                                    backgroundColor: 'white',
                                    opacity: opacity * 0.9,
                                    transform: 'translate(-50%, -50%)',
                                  }}
                                />
                              </>
                            )}
                            {(exp.towerType === 'spark' || exp.towerType === 'cannon' || exp.towerType === 'laser' || exp.towerType === 'frost') && (
                              <>
                                <div
                                  className="absolute rounded-full"
                                  style={{
                                    width: 30,
                                    height: 30,
                                    backgroundColor: exp.color,
                                    opacity: opacity * 0.7,
                                    transform: 'translate(-50%, -50%)',
                                    boxShadow: `0 0 20px ${exp.color}`,
                                  }}
                                />
                                <div
                                  className="absolute rounded-full"
                                  style={{
                                    width: 15,
                                    height: 15,
                                    backgroundColor: 'white',
                                    opacity: opacity,
                                    transform: 'translate(-50%, -50%)',
                                  }}
                                />
                              </>
                            )}
                          </div>
                        )
                      })}
                      
                      {levelUpEffects.map(effect => {
                        const age = Date.now() - effect.timestamp
                        const progress = age / 2000
                        const scale = 1 + progress * 3
                        const opacity = Math.max(0, 1 - progress)
                        const yOffset = progress * -80
                        
                        return (
                          <motion.div
                            key={effect.id}
                            className="absolute pointer-events-none"
                            style={{
                              left: `${effect.position.x * CELL_SIZE}px`,
                              top: `${effect.position.y * CELL_SIZE}px`,
                              transform: `translate(-50%, calc(-50% + ${yOffset}px))`,
                              zIndex: 100,
                            }}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: scale, opacity: opacity }}
                          >
                            <div className="relative">
                              <div
                                className="absolute rounded-full"
                                style={{
                                  width: 120,
                                  height: 120,
                                  backgroundColor: effect.towerColor,
                                  opacity: opacity * 0.3,
                                  transform: 'translate(-50%, -50%)',
                                  boxShadow: `0 0 60px ${effect.towerColor}`,
                                  filter: 'blur(10px)',
                                }}
                              />
                              <div
                                className="absolute text-6xl font-bold"
                                style={{
                                  transform: 'translate(-50%, -50%)',
                                  textShadow: `0 0 20px ${effect.towerColor}, 0 0 40px ${effect.towerColor}, 2px 2px 4px rgba(0,0,0,0.8)`,
                                  color: '#FFD700',
                                  fontFamily: 'var(--font-heading)',
                                }}
                              >
                                ⚡
                              </div>
                              <div
                                className="absolute text-2xl font-bold"
                                style={{
                                  transform: 'translate(-50%, 100%)',
                                  textShadow: '2px 2px 6px rgba(0,0,0,0.9), 0 0 10px #FFD700',
                                  color: '#FFD700',
                                  fontFamily: 'var(--font-heading)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                LEVEL {effect.level}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                </Card>

                <div className="flex gap-2 justify-center overflow-x-auto overflow-y-hidden items-stretch px-4 py-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                  {(Object.keys(TOWER_TYPES) as Array<keyof typeof TOWER_TYPES>)
                    .sort((a, b) => TOWER_TYPES[a].cost - TOWER_TYPES[b].cost)
                    .map(type => {
                    const config = TOWER_TYPES[type]
                    const Icon = config.icon
                    const affordable = canAfford(type)
                    const selected = selectedTowerType === type

                    return (
                      <motion.div
                        key={type}
                        whileHover={affordable ? { scale: 1.08, y: -4 } : { scale: 1.02 }}
                        whileTap={affordable ? { scale: 0.92 } : {}}
                        transition={{ duration: 0.2 }}
                      >
                        <Button
                          variant="outline"
                          className={`h-auto p-0 flex flex-col items-center relative overflow-hidden transition-all duration-300 min-w-[90px] w-[90px] border-2 ${
                            affordable
                              ? selected
                                ? 'ring-4 ring-yellow-400/60 shadow-2xl'
                                : 'shadow-lg hover:shadow-xl'
                              : 'cursor-not-allowed opacity-60'
                          }`}
                          style={{
                            backgroundColor: affordable 
                              ? config.color
                              : 'oklch(0.25 0.05 0)',
                            borderColor: affordable
                              ? selected
                                ? 'oklch(0.95 0.05 90)'
                                : `color-mix(in oklch, ${config.color} 80%, white 20%)`
                              : 'oklch(0.35 0.03 0)',
                            boxShadow: affordable && !selected
                              ? `0 4px 12px ${config.color}40`
                              : affordable && selected
                                ? `0 8px 24px ${config.color}80, 0 0 40px ${config.color}60`
                                : 'none'
                          }}
                          onClick={() => affordable && setSelectedTowerType(selected ? null : type)}
                          disabled={!affordable}
                        >
                          {affordable && selected && (
                            <>
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                              />
                              <motion.div
                                className="absolute -top-1 -right-1 bg-yellow-400 rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-yellow-200 z-10"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                              >
                                <span className="text-sm font-bold text-slate-900">✓</span>
                              </motion.div>
                            </>
                          )}
                          
                          {affordable ? (
                            <div className="flex flex-col items-center w-full py-2 px-2 min-h-[122px]">
                              <div className="relative pt-1 pb-2">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-white/20 backdrop-blur-sm border-2 border-white/30">
                                  <Icon size={24} weight="fill" color="white" />
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-center gap-1.5 w-full">
                                <div className="grid grid-cols-3 gap-1 w-full">
                                  <div className="flex flex-col items-center">
                                    <Sword size={10} weight="fill" className="text-white/90" />
                                    <span className="text-[9px] font-semibold text-white/90">{config.damage}</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <Target size={10} weight="fill" className="text-white/90" />
                                    <span className="text-[9px] font-semibold text-white/90">{config.range}</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <Lightning size={10} weight="fill" className="text-white/90" />
                                    <span className="text-[9px] font-semibold text-white/90">{Math.round(1000/config.fireRate * 10)/10}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
                                  <Coin size={10} weight="fill" className="text-yellow-300" />
                                  <span className="text-xs font-bold text-white">{config.cost}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center w-full py-2 px-2 min-h-[122px]">
                              <div className="relative pt-1 pb-2">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-inner bg-slate-950/80 border-2 border-red-900/50">
                                  <Icon size={22} weight="fill" color="oklch(0.40 0.08 0)" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-red-900/90 backdrop-blur-sm rounded-full p-1.5 border-2 border-red-700">
                                    <span className="text-base">🔒</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-center gap-1.5 w-full">
                                <div className="grid grid-cols-3 gap-1 w-full">
                                  <div className="flex flex-col items-center">
                                    <Sword size={10} weight="fill" className="text-slate-600" />
                                    <span className="text-[9px] font-semibold text-slate-600">{config.damage}</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <Target size={10} weight="fill" className="text-slate-600" />
                                    <span className="text-[9px] font-semibold text-slate-600">{config.range}</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <Lightning size={10} weight="fill" className="text-slate-600" />
                                    <span className="text-[9px] font-semibold text-slate-600">{Math.round(1000/config.fireRate * 10)/10}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-red-900/50">
                                  <Coin size={10} weight="fill" className="text-red-700" />
                                  <span className="text-xs font-bold text-red-300">{config.cost}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </Button>
                      </motion.div>
                    )
                  })}
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App