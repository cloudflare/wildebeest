import { createContext } from '@builder.io/qwik'
import { MastodonInstance } from 'wildebeest/backend/src/types/configs'

/**
 * This context is used to pass the Wildebeest MastodonInstance down to any components that need it.
 */
export const InstanceConfigContext = createContext<MastodonInstance>('MastodonInstance')
