# Model 层

Model 层负责数据访问，使用 Kysely ORM。

## 职责

- 业务实体定义
- 封装业务规则
- 负责数据库操作
- 不写业务规则（业务规则在 Service 层）

## 示例

```typescript
// user.model.ts
import { getDatabase } from '../db/database'
import type { Database } from '../db/types'

export async function getUserById(id: string) {
  const db = getDatabase()
  return db
    .selectFrom('users')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
}
```
