import { Algorithm, sign } from './http-signing-cavage'
import { str2ab } from './key-ops'

export async function signRequest(request: Request, key: CryptoKey, keyId: string): Promise<void> {
    const mySigner = async (data: string) =>
        Buffer.from(
            await crypto.subtle.sign(
                {
                    name: 'RSASSA-PKCS1-v1_5',
                    hash: 'SHA-256',
                },
                key,
                str2ab(data as string)
            )
        )
    mySigner.alg = 'rsa-v1_5-sha256' as Algorithm

    await sign(request, {
        components: ['(request-target)', 'host', 'date'],
        keyId: keyId,
        signer: mySigner,
    })
}
