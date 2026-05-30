'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Trophy, Gamepad2, RefreshCw } from 'lucide-react'

// ─── Game constants ──────────────────────────────────────────────────────────
const W = 700
const H = 200
const GROUND_Y = 160
const DINO_W = 44
const DINO_H = 48
const DINO_X = 60
const GRAVITY = 0.6
const JUMP_FORCE = -13
const INITIAL_SPEED = 5
const MAX_SPEED = 14

type GameState = 'idle' | 'playing' | 'dead'

interface Cactus {
  x: number
  w: number
  h: number
}

interface Cloud {
  x: number
  y: number
  w: number
}

interface LeaderboardEntry {
  rank: number
  score: number
  masked_qq: string
  nickname: string
  user_id: string
}

function drawDino(ctx: CanvasRenderingContext2D, x: number, y: number, isDead: boolean) {
  const color = isDead ? '#ef4444' : '#1a1a1a'
  ctx.fillStyle = color
  // Body
  ctx.fillRect(x + 8, y, 28, 32)
  // Head
  ctx.fillRect(x + 16, y - 16, 24, 18)
  // Eye
  ctx.fillStyle = '#fff'
  ctx.fillRect(x + 30, y - 13, 6, 6)
  ctx.fillStyle = isDead ? '#ef4444' : '#000'
  ctx.fillRect(x + 32, y - 12, 4, 4)
  // Legs
  ctx.fillStyle = color
  ctx.fillRect(x + 10, y + 32, 10, 10)
  ctx.fillRect(x + 24, y + 32, 10, 10)
}

function drawCactus(ctx: CanvasRenderingContext2D, c: Cactus) {
  ctx.fillStyle = '#16a34a'
  // Main stem
  ctx.fillRect(c.x + c.w / 2 - 5, GROUND_Y - c.h, 10, c.h)
  // Arms
  ctx.fillRect(c.x, GROUND_Y - c.h * 0.7, c.w, 8)
  ctx.fillRect(c.x, GROUND_Y - c.h * 0.7, 8, c.h * 0.4)
  ctx.fillRect(c.x + c.w - 8, GROUND_Y - c.h * 0.7, 8, c.h * 0.4)
}

export function DinoGame({ userId }: { userId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef({
    state: 'idle' as GameState,
    dinoY: GROUND_Y - DINO_H,
    dinoVY: 0,
    onGround: true,
    score: 0,
    hiScore: 0,
    speed: INITIAL_SPEED,
    cacti: [] as Cactus[],
    clouds: [] as Cloud[],
    frameCount: 0,
    groundX: 0,
    animFrame: 0,
  })

  const [displayScore, setDisplayScore] = useState(0)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const rafRef = useRef<number>(0)

  // Load leaderboard
  const fetchLeaderboard = useCallback(() => {
    setLeaderboardLoading(true)
    fetch('/api/user/dino')
      .then((r) => r.json())
      .then(setLeaderboard)
      .finally(() => setLeaderboardLoading(false))
  }, [])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const submitScore = useCallback(async (score: number) => {
    if (score <= 0) return
    await fetch('/api/user/dino', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    })
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const spawnCactus = useCallback(() => {
    const h = 30 + Math.random() * 40
    const w = 24 + Math.random() * 24
    gameRef.current.cacti.push({ x: W + 10, w, h })
  }, [])

  const spawnCloud = useCallback(() => {
    gameRef.current.clouds.push({
      x: W + 10,
      y: 20 + Math.random() * 60,
      w: 60 + Math.random() * 60,
    })
  }, [])

  const startGame = useCallback(() => {
    const g = gameRef.current
    g.state = 'playing'
    g.dinoY = GROUND_Y - DINO_H
    g.dinoVY = 0
    g.onGround = true
    g.score = 0
    g.speed = INITIAL_SPEED
    g.cacti = []
    g.clouds = []
    g.frameCount = 0
    g.groundX = 0
    setDisplayScore(0)
    setGameState('playing')
  }, [])

  const jump = useCallback(() => {
    const g = gameRef.current
    if (g.state === 'idle' || g.state === 'dead') {
      startGame()
      return
    }
    if (g.onGround) {
      g.dinoVY = JUMP_FORCE
      g.onGround = false
    }
  }, [startGame])

  // Key / tap handlers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        jump()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [jump])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    function loop() {
      const g = gameRef.current
      ctx.clearRect(0, 0, W, H)

      // Sky
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(0, 0, W, H)

      // Clouds
      g.clouds.forEach((c) => {
        ctx.fillStyle = 'rgba(203,213,225,0.7)'
        ctx.beginPath()
        ctx.ellipse(c.x + c.w / 2, c.y, c.w / 2, 14, 0, 0, Math.PI * 2)
        ctx.fill()
      })

      // Ground
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(0, GROUND_Y, W, 4)
      ctx.fillStyle = '#cbd5e1'
      // Ground dashes
      for (let i = 0; i < 10; i++) {
        const dx = ((g.groundX + i * 80) % W)
        ctx.fillRect(dx, GROUND_Y + 10, 50, 3)
      }

      if (g.state === 'idle') {
        drawDino(ctx, DINO_X, g.dinoY, false)
        ctx.fillStyle = '#64748b'
        ctx.font = '14px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('按空格键 / 点击 开始游戏', W / 2, H / 2 - 10)
        ctx.textAlign = 'left'
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      if (g.state === 'playing') {
        g.frameCount++
        g.score++
        g.speed = Math.min(MAX_SPEED, INITIAL_SPEED + g.score / 400)
        if (g.score > g.hiScore) g.hiScore = g.score

        // Update ground scroll
        g.groundX = (g.groundX - g.speed) % W
        if (g.groundX < 0) g.groundX += W

        // Spawn cacti
        if (g.frameCount % Math.floor(80 - g.speed * 4) === 0) spawnCactus()
        // Spawn clouds
        if (g.frameCount % 120 === 0) spawnCloud()

        // Physics
        if (!g.onGround) {
          g.dinoVY += GRAVITY
          g.dinoY += g.dinoVY
        }
        if (g.dinoY >= GROUND_Y - DINO_H) {
          g.dinoY = GROUND_Y - DINO_H
          g.dinoVY = 0
          g.onGround = true
        }

        // Move cacti & clouds
        g.cacti = g.cacti.filter((c) => c.x + c.w > -10)
        g.cacti.forEach((c) => (c.x -= g.speed))
        g.clouds = g.clouds.filter((c) => c.x + c.w > -10)
        g.clouds.forEach((c) => (c.x -= g.speed * 0.3))

        // Collision
        const px = DINO_X + 12, py = g.dinoY + 4, pw = DINO_W - 18, ph = DINO_H - 8
        for (const c of g.cacti) {
          const overlap =
            px < c.x + c.w - 4 &&
            px + pw > c.x + 4 &&
            py < GROUND_Y &&
            py + ph > GROUND_Y - c.h + 4
          if (overlap) {
            g.state = 'dead'
            setGameState('dead')
            submitScore(Math.floor(g.score / 5))
            break
          }
        }

        setDisplayScore(Math.floor(g.score / 5))
      }

      // Draw cacti
      g.cacti.forEach((c) => drawCactus(ctx, c))

      // Draw dino
      drawDino(ctx, DINO_X, g.dinoY, g.state === 'dead')

      // Score overlay
      ctx.fillStyle = '#475569'
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`HI ${String(g.hiScore).padStart(5, '0')}  ${String(Math.floor(g.score / 5)).padStart(5, '0')}`, W - 10, 20)
      ctx.textAlign = 'left'

      if (g.state === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 22px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', W / 2, H / 2 - 10)
        ctx.font = '14px system-ui, sans-serif'
        ctx.fillText('按空格键重新开始', W / 2, H / 2 + 16)
        ctx.textAlign = 'left'
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [spawnCactus, spawnCloud, submitScore])

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Gamepad2 className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Dino Game</h1>
        <Badge variant="secondary" className="ml-auto font-mono">
          {String(displayScore).padStart(5, '0')}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Game canvas */}
        <div className="lg:col-span-2 space-y-3">
          <div
            className="rounded-xl border overflow-hidden cursor-pointer select-none"
            onClick={jump}
          >
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="block w-full"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            按 <kbd className="px-1.5 py-0.5 rounded border text-xs font-mono">空格</kbd> 或点击跳跃
          </p>
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="size-4 text-yellow-500" />
                排行榜
              </CardTitle>
              <Button variant="ghost" size="icon" className="size-7" onClick={fetchLeaderboard}>
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-3 p-0">
            {leaderboardLoading ? (
              <p className="text-xs text-muted-foreground text-center py-6">加载中…</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">暂无记录</p>
            ) : (
              <ol className="divide-y">
                {leaderboard.map((entry) => (
                  <li key={entry.user_id} className="flex items-center gap-2 px-4 py-2.5">
                    <span
                      className={`w-5 text-center text-xs font-bold shrink-0 ${
                        entry.rank === 1
                          ? 'text-yellow-500'
                          : entry.rank === 2
                            ? 'text-slate-400'
                            : entry.rank === 3
                              ? 'text-amber-600'
                              : 'text-muted-foreground'
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{entry.nickname ?? '???'}</p>
                      <p className="text-xs text-muted-foreground font-mono">{entry.masked_qq}</p>
                    </div>
                    <span className="text-xs font-mono font-semibold shrink-0">
                      {String(entry.score).padStart(5, '0')}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
