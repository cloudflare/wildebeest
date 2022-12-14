// see https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-message-signatures-06#section-2.3.1
export type Parameter = 'created' | 'expires' | 'nonce' | 'alg' | 'keyid' | string

export type Component =
    | '@method'
    | '@target-uri'
    | '@authority'
    | '@scheme'
    | '@request-target'
    | '@path'
    | '@query'
    | '@query-params'
    | string

export type ResponseComponent = '@status' | '@request-response' | Component

export type Parameters = { [name: Parameter]: string | number | Date | { [Symbol.toStringTag]: () => string } }

export type Algorithm = 'rsa-v1_5-sha256' | 'ecdsa-p256-sha256' | 'hmac-sha256' | 'rsa-pss-sha512'

export type HeaderExtractionOptions = {
    allowMissing: boolean
}

export interface Signer {
    (data: string): Promise<Buffer>
    alg: Algorithm
}

export type SignOptions = {
    components?: Component[]
    parameters?: Parameters
    allowMissingHeaders?: boolean
    keyId: string
    signer: Signer
}

export const defaultSigningComponents: Component[] = ['@request-target', 'content-type', 'digest', 'content-digest']

const ALG_MAP: { [name: string]: string } = {
    'rsa-v1_5-sha256': 'rsa-sha256',
}

export function extractHeader({ headers }: Request, header: string, opts?: HeaderExtractionOptions): string {
    const lcHeader = header.toLowerCase()
    const key = Object.keys(headers).find((name) => name.toLowerCase() === lcHeader)
    const allowMissing = opts?.allowMissing ?? true
    if (!allowMissing && !key) {
        throw new Error(`Unable to extract header "${header}" from message`)
    }
    let val = key ? headers.getAll(key) ?? '' : ''
    if (Array.isArray(val)) {
        val = val.join(', ')
    }
    return val.toString().replace(/\s+/g, ' ')
}

// see https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-message-signatures-06#section-2.3
export function extractComponent(message: Request, component: string): string {
    switch (component) {
        case '@request-target': {
            const { pathname, search } = new URL(message.url)
            return `${message.method.toLowerCase()} ${pathname}${search}`
        }
        default:
            throw new Error(`Unknown specialty component ${component}`)
    }
}

export function buildSignedData(request: Request, components: Component[], params: Parameters): string {
    const payloadParts: Parameters = {}
    const paramNames = Object.keys(params)
    if (components.includes('@request-target')) {
        Object.assign(payloadParts, {
            '(request-target)': extractComponent(request, '@request-target'),
        })
    }
    if (paramNames.includes('created')) {
        Object.assign(payloadParts, {
            '(created)': params.created,
        })
    }
    if (paramNames.includes('expires')) {
        Object.assign(payloadParts, {
            '(expires)': params.expires,
        })
    }
    components.forEach((name) => {
        if (!name.startsWith('@')) {
            Object.assign(payloadParts, {
                [name.toLowerCase()]: extractHeader(request, name),
            })
        }
    })
    return Object.entries(payloadParts)
        .map(([name, value]) => {
            if (value instanceof Date) {
                return `${name}: ${Math.floor(value.getTime() / 1000)}`
            } else {
                return `${name}: ${value.toString()}`
            }
        })
        .join('\n')
}

export function buildSignatureInputString(componentNames: Component[], parameters: Parameters): string {
    const params: Parameters = Object.entries(parameters).reduce((normalised, [name, value]) => {
        switch (name.toLowerCase()) {
            case 'keyid':
                return Object.assign(normalised, {
                    keyId: value,
                })
            case 'alg':
                return Object.assign(normalised, {
                    algorithm: ALG_MAP[value as string] ?? value,
                })
            default:
                return Object.assign(normalised, {
                    [name]: value,
                })
        }
    }, {})
    const headers = []
    const paramNames = Object.keys(params)
    if (componentNames.includes('@request-target')) {
        headers.push('(request-target)')
    }
    if (paramNames.includes('created')) {
        headers.push('(created)')
    }
    if (paramNames.includes('expires')) {
        headers.push('(expires)')
    }
    componentNames.forEach((name) => {
        if (!name.startsWith('@')) {
            headers.push(name.toLowerCase())
        }
    })
    return `${Object.entries(params)
        .map(([name, value]) => {
            if (typeof value === 'number') {
                return `${name}=${value}`
            } else if (value instanceof Date) {
                return `${name}=${Math.floor(value.getTime() / 1000)}`
            } else {
                return `${name}="${value.toString()}"`
            }
        })
        .join(',')},headers="${headers.join(' ')}"`
}

export async function sign(request: Request, opts: SignOptions): Promise<void> {
    const signingComponents: Component[] = opts.components ?? defaultSigningComponents
    const signingParams: Parameters = {
        ...opts.parameters,
        keyid: opts.keyId,
        alg: opts.signer.alg,
    }
    const signatureInputString = buildSignatureInputString(signingComponents, signingParams)
    const dataToSign = buildSignedData(request, signingComponents, signingParams)
    const signature = await opts.signer(dataToSign)
    request.headers.set('Signature', `${signatureInputString},signature="${signature.toString('base64')}"`)
}
