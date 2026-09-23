# Model 层

Model 层负责数据访问，使用 Drizzle 和 Node 自带的 `node:sqlite`。

## 职责

- 业务实体定义
- 封装业务规则
- 负责数据库操作
- 不写业务规则（业务规则在 Service 层）

## 示例

```typescript
import { eq } from 'drizzle-orm'
import { getDatabase } from '../db/database'
import { todos } from '../db/schema'

export async function getTodoById(id: string) {
  const db = await getDatabase()
  const [row] = await db.select().from(todos).where(eq(todos.id, id)).limit(1)
  return row
}
```
