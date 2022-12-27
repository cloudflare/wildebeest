import { logger } from 'wildebeest/backend/src/middleware/logger'
import { errorHandling } from 'wildebeest/backend/src/middleware/error-handling'

export const onRequest = [logger, errorHandling]
