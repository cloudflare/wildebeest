import { auth } from 'wildebeest/backend/src/middleware/auth'

export const onRequest = [auth]
