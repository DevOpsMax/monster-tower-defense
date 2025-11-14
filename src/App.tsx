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
  fast: { cost: 150, damage: 10, range: 1.5, fireRate: 500, color: 'oklch(0.75 0.20 180)', icon: Lightning, name: 'Zapper', desc: 'Rapid fire' },
  strong: { cost: 300, damage: 40, range: 2, fireRate: 1500, color: 'oklch(0.70 0.25 20)', icon: Crosshair, name: 'Blaster', desc: 'High damage' },
  area: { cost: 450, damage: 15, range: 2.5, fireRate: 1000, color: 'oklch(0.65 0.25 300)', icon: Shield, name: 'Guardian', desc: 'Area damage' },
  sniper: { cost: 600, damage: 100, range: 4, fireRate: 2500, color: 'oklch(0.68 0.22 340)', icon: Target, name: 'Sniper', desc: 'Long range' },
  freeze: { cost: 360, damage: 5, range: 2, fireRate: 800, color: 'oklch(0.72 0.18 240)', icon: Snowflake, name: 'Freezer', desc: 'Slows enemies' },
  bomb: { cost: 750, damage: 80, range: 2, fireRate: 3000, color: 'oklch(0.62 0.24 40)', icon: Bomb, name: 'Bomber', desc: 'Explosive' },
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

  useEffect(() => {
    if (gameState !== 'playing' || wave > 10) return
    if (bossSpawned) return

    const monstersPerWave = 8 + wave * 3
    
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
              towerType: tower.type,
              progress: 0,
              trail: [],
            }
            setProjectiles(p => [...p, projectile])

            setTimeout(() => {
              setMonsters(prev => prev.map(m => {
                if (m.id === target.id) {
                  const armorReduction = m.armor && m.armor > 0 ? config.damage * m.armor : 0
                  const actualDamage = Math.max(1, config.damage - armorReduction)
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
                  
                  const particleCount = tower.type === 'area' || tower.type === 'bomb' ? 20 : 12
                  const newParticles: Particle[] = []
                  
                  let particleShape: Particle['shape'] = 'circle'
                  if (tower.type === 'fast') particleShape = 'star'
                  else if (tower.type === 'strong') particleShape = 'square'
                  else if (tower.type === 'area') particleShape = 'triangle'
                  else if (tower.type === 'sniper') particleShape = 'diamond'
                  else if (tower.type === 'freeze') particleShape = 'snowflake'
                  else if (tower.type === 'bomb') particleShape = 'spark'
                  
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
                      size: tower.type === 'bomb' || tower.type === 'area' ? 8 : 5,
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

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      {(gameState === 'menu' || gameState === 'mapSelect' || gameState === 'leaderboard' || gameState === 'gameOver') && (
        <header className="text-center py-4 shrink-0">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            🛡️ Monster Defenders
          </h1>
          <p className="text-muted-foreground text-sm">Stop the cute monsters from reaching your base!</p>
        </header>
      )}
      
      <div className="flex-1 overflow-auto px-4 pb-4">
        {gameState === 'menu' && (
          <div className="max-w-4xl mx-auto">
            <Card className="p-6 text-center">
              <h2 className="text-2xl font-bold mb-3 text-primary">How to Play</h2>
              <div className="space-y-1.5 text-left mb-4 text-sm">
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
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-primary text-center">Choose Your Adventure</h2>
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
                      {map.difficulty} • {map.gridSize}x{map.gridSize}
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
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-primary text-center">🏆 Top 10 Scores</h2>
              {leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {leaderboard.map((entry, index) => (
                    <div key={entry.timestamp} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? 'default' : 'secondary'} className="text-lg px-2 py-0.5">
                          #{index + 1}
                        </Badge>
                        <div>
                          <p className="text-base font-bold">{entry.score.toLocaleString()} pts</p>
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
            <Card className="p-6 text-center">
              <h2 className="text-2xl font-bold mb-3 text-destructive">
                {wave >= 10 ? '🎉 Victory! 🎉' : 'Game Over!'}
              </h2>
              <p className="text-lg mb-1">{currentMap.emoji} {currentMap.name}</p>
              <p className="text-lg mb-2">Wave Reached: {wave}/10</p>
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
            <Card className="p-2 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-sm px-2 py-0.5">
                    <Heart className="mr-1" weight="fill" size={16} />
                    {health}
                  </Badge>
                  <Badge variant="default" className="text-sm px-2 py-0.5">
                    <Coin className="mr-1" weight="fill" size={16} />
                    {coins}
                  </Badge>
                  <Badge variant="secondary" className="text-sm px-2 py-0.5">
                    Wave {wave}/10
                  </Badge>
                  <Badge variant="outline" className="text-sm px-2 py-0.5" style={{ backgroundColor: WEATHER_EFFECTS[weather].color }}>
                    {WEATHER_EFFECTS[weather].emoji} {WEATHER_EFFECTS[weather].name}
                  </Badge>
                  <Badge variant="outline" className="text-sm px-2 py-0.5">
                    Score: {score.toLocaleString()}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  {gameState === 'playing' && (
                    <Button size="sm" variant="outline" onClick={() => setGameState('paused')}>
                      <Pause weight="fill" size={16} />
                    </Button>
                  )}
                  {gameState === 'paused' && (
                    <Button size="sm" variant="outline" onClick={() => setGameState('playing')}>
                      <Play weight="fill" size={16} />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={startGame}>
                    <ArrowClockwise weight="fill" size={16} />
                  </Button>
                </div>
              </div>
            </Card>

            <div className="flex-1 flex gap-2 overflow-hidden">
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <Card className="flex-1 p-3 bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden">
                  <div
                    className="relative mx-auto bg-card rounded-lg shadow-inner h-full w-full flex items-center justify-center"
                  >
                    <div 
                      className="relative w-full h-full"
                    >
                      <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ zIndex: 1 }} viewBox={`0 0 ${GRID_SIZE * CELL_SIZE} ${GRID_SIZE * CELL_SIZE}`} preserveAspectRatio="xMidYMid meet">
                        <path
                          d={`M ${PATH.map((p, i) => `${p.x * CELL_SIZE + CELL_SIZE / 2} ${p.y * CELL_SIZE + CELL_SIZE / 2}`).join(' L ')}`}
                          stroke="oklch(0.85 0.02 90)"
                          strokeWidth="24"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      
                      <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ zIndex: 100, overflow: 'visible' }} viewBox={`0 0 ${GRID_SIZE * CELL_SIZE} ${GRID_SIZE * CELL_SIZE}`} preserveAspectRatio="xMidYMid meet">
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
                              {proj.towerType === 'fast' && (
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
                              
                              {proj.towerType === 'strong' && (
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
                              
                              {proj.towerType === 'area' && (
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
                              
                              {proj.towerType === 'sniper' && (
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
                              
                              {proj.towerType === 'freeze' && (
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
                              
                              {proj.towerType === 'bomb' && (
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
                            </g>
                          )
                        })}
                      </svg>

                      <div
                        className="absolute flex items-center justify-center text-3xl bg-green-500 rounded-full shadow-lg border-4 border-green-600 animate-pulse"
                        style={{
                          left: `${(PATH[0].x / GRID_SIZE) * 100}%`,
                          top: `${(PATH[0].y / GRID_SIZE) * 100}%`,
                          width: `${(0.5 / GRID_SIZE) * 100}%`,
                          height: `${(0.5 / GRID_SIZE) * 100}%`,
                          transform: 'translate(50%, 50%)',
                          zIndex: 2,
                        }}
                      >
                        ▶️
                      </div>

                      <div
                        className="absolute flex items-center justify-center text-3xl bg-red-500 rounded-full shadow-lg border-4 border-red-600"
                        style={{
                          left: `${(PATH[PATH.length - 1].x / GRID_SIZE) * 100}%`,
                          top: `${(PATH[PATH.length - 1].y / GRID_SIZE) * 100}%`,
                          width: `${(0.5 / GRID_SIZE) * 100}%`,
                          height: `${(0.5 / GRID_SIZE) * 100}%`,
                          transform: 'translate(50%, 50%)',
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
                                left: `${(x / GRID_SIZE) * 100}%`,
                                top: `${(y / GRID_SIZE) * 100}%`,
                                width: `${(1 / GRID_SIZE) * 100}%`,
                                height: `${(1 / GRID_SIZE) * 100}%`,
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
                            left: `${((hoveredCell.x + 0.5 - TOWER_TYPES[selectedTowerType].range) / GRID_SIZE) * 100}%`,
                            top: `${((hoveredCell.y + 0.5 - TOWER_TYPES[selectedTowerType].range) / GRID_SIZE) * 100}%`,
                            width: `${((TOWER_TYPES[selectedTowerType].range * 2) / GRID_SIZE) * 100}%`,
                            height: `${((TOWER_TYPES[selectedTowerType].range * 2) / GRID_SIZE) * 100}%`,
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
                              left: `${(tower.position.x / GRID_SIZE) * 100}%`,
                              top: `${(tower.position.y / GRID_SIZE) * 100}%`,
                              width: `${(0.5 / GRID_SIZE) * 100}%`,
                              height: `${(0.5 / GRID_SIZE) * 100}%`,
                              transform: 'translate(50%, 50%)',
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
                            left: `${(monster.position.x / GRID_SIZE) * 100}%`,
                            top: `${(monster.position.y / GRID_SIZE) * 100}%`,
                            width: `${(0.5 / GRID_SIZE) * 100}%`,
                            height: `${(0.5 / GRID_SIZE) * 100}%`,
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
                              left: `${(dmg.position.x / GRID_SIZE) * 100}%`,
                              top: `calc(${(dmg.position.y / GRID_SIZE) * 100}% - ${yOffset}px)`,
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
                      
                      <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ zIndex: 9, overflow: 'visible' }} viewBox={`0 0 ${GRID_SIZE * CELL_SIZE} ${GRID_SIZE * CELL_SIZE}`} preserveAspectRatio="xMidYMid meet">
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
                              left: `${(exp.position.x / GRID_SIZE) * 100}%`,
                              top: `${(exp.position.y / GRID_SIZE) * 100}%`,
                              transform: `translate(-50%, -50%) scale(${scale})`,
                              zIndex: 8,
                            }}
                          >
                            {exp.towerType === 'bomb' && (
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
                            {exp.towerType === 'area' && (
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
                            {(exp.towerType === 'fast' || exp.towerType === 'strong' || exp.towerType === 'sniper' || exp.towerType === 'freeze') && (
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
                    </div>
                  </div>
                </Card>

                <Card className="p-2 shrink-0">
                  <h3 className="text-sm font-bold mb-2 text-primary text-center">🛡️ Place Defenders</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {(Object.keys(TOWER_TYPES) as Array<keyof typeof TOWER_TYPES>).map(type => {
                      const config = TOWER_TYPES[type]
                      const Icon = config.icon
                      const affordable = canAfford(type)
                      const selected = selectedTowerType === type

                      return (
                        <Button
                          key={type}
                          variant={selected ? 'default' : 'outline'}
                          className="h-auto py-2 px-1.5 flex flex-col items-center justify-center gap-1"
                          onClick={() => setSelectedTowerType(selected ? null : type)}
                          disabled={!affordable}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: config.color }}
                          >
                            <Icon size={16} weight="fill" color="white" />
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-xs">{config.name}</div>
                          </div>
                          <Badge variant={affordable ? 'secondary' : 'outline'} className="text-xs px-1 py-0">
                            <Coin size={10} weight="fill" className="mr-0.5" />
                            {config.cost}
                          </Badge>
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 text-center">
                    💰 +1 coin/sec • Click defender then grid to place
                  </p>
                </Card>
              </div>

              <div className="w-64 flex flex-col gap-2 overflow-y-auto shrink-0">
                <Card className="p-3 bg-secondary/20">
                  <h3 className="text-sm font-bold mb-2">Wave {wave}/10</h3>
                  <p className="text-xs text-muted-foreground mb-1">
                    Monsters: {monstersSpawnedThisWave} / {8 + wave * 3}
                  </p>
                  {!bossSpawned && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Boss incoming...
                    </Badge>
                  )}
                  {bossSpawned && !bossDefeated && (
                    <Badge variant="destructive" className="mt-1 animate-pulse text-xs">
                      👹 BOSS ACTIVE!
                    </Badge>
                  )}
                  {bossDefeated && (
                    <Badge variant="default" className="mt-1 text-xs">
                      ✓ Boss Defeated!
                    </Badge>
                  )}
                </Card>

                <Card className="p-3 bg-accent/10">
                  <h3 className="text-sm font-bold mb-2 text-accent-foreground">👾 Enemies</h3>
                  <div className="text-xs space-y-0.5 text-accent-foreground/90">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">👾</span>
                      <span>Normal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🐰</span>
                      <span>Fast</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🦏</span>
                      <span>Tank</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">👹</span>
                      <span>Boss</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🦅</span>
                      <span>Flying</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🛡️</span>
                      <span>Armored</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🐜</span>
                      <span>Swarm</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 bg-muted/50">
                  <h3 className="text-sm font-bold mb-2">💡 Tips</h3>
                  <ul className="text-xs space-y-0.5 text-muted-foreground">
                    <li>• Defeat boss to advance</li>
                    <li>• 10 waves per adventure</li>
                    <li>• Place at curves</li>
                    <li>• Snipers = long range</li>
                    <li>• Bombers = area damage</li>
                    <li>• Weather affects speed</li>
                    <li>• Armor reduces damage</li>
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App