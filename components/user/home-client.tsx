'use client'

import type { CharonUser } from '@/lib/db/schema'
import { getQQAvatarUrl } from '@/lib/onebot'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CalendarDays, LogIn, Mail, User } from 'lucide-react'

interface Props {
  user: CharonUser
}

export function HomeClient({ user }: Props) {
  const avatarUrl = getQQAvatarUrl(user.qqId, 640)

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">个人主页</h1>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="size-20 ring-2 ring-border">
              <AvatarImage src={avatarUrl} alt={user.nickname ?? ''} />
              <AvatarFallback className="text-2xl">{user.nickname?.[0] ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <CardTitle className="text-xl">{user.nickname ?? '未知用户'}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono">{user.qqId}</p>
              <div className="flex gap-2 pt-1">
                <Badge variant="secondary">Lv.{user.level ?? 0}</Badge>
                {user.sex && user.sex !== 'unknown' && (
                  <Badge variant="outline">{user.sex === 'male' ? '男' : '女'}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="size-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">邮箱</span>
            <span className="ml-auto font-mono">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <User className="size-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">QQ 号</span>
            <span className="ml-auto font-mono">{user.qqId}</span>
          </div>
          {user.age ? (
            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="size-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">年龄</span>
              <span className="ml-auto">{user.age}</span>
            </div>
          ) : null}
          <div className="flex items-center gap-3 text-sm">
            <LogIn className="size-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">登录天数</span>
            <span className="ml-auto">{user.loginDays ?? 0} 天</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CalendarDays className="size-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">注册时间</span>
            <span className="ml-auto">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}
            </span>
          </div>
          {user.lastLoginAt && (
            <div className="flex items-center gap-3 text-sm">
              <LogIn className="size-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">上次登录</span>
              <span className="ml-auto">
                {new Date(user.lastLoginAt).toLocaleString('zh-CN')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
