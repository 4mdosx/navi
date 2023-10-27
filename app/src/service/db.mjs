import { JSONPreset } from 'lowdb/node'

const db = await JSONPreset('db-data.json.json', {})

export default db