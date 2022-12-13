import { BinaryLike, SignPrivateKeyInput } from 'crypto'
import { cavage, RequestLike, Algorithm } from 'http-message-signatures'
import { str2ab } from './key-ops'

async function streamToArrayBuffer(stream: ReadableStream) {
    let result = new Uint8Array(0)
    const reader = stream.getReader()
    while (true) {
        const { done, value } = await reader.read()
        if (done) {
            break
        }

        const newResult = new Uint8Array(result.length + value.length)
        newResult.set(result)
        newResult.set(value, result.length)
        result = newResult
    }
    return result
}

export async function signRequest(request: RequestLike, key: CryptoKey, keyId: string): Promise<RequestLike> {
    const mySigner = async (data: BinaryLike) =>
        Buffer.from(
            await crypto.subtle.sign(
                {
                    name: 'RSASSA-PKCS1-v1_5',
                    hash: 'SHA-256',
                },
                key,
                typeof data == 'string' ? str2ab(data as string) : (data as ArrayBuffer)
            )
        )
    mySigner.alg = 'rsa-v1_5-sha256' as Algorithm

    return await cavage.sign(request, {
        components: ['@method', '@authority', 'content-type'],
        parameters: {
            created: Math.floor(Date.now() / 1000),
        },
        keyId: keyId,
        signer: mySigner,
        format: 'cavage',
    })
}

export async function createSignedRequest(request: Request, userKey: CryptoKey, keyId: string): Promise<Request> {
    let headers: Record<
        string,
        | {
              toString(): string
          }
        | string
        | string[]
        | undefined
    > = {}
    request.headers.forEach((value, key) => {
        headers[key] = value
    })

    const toSign: RequestLike = {
        method: request.method,
        url: request.url,
        headers: headers,
    }

    if (request.body != null) {
        const body = await streamToArrayBuffer(request.body as ReadableStream)
        toSign.body = Buffer.from(body)
    }

    const signed = await signRequest(toSign, userKey, keyId)
    request.headers.append('Signature', signed.headers['Signature'] as string)

    return new Request(request.url, {
        method: request.method,
        body: toSign.body,
        headers: request.headers,
    })
}
