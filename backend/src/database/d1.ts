import { type Database } from 'wildebeest/backend/src/database'
import type { Env } from 'wildebeest/backend/src/types/env'

export default function make({ DATABASE }: Pick<Env, 'DATABASE'>): Database {
	return DATABASE
}
