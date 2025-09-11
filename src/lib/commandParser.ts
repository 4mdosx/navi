import { TodoCommit, CommitType, ActionType } from '@/types/todo'

export interface ParsedCommand {
  type: CommitType
  message: string
  payload: Record<string, unknown>,
  args: string[]
}

/**
 * 解析用户输入的命令字符串，转换为结构化的 commit
 * @param input 用户输入的原始字符串
 * @returns 解析后的命令信息
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmedInput = input.trim()

  // 如果输入为空，返回默认消息类型
  if (!trimmedInput) {
    return {
      type: 'message',
      message: '',
      payload: {},
      args: []
    }
  }

  const parsedCommand: ParsedCommand = {
    type: 'message',
    message: '',
    payload: {},
    args: []
  }
  // 检查是否是命令格式 (以 / 开头)
  if (trimmedInput.startsWith('/')) {
    const [commandName] = trimmedInput.toLowerCase().slice(1).split(' ')
    parsedCommand.type = 'action'
    parsedCommand.payload.action = commandName as ActionType
  }

  const rest = trimmedInput.split(' ').slice(1)
  const args = []
  for (const str of rest) {
    if (str.startsWith('-') || str.startsWith('@')) {
      args.push(str)
    } else {
      // 遇到第一个非参数结束，把剩余的参数作为消息
      parsedCommand.args = args
      parsedCommand.message = rest.join(' ').trim()
      break
    }
  }

  return parsedCommand
}

/**
 * 将解析的命令转换为 TodoCommit 对象
 * @param parsedCommand 解析后的命令
 * @param rawInput 原始输入字符串
 * @returns TodoCommit 对象
 */
export function createCommitFromParsedCommand(
  parsedCommand: ParsedCommand,
  rawInput: string
): Omit<TodoCommit, 'id' | 'timestamp'> {
  return {
    message: parsedCommand.message,
    type: parsedCommand.type,
    author: 'user',
    raw: rawInput,
    payload: parsedCommand.payload
  }
}

/**
 * 一键解析输入并创建 commit 对象
 * @param input 用户输入的原始字符串
 * @returns 完整的 TodoCommit 对象（不包含 id 和 timestamp）
 */
export function parseInputToCommit(input: string): Omit<TodoCommit, 'id' | 'timestamp'> {
  const parsedCommand = parseCommand(input)
  return createCommitFromParsedCommand(parsedCommand, input)
}
