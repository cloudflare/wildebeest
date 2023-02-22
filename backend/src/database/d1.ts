import { type Database } from 'wildebeest/backend/src/database'
import type { Env } from 'wildebeest/backend/src/types/env'

export default function make(env: Env): Database {
	return env.DATABASE
}
