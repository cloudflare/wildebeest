import { Algorithm, sign } from './http-signing-cavage'
import { str2ab } from './key-ops'

export async function signRequest(request: Request, key: CryptoKey, keyId: string): Promise<void> {
    const mySigner = async (data: string) =>
        new Uint8Array(
            await crypto.subtle.sign(
                {
                    name: 'RSASSA-PKCS1-v1_5',
                    hash: 'SHA-256',
                },
                key,
                str2ab(data as string)
            )
        )
    mySigner.alg = 'hs2019' as Algorithm

    await sign(request, {
        components: ['@request-target'],
        parameters: {
            created: Math.floor(Date.now() / 1000),
        },
        keyId: keyId,
        signer: mySigner,
    })
}
