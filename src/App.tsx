import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Heart, Coin, Play, Pause, ArrowClockwise, Lightning, Crosshair, Shield } from '@phosphor-icons/react'
import { toast } from 'sonner'

type Position = { x: number; y: number }
type MonsterType = 'normal' | 'fast' | 'tank' | 'boss'
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
}
type Tower = {
  id: string
  position: Position
  type: 'fast' | 'strong' | 'area'
  lastShot: number
  target: string | null
}
type Projectile = {
  id: string
  start: Position
  target: Position
  towerId: string
  damage: number
}
type GameState = 'menu' | 'playing' | 'paused' | 'gameOver'

const GRID_SIZE = 8
const CELL_SIZE = 60
const PATH: Position[] = [
  { x: 0, y: 3 },
  { x: 1, y: 3 },
  { x: 2, y: 3 },
  { x: 2, y: 2 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },
  { x: 4, y: 1 },
  { x: 5, y: 1 },
  { x: 5, y: 2 },
  { x: 5, y: 3 },
  { x: 5, y: 4 },
  { x: 5, y: 5 },
  { x: 6, y: 5 },
  { x: 7, y: 5 },
]

const MONSTER_TYPES = {
  normal: { emoji: '👾', color: 'oklch(0.75 0.18 60)', healthMult: 1, speedMult: 1, rewardMult: 1 },
  fast: { emoji: '🐰', color: 'oklch(0.70 0.20 180)', healthMult: 0.6, speedMult: 1.8, rewardMult: 1.2 },
  tank: { emoji: '🦏', color: 'oklch(0.65 0.15 280)', healthMult: 2.5, speedMult: 0.6, rewardMult: 1.5 },
  boss: { emoji: '👹', color: 'oklch(0.55 0.25 20)', healthMult: 5, speedMult: 0.4, rewardMult: 3 },
}

const TOWER_TYPES = {
  fast: { cost: 50, damage: 10, range: 1.5, fireRate: 500, color: 'oklch(0.75 0.20 180)', icon: Lightning, name: 'Zapper' },
  strong: { cost: 100, damage: 40, range: 2, fireRate: 1500, color: 'oklch(0.70 0.25 20)', icon: Crosshair, name: 'Blaster' },
  area: { cost: 150, damage: 15, range: 2.5, fireRate: 1000, color: 'oklch(0.65 0.25 300)', icon: Shield, name: 'Guardian' },
}

function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [towers, setTowers] = useState<Tower[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [health, setHealth] = useState(10)
  const [coins, setCoins] = useState(150)
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  const [monstersSpawnedThisWave, setMonstersSpawnedThisWave] = useState(0)
  const [selectedTowerType, setSelectedTowerType] = useState<keyof typeof TOWER_TYPES | null>(null)
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null)
  const [highScore, setHighScore] = useKV<number>('monster-defenders-high-score', 0)

  const isPathCell = (x: number, y: number) => PATH.some(p => p.x === x && p.y === y)
  const hasTower = (x: number, y: number) => towers.some(t => t.position.x === x && t.position.y === y)

  const distance = (p1: Position, p2: Position) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))

  const getMonsterTypeForWave = (wave: number, index: number): MonsterType => {
    if (wave % 5 === 0 && index === 0) return 'boss'
    if (wave >= 10 && Math.random() < 0.3) return 'tank'
    if (wave >= 5 && Math.random() < 0.4) return 'fast'
    return 'normal'
  }

  const spawnMonster = useCallback(() => {
    const id = `monster-${Date.now()}-${Math.random()}`
    const type = getMonsterTypeForWave(wave, monstersSpawnedThisWave)
    const monsterConfig = MONSTER_TYPES[type]
    
    const baseHealth = 30 + (wave - 1) * 10
    const baseSpeed = 0.015 + (wave - 1) * 0.002
    const baseReward = 25 + wave * 5
    
    const newMonster: Monster = {
      id,
      position: { ...PATH[0] },
      health: baseHealth * monsterConfig.healthMult,
      maxHealth: baseHealth * monsterConfig.healthMult,
      speed: baseSpeed * monsterConfig.speedMult,
      pathIndex: 0,
      reward: Math.floor(baseReward * monsterConfig.rewardMult),
      type,
      emoji: monsterConfig.emoji,
      color: monsterConfig.color,
    }
    
    setMonsters(prev => [...prev, newMonster])
    setMonstersSpawnedThisWave(prev => prev + 1)
  }, [wave, monstersSpawnedThisWave])

  const startGame = () => {
    setGameState('playing')
    setMonsters([])
    setTowers([])
    setProjectiles([])
    setHealth(10)
    setCoins(150)
    setScore(0)
    setWave(1)
    setMonstersSpawnedThisWave(0)
    setSelectedTowerType(null)
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

    const monstersPerWave = 5 + wave * 2
    
    if (monstersSpawnedThisWave >= monstersPerWave) return

    const spawnInterval = setInterval(() => {
      if (monstersSpawnedThisWave < monstersPerWave) {
        spawnMonster()
      }
    }, 2000)

    return () => clearInterval(spawnInterval)
  }, [gameState, monstersSpawnedThisWave, wave, spawnMonster])

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
                  const newHealth = m.health - config.damage
                  if (newHealth <= 0) {
                    setCoins(c => c + m.reward)
                    setScore(s => s + m.reward * wave)
                    toast.success(`+${m.reward} coins!`)
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
      if (score > (highScore || 0)) {
        setHighScore(score)
        toast.success('New High Score!')
      }
    }
  }, [health, gameState, score, highScore, setHighScore])

  useEffect(() => {
    if (gameState === 'playing' && monsters.length === 0 && monstersSpawnedThisWave > 0 && towers.length >= 0) {
      const checkComplete = setTimeout(() => {
        if (monsters.length === 0) {
          setWave(w => w + 1)
          setMonstersSpawnedThisWave(0)
          toast.success(`Wave ${wave} Complete! 🎉`)
        }
      }, 2000)
      return () => clearTimeout(checkComplete)
    }
  }, [gameState, monsters.length, monstersSpawnedThisWave, towers.length, wave])

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
              <p className="text-lg">🌊 Survive as many waves as you can!</p>
            </div>
            {highScore && highScore > 0 && (
              <Badge variant="secondary" className="text-xl px-4 py-2 mb-4">
                High Score: {highScore.toLocaleString()}
              </Badge>
            )}
            <Button size="lg" onClick={startGame} className="text-2xl px-8 py-6">
              <Play className="mr-2" size={32} weight="fill" />
              Start Game
            </Button>
          </Card>
        )}

        {gameState === 'gameOver' && (
          <Card className="max-w-2xl mx-auto p-8 text-center">
            <h2 className="text-4xl font-bold mb-4 text-destructive">Game Over!</h2>
            <p className="text-2xl mb-4">Wave Reached: {wave}</p>
            <p className="text-3xl font-bold text-primary mb-6">Final Score: {score.toLocaleString()}</p>
            {score === (highScore || 0) && score > 0 && (
              <Badge variant="default" className="text-xl px-4 py-2 mb-4">
                🎉 New High Score! 🎉
              </Badge>
            )}
            <Button size="lg" onClick={startGame} className="text-2xl px-8 py-6">
              <ArrowClockwise className="mr-2" size={32} weight="fill" />
              Play Again
            </Button>
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

              <Card className="p-6 bg-gradient-to-br from-blue-50 to-green-50">
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
                          transform: monster.type === 'boss' ? 'scale(1.3)' : 'scale(1)',
                        }}
                      >
                        {monster.emoji}
                        {monster.type === 'boss' && (
                          <div className="absolute -top-1 -right-1 text-xs">👑</div>
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
                              Range: {config.range} • Damage: {config.damage}
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
                <h3 className="text-lg font-bold mb-2">Wave {wave}</h3>
                <p className="text-sm text-muted-foreground">
                  Monsters: {monstersSpawnedThisWave} / {5 + wave * 2}
                </p>
                {wave % 5 === 0 && (
                  <Badge variant="destructive" className="mt-2">
                    Boss Wave! 👹
                  </Badge>
                )}
              </Card>

              <Card className="p-4 bg-accent/10">
                <h3 className="text-lg font-bold mb-2 text-accent-foreground">👾 Enemies</h3>
                <div className="text-sm space-y-2 text-accent-foreground/90">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👾</span>
                    <span>Normal - Balanced</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🐰</span>
                    <span>Fast - Quick but weak</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🦏</span>
                    <span>Tank - Slow but tough</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👹</span>
                    <span>Boss - Every 5th wave</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-muted/50">
                <h3 className="text-lg font-bold mb-2">💡 Tips</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Place defenders near curves</li>
                  <li>• Mix fast and strong types</li>
                  <li>• Save coins for boss waves</li>
                  <li>• Use zappers for fast enemies</li>
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