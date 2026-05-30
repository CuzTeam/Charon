/**
 * OneBot V11 HTTP client (NapCat compatible)
 * Spec: https://github.com/botuniverse/onebot-11
 */

export interface OneBotConfig {
  baseUrl: string
  accessToken?: string | null
}

export interface GroupMember {
  group_id: number
  user_id: number
  nickname: string
  card: string
  sex: string
  age: number
  area: string
  join_time: number
  last_sent_time: number
  level: string
  role: string
  unfriendly: boolean
  title: string
  title_expire_time: number
  card_changeable: boolean
}

export interface MessageSegment {
  type: string
  data: Record<string, string>
}

export interface GroupMessage {
  time: number
  message_type: string
  message_id: number
  real_id: number
  sender: {
    user_id: number
    nickname: string
    card: string
    sex: string
    age: number
    area: string
    level: string
    role: string
    title: string
  }
  message: MessageSegment[]
  raw_message: string
}

async function onebotRequest<T>(
  config: OneBotConfig,
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.accessToken) {
    headers['Authorization'] = `Bearer ${config.accessToken}`
  }

  const res = await fetch(`${config.baseUrl}/${action}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    throw new Error(`OneBot HTTP error: ${res.status}`)
  }

  const data = await res.json()
  if (data.status === 'failed') {
    throw new Error(`OneBot error: ${data.msg ?? data.wording ?? 'Unknown error'}`)
  }

  return data.data as T
}

/**
 * Get recent messages from a group
 * NapCat: POST /get_group_msg_history
 */
export async function getGroupMsgHistory(
  config: OneBotConfig,
  groupId: string,
  count: number = 20,
): Promise<GroupMessage[]> {
  const data = await onebotRequest<{ messages: GroupMessage[] }>(config, 'get_group_msg_history', {
    group_id: parseInt(groupId),
    count,
  })
  // NapCat returns { messages: [...] }, some impls return array directly
  if (Array.isArray(data)) return data as unknown as GroupMessage[]
  return data?.messages ?? []
}

/**
 * Get info about a group member
 * POST /get_group_member_info
 */
export async function getGroupMemberInfo(
  config: OneBotConfig,
  groupId: string,
  userId: number,
  noCache: boolean = true,
): Promise<GroupMember> {
  return onebotRequest<GroupMember>(config, 'get_group_member_info', {
    group_id: parseInt(groupId),
    user_id: userId,
    no_cache: noCache,
  })
}

/**
 * Get stranger (non-friend) info
 * POST /get_stranger_info
 */
export async function getStrangerInfo(
  config: OneBotConfig,
  userId: number,
  noCache: boolean = true,
) {
  return onebotRequest<{
    user_id: number
    nickname: string
    sex: string
    age: number
  }>(config, 'get_stranger_info', {
    user_id: userId,
    no_cache: noCache,
  })
}

/**
 * Get bot's own info
 * POST /get_login_info
 */
export async function getLoginInfo(config: OneBotConfig) {
  return onebotRequest<{ user_id: number; nickname: string }>(config, 'get_login_info', {})
}

/**
 * Build QQ avatar URL from QQ ID
 * Uses the official QQ avatar CDN
 */
export function getQQAvatarUrl(qqId: string, size: number = 100): string {
  return `https://q1.qlogo.cn/g?b=qq&nk=${qqId}&s=${size}`
}

/**
 * Extract plain text from a message's segments
 */
export function extractMessageText(message: MessageSegment[]): string {
  return message
    .filter((seg) => seg.type === 'text')
    .map((seg) => seg.data.text ?? '')
    .join('')
    .trim()
}
