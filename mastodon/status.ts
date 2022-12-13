import type { Handle } from '../utils/parse'
import { parseHandle } from '../utils/parse'

export function getMentions(input: string): Array<Handle> {
    const mentions: Array<Handle> = []

    for (let i = 0, len = input.length; i < len; i++) {
        if (input[i] === '@') {
            let buffer = ''
            for (; ; i++) {
                if (input[i] === ' ') {
                    break
                }
                buffer += input[i]
            }

            mentions.push(parseHandle(buffer))
        }
    }

    return mentions
}
