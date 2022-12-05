import { logger } from 'wildebeest/backend/src/middleware/logger'
import { errorHandling } from 'wildebeest/backend/src/middleware/error'

export const onRequest = [logger, errorHandling]
